import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { authMiddleware } from '@/middleware/auth';
import { validationMiddleware } from '@/middleware/validation';
import { ComplianceAgent } from '@/agents/compliance/ComplianceAgent';
import { AgentRegistry } from '@/agents/core/AgentRegistry';
import { StandardsLibrary } from '@/agents/compliance/standards/StandardsLibrary';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * Create a new agent
 */
router.post('/', [
  body('name').isString().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('type').isIn(['GENERAL', 'RESEARCH', 'CUSTOMER_SERVICE', 'TECHNICAL', 'CREATIVE']),
  body('configuration').optional().isObject(),
  body('knowledgeBaseIds').optional().isArray(),
  body('isActive').optional().isBoolean(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, description, type, configuration = {}, knowledgeBaseIds = [], isActive = true } = req.body;

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        name,
        description,
        type,
        configuration,
        knowledgeBaseIds,
        isActive,
        createdById: req.user.userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(`🤖 Agent created: ${agent.id} by user ${req.user.userId}`);

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: { agent },
    });

  } catch (error) {
    logger.error('❌ Agent creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Agent creation failed',
      error: 'Internal server error',
    });
  }
});

/**
 * Get all agents with pagination and filtering
 */
router.get('/', [
  validationMiddleware.pagination,
  query('type').optional().isIn(['GENERAL', 'RESEARCH', 'CUSTOMER_SERVICE', 'TECHNICAL', 'CREATIVE']),
  query('isActive').optional().isBoolean(),
  query('search').optional().isString(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { page, limit, offset } = req.pagination!;
    const { type, isActive, search } = req.query;

    // Build where clause
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Get agents with pagination
    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              queries: true,
              conversations: true,
            },
          },
        },
      }),
      prisma.agent.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        agents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error) {
    logger.error('❌ Failed to get agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agents',
      error: 'Internal server error',
    });
  }
});

/**
 * Get a specific agent by ID
 */
router.get('/:id', [
  param('id').isString().isLength({ min: 1 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            queries: true,
            conversations: true,
          },
        },
      },
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    res.json({
      success: true,
      data: { agent },
    });

  } catch (error) {
    logger.error('❌ Failed to get agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agent',
      error: 'Internal server error',
    });
  }
});

/**
 * Update an agent
 */
router.put('/:id', [
  param('id').isString().isLength({ min: 1 }),
  body('name').optional().isString().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('type').optional().isIn(['GENERAL', 'RESEARCH', 'CUSTOMER_SERVICE', 'TECHNICAL', 'CREATIVE']),
  body('configuration').optional().isObject(),
  body('knowledgeBaseIds').optional().isArray(),
  body('isActive').optional().isBoolean(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { name, description, type, configuration, knowledgeBaseIds, isActive } = req.body;

    // Check if agent exists
    const existingAgent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!existingAgent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    // Check if user has permission to update (for now, only the creator can update)
    if (existingAgent.createdById !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own agents',
      });
    }

    // Update agent
    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(configuration && { configuration }),
        ...(knowledgeBaseIds && { knowledgeBaseIds }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(`🤖 Agent updated: ${agent.id} by user ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Agent updated successfully',
      data: { agent },
    });

  } catch (error) {
    logger.error('❌ Failed to update agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update agent',
      error: 'Internal server error',
    });
  }
});

/**
 * Delete an agent
 */
router.delete('/:id', [
  param('id').isString().isLength({ min: 1 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    // Check if agent exists and user has permission
    const existingAgent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!existingAgent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    if (existingAgent.createdById !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own agents',
      });
    }

    // Delete agent and related data
    await prisma.$transaction(async (tx) => {
      // Delete conversations
      await tx.conversation.deleteMany({
        where: { agentId: id },
      });

      // Delete queries
      await tx.query.deleteMany({
        where: { agentId: id },
      });

      // Delete agent
      await tx.agent.delete({
        where: { id },
      });
    });

    logger.info(`🗑️ Agent deleted: ${id} by user ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Agent deleted successfully',
    });

  } catch (error) {
    logger.error('❌ Failed to delete agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete agent',
      error: 'Internal server error',
    });
  }
});

/**
 * Get agent performance statistics
 */
router.get('/:id/stats', [
  param('id').isString().isLength({ min: 1 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    // Check if agent exists
    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    // Get performance statistics
    const [
      totalQueries,
      avgResponseTime,
      totalConversations,
      recentQueries,
    ] = await Promise.all([
      prisma.query.count({ where: { agentId: id } }),
      prisma.query.aggregate({
        where: { agentId: id },
        _avg: { responseTime: true },
      }),
      prisma.conversation.count({ where: { agentId: id } }),
      prisma.query.count({
        where: {
          agentId: id,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    const stats = {
      totalQueries,
      averageResponseTime: avgResponseTime._avg.responseTime || 0,
      totalConversations,
      recentQueries,
    };

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('❌ Failed to get agent statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agent statistics',
      error: 'Internal server error',
    });
  }
});

/**
 * Test an agent with a sample query
 */
router.post('/:id/test', [
  param('id').isString().isLength({ min: 1 }),
  body('query').isString().isLength({ min: 1, max: 1000 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { query } = req.body;

    // Get agent configuration
    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    if (!agent.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Agent is not active',
      });
    }

    // This is a simplified test - in a real implementation, you would
    // use the agent's specific configuration and knowledge bases
    const testResponse = {
      query,
      response: `Test response from agent "${agent.name}". This is a sample response for testing purposes.`,
      agentConfig: agent.configuration,
      timestamp: new Date().toISOString(),
    };

    logger.info(`🧪 Agent test executed: ${agent.id} by user ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Agent test completed',
      data: testResponse,
    });

  } catch (error) {
    logger.error('❌ Agent test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Agent test failed',
      error: 'Internal server error',
    });
  }
});

/**
 * Create a compliance agent
 */
router.post('/compliance', [
  body('name').isString().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('modelProvider').optional().isIn(['mistral', 'openai', 'anthropic']),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, description, modelProvider = 'mistral' } = req.body;

    // Create compliance agent
    const agentId = `compliance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const complianceAgent = new ComplianceAgent(agentId, name, modelProvider);

    // Validate configuration
    const validation = await complianceAgent.validateConfiguration();
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Agent configuration validation failed',
        errors: validation.issues,
      });
    }

    // Create agent in database
    const agent = await prisma.agent.create({
      data: {
        id: agentId,
        name,
        description,
        type: 'COMPLIANCE',
        status: 'ACTIVE',
        configuration: {
          modelProvider,
          capabilities: {
            documentAnalysis: true,
            standardsComparison: true,
            gapIdentification: true,
            reportGeneration: true,
            riskAssessment: true,
          },
        },
        isActive: true,
        createdById: req.user.userId,
        tenantId: req.user.tenantId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Register agent in registry
    await AgentRegistry.saveAgentToDatabase(agentId, req.user.tenantId, req.user.userId);

    logger.info(`🤖 Compliance agent created: ${agent.id} by user ${req.user.userId}`);

    res.status(201).json({
      success: true,
      message: 'Compliance agent created successfully',
      data: { 
        agent,
        status: complianceAgent.getStatus(),
      },
    });

  } catch (error) {
    logger.error('❌ Compliance agent creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Compliance agent creation failed',
      error: 'Internal server error',
    });
  }
});

/**
 * Analyze document compliance
 */
router.post('/:id/analyze', [
  param('id').isString().isLength({ min: 1 }),
  body('documentId').isString().isLength({ min: 1 }),
  body('standardIds').isArray().isLength({ min: 1 }),
  body('options').optional().isObject(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { documentId, standardIds, options = {} } = req.body;

    // Get agent from database
    const dbAgent = await prisma.agent.findUnique({
      where: { id, type: 'COMPLIANCE' },
    });

    if (!dbAgent || !dbAgent.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Compliance agent not found or inactive',
      });
    }

    // Get document
    const document = await prisma.file.findUnique({
      where: { 
        id: documentId,
        tenantId: req.user.tenantId,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Create compliance agent instance
    const complianceAgent = new ComplianceAgent(
      id, 
      dbAgent.name, 
      (dbAgent.configuration as any)?.modelProvider || 'mistral'
    );

    // Get document content (you might need to implement this based on your file storage)
    const documentContent = await getDocumentContent(document);

    // Perform analysis
    const analysisResult = await complianceAgent.analyzeCompliance(
      {
        id: document.id,
        title: document.originalName,
        content: documentContent,
      },
      standardIds,
      req.user.userId,
      options
    );

    logger.info(`🔍 Compliance analysis completed: ${analysisResult.id}`);

    res.json({
      success: true,
      message: 'Compliance analysis completed',
      data: { 
        analysis: analysisResult,
        agentStatus: complianceAgent.getStatus(),
      },
    });

  } catch (error) {
    logger.error('❌ Compliance analysis failed:', error);
    res.status(500).json({
      success: false,
      message: 'Compliance analysis failed',
      error: 'Internal server error',
    });
  }
});

/**
 * Generate compliance report
 */
router.post('/:id/report', [
  param('id').isString().isLength({ min: 1 }),
  body('analysisId').isString().isLength({ min: 1 }),
  body('format').optional().isIn(['pdf', 'docx', 'html', 'json']),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { analysisId, format = 'pdf' } = req.body;

    // Get agent from database
    const dbAgent = await prisma.agent.findUnique({
      where: { id, type: 'COMPLIANCE' },
    });

    if (!dbAgent || !dbAgent.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Compliance agent not found or inactive',
      });
    }

    // Create compliance agent instance
    const complianceAgent = new ComplianceAgent(
      id, 
      dbAgent.name, 
      (dbAgent.configuration as any)?.modelProvider || 'mistral'
    );

    // Generate report
    const report = await complianceAgent.generateReport(analysisId, format);

    logger.info(`📊 Compliance report generated: ${report.id}`);

    res.json({
      success: true,
      message: 'Compliance report generated successfully',
      data: { report },
    });

  } catch (error) {
    logger.error('❌ Compliance report generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Compliance report generation failed',
      error: 'Internal server error',
    });
  }
});

/**
 * Get compliance standards
 */
router.get('/compliance/standards', [
  query('category').optional().isString(),
  query('search').optional().isString(),
], async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;
    const standardsLibrary = new StandardsLibrary();

    let standards;
    if (search) {
      standards = await standardsLibrary.searchStandards(search as string);
    } else if (category) {
      standards = await standardsLibrary.getStandardsByCategory(category as string);
    } else {
      standards = await standardsLibrary.getAllStandards();
    }

    res.json({
      success: true,
      data: { standards },
    });

  } catch (error) {
    logger.error('❌ Failed to get compliance standards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get compliance standards',
      error: 'Internal server error',
    });
  }
});

/**
 * Get compliance analysis history
 */
router.get('/:id/analyses', [
  param('id').isString().isLength({ min: 1 }),
  validationMiddleware.pagination,
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page, limit, offset } = req.pagination!;

    // Get analyses for this agent
    const [analyses, total] = await Promise.all([
      prisma.complianceAnalysis.findMany({
        where: { 
          agentId: id,
          userId: req.user.userId,
        },
        skip: offset,
        take: limit,
        orderBy: { analysisDate: 'desc' },
        include: {
          gaps: true,
          recommendations: true,
          reports: true,
        },
      }),
      prisma.complianceAnalysis.count({
        where: { 
          agentId: id,
          userId: req.user.userId,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        analyses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error) {
    logger.error('❌ Failed to get compliance analyses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get compliance analyses',
      error: 'Internal server error',
    });
  }
});

/**
 * Helper function to get document content
 * This would need to be implemented based on your file storage system
 */
async function getDocumentContent(file: any): Promise<string> {
  // This is a placeholder - implement based on your S3/file storage setup
  // You might need to download from S3, extract text from PDF, etc.
  return `Sample document content for ${file.originalName}`;
}

export default router;