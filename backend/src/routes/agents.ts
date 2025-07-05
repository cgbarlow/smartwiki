import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { authMiddleware } from '@/middleware/auth';
import { validationMiddleware } from '@/middleware/validation';

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

export default router;