import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { bedrockService } from '@/services/bedrockService';
import { logger } from '@/utils/logger';
import { authMiddleware } from '@/middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * Query the knowledge base with RAG
 */
router.post('/query', [
  body('query').isString().isLength({ min: 1, max: 4000 }),
  body('sessionId').optional().isString(),
  body('knowledgeBaseId').optional().isString(),
  body('maxResults').optional().isInt({ min: 1, max: 100 }),
  body('modelId').optional().isString(),
  body('filters').optional().isObject(),
], async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { query, sessionId, knowledgeBaseId, maxResults, modelId, filters } = req.body;

    // Execute query
    const result = await bedrockService.query({
      query,
      sessionId,
      knowledgeBaseId,
      maxResults,
      modelId,
      filters,
    });

    logger.info(`🔍 Knowledge base query executed by user ${req.user.userId}`);

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    logger.error('❌ Knowledge base query failed:', error);
    res.status(500).json({
      success: false,
      message: 'Query failed',
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * Retrieve documents without generation
 */
router.post('/retrieve', [
  body('query').isString().isLength({ min: 1, max: 4000 }),
  body('knowledgeBaseId').optional().isString(),
  body('config').optional().isObject(),
  body('config.searchType').optional().isIn(['HYBRID', 'SEMANTIC', 'KEYWORD']),
  body('config.numberOfResults').optional().isInt({ min: 1, max: 100 }),
  body('config.includeMetadata').optional().isBoolean(),
  body('config.scoreThreshold').optional().isFloat({ min: 0, max: 1 }),
], async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { query, knowledgeBaseId, config = {} } = req.body;

    // Execute retrieval
    const result = await bedrockService.retrieve(query, config, knowledgeBaseId);

    logger.info(`📄 Document retrieval executed by user ${req.user.userId}`);

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    logger.error('❌ Document retrieval failed:', error);
    res.status(500).json({
      success: false,
      message: 'Retrieval failed',
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * Direct model invocation without knowledge base
 */
router.post('/invoke', [
  body('prompt').isString().isLength({ min: 1, max: 10000 }),
  body('modelId').optional().isString(),
  body('parameters').optional().isObject(),
  body('parameters.maxTokens').optional().isInt({ min: 1, max: 8000 }),
  body('parameters.temperature').optional().isFloat({ min: 0, max: 1 }),
], async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { prompt, modelId, parameters = {} } = req.body;

    // Execute model invocation
    const result = await bedrockService.invokeModel(prompt, modelId, parameters);

    logger.info(`🤖 Model invocation executed by user ${req.user.userId}`);

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    logger.error('❌ Model invocation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Model invocation failed',
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * Get available models
 */
router.get('/models', async (req: Request, res: Response) => {
  try {
    // This is a static list for now, but could be dynamically fetched
    const models = [
      {
        id: 'anthropic.claude-3-sonnet-20240229-v1:0',
        name: 'Claude 3 Sonnet',
        provider: 'Anthropic',
        description: 'Balanced performance for a wide range of tasks',
        maxTokens: 4096,
        supportsStreaming: true,
      },
      {
        id: 'anthropic.claude-3-haiku-20240307-v1:0',
        name: 'Claude 3 Haiku',
        provider: 'Anthropic',
        description: 'Fastest model for simple tasks',
        maxTokens: 4096,
        supportsStreaming: true,
      },
      {
        id: 'anthropic.claude-3-opus-20240229-v1:0',
        name: 'Claude 3 Opus',
        provider: 'Anthropic',
        description: 'Most capable model for complex tasks',
        maxTokens: 4096,
        supportsStreaming: true,
      },
      {
        id: 'amazon.titan-text-express-v1',
        name: 'Titan Text Express',
        provider: 'Amazon',
        description: 'Fast and cost-effective for simple tasks',
        maxTokens: 8192,
        supportsStreaming: false,
      },
      {
        id: 'amazon.titan-text-lite-v1',
        name: 'Titan Text Lite',
        provider: 'Amazon',
        description: 'Lightweight model for basic tasks',
        maxTokens: 4096,
        supportsStreaming: false,
      },
    ];

    res.json({
      success: true,
      data: { models },
    });

  } catch (error) {
    logger.error('❌ Failed to get models:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get models',
      error: 'Internal server error',
    });
  }
});

/**
 * Health check for knowledge base service
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await bedrockService.healthCheck();
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json({
      success: true,
      data: health,
    });

  } catch (error) {
    logger.error('❌ Knowledge base health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: 'Service unavailable',
    });
  }
});

/**
 * Get query history for the user
 */
router.get('/history', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
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

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // This would typically come from a database table storing query history
    // For now, returning a placeholder response
    const history = {
      queries: [],
      total: 0,
      limit,
      offset,
    };

    res.json({
      success: true,
      data: history,
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
 * Get usage statistics for the user
 */
router.get('/usage', async (req: Request, res: Response) => {
  try {
    // This would typically come from a database table storing usage metrics
    // For now, returning a placeholder response
    const usage = {
      totalQueries: 0,
      totalTokens: 0,
      queriesThisMonth: 0,
      tokensThisMonth: 0,
      averageResponseTime: 0,
      lastQueryAt: null,
    };

    res.json({
      success: true,
      data: usage,
    });

  } catch (error) {
    logger.error('❌ Failed to get usage statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get usage statistics',
      error: 'Internal server error',
    });
  }
});

export default router;