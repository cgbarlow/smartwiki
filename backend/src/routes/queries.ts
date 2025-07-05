import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { prisma } from '@/config/database';
import { bedrockService } from '@/services/bedrockService';
import { logger } from '@/utils/logger';
import { authMiddleware } from '@/middleware/auth';
import { validationMiddleware } from '@/middleware/validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * Execute a knowledge base query
 */
router.post('/', [
  body('query').isString().isLength({ min: 1, max: 4000 }),
  body('agentId').optional().isString(),
  body('sessionId').optional().isString(),
  body('knowledgeBaseId').optional().isString(),
  body('modelId').optional().isString(),
  body('parameters').optional().isObject(),
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

    const { query, agentId, sessionId, knowledgeBaseId, modelId, parameters = {} } = req.body;

    // Execute query using Bedrock service
    const result = await bedrockService.query({
      query,
      sessionId,
      knowledgeBaseId,
      modelId,
      ...parameters,
    });

    // Store query in database for history and analytics
    const queryRecord = await prisma.query.create({
      data: {
        query,
        response: result.answer,
        sessionId: result.sessionId,
        modelUsed: result.metadata.modelUsed,
        responseTime: result.metadata.responseTime,
        tokenUsage: result.metadata.tokenUsage,
        retrievalCount: result.metadata.retrievalCount,
        citations: result.citations,
        userId: req.user.userId,
        agentId,
        metadata: {
          knowledgeBaseId,
          parameters,
        },
      },
    });

    logger.info(`🔍 Query executed: ${queryRecord.id} by user ${req.user.userId}`);

    res.json({
      success: true,
      data: {
        queryId: queryRecord.id,
        ...result,
      },
    });

  } catch (error) {
    logger.error('❌ Query execution failed:', error);
    res.status(500).json({
      success: false,
      message: 'Query execution failed',
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * Get query history for the user
 */
router.get('/history', [
  validationMiddleware.pagination,
  query('agentId').optional().isString(),
  query('sessionId').optional().isString(),
  query('modelUsed').optional().isString(),
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
    const { agentId, sessionId, modelUsed } = req.query;

    // Build where clause
    const where: any = { userId: req.user.userId };

    if (agentId) {
      where.agentId = agentId;
    }

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (modelUsed) {
      where.modelUsed = modelUsed;
    }

    // Get queries with pagination
    const [queries, total] = await Promise.all([
      prisma.query.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      }),
      prisma.query.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        queries,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error) {
    logger.error('❌ Failed to get query history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get query history',
      error: 'Internal server error',
    });
  }
});

/**
 * Get a specific query by ID
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

    const query = await prisma.query.findFirst({
      where: {
        id,
        userId: req.user.userId, // Ensure user can only access their own queries
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found',
      });
    }

    res.json({
      success: true,
      data: { query },
    });

  } catch (error) {
    logger.error('❌ Failed to get query:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get query',
      error: 'Internal server error',
    });
  }
});

/**
 * Get query analytics and statistics
 */
router.get('/analytics/overview', async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId;

    const [
      totalQueries,
      avgResponseTime,
      modelUsageStats,
      recentQueries,
      tokenUsageStats,
    ] = await Promise.all([
      prisma.query.count({ where: { userId } }),
      prisma.query.aggregate({
        where: { userId },
        _avg: { responseTime: true },
      }),
      prisma.query.groupBy({
        where: { userId },
        by: ['modelUsed'],
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } },
      }),
      prisma.query.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
      prisma.query.aggregate({
        where: { userId },
        _sum: {
          tokenUsage: true,
        },
      }),
    ]);

    const analytics = {
      totalQueries,
      averageResponseTime: avgResponseTime._avg.responseTime || 0,
      modelUsage: modelUsageStats.map(stat => ({
        model: stat.modelUsed,
        count: stat._count._all,
      })),
      recentQueries,
      totalTokenUsage: tokenUsageStats._sum.tokenUsage || 0,
    };

    res.json({
      success: true,
      data: analytics,
    });

  } catch (error) {
    logger.error('❌ Failed to get query analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get query analytics',
      error: 'Internal server error',
    });
  }
});

/**
 * Get popular queries (anonymized)
 */
router.get('/analytics/popular', [
  validationMiddleware.pagination,
], async (req: Request, res: Response) => {
  try {
    const { limit } = req.pagination!;

    // Get most common query patterns (simplified version)
    const popularQueries = await prisma.query.groupBy({
      by: ['query'],
      _count: { _all: true },
      orderBy: { _count: { _all: 'desc' } },
      take: limit,
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    const data = popularQueries.map(item => ({
      queryPattern: item.query.substring(0, 100) + '...', // Truncate for privacy
      count: item._count._all,
    }));

    res.json({
      success: true,
      data: { popularQueries: data },
    });

  } catch (error) {
    logger.error('❌ Failed to get popular queries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular queries',
      error: 'Internal server error',
    });
  }
});

/**
 * Export query history
 */
router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId;

    const queries = await prisma.query.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        query: true,
        response: true,
        modelUsed: true,
        responseTime: true,
        retrievalCount: true,
        createdAt: true,
      },
    });

    // Generate CSV content
    const headers = ['ID', 'Query', 'Response', 'Model', 'Response Time (ms)', 'Citations', 'Created At'];
    const csvRows = [headers.join(',')];

    for (const query of queries) {
      const row = [
        query.id,
        `"${query.query.replace(/"/g, '""')}"`, // Escape quotes
        `"${query.response.substring(0, 100).replace(/"/g, '""')}..."`,
        query.modelUsed,
        query.responseTime.toString(),
        query.retrievalCount.toString(),
        query.createdAt.toISOString(),
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="query-history.csv"');
    res.send(csvContent);

    logger.info(`📊 Query history exported by user ${req.user.userId}`);

  } catch (error) {
    logger.error('❌ Failed to export query history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export query history',
      error: 'Internal server error',
    });
  }
});

export default router;