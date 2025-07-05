import { Router, Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';
import { bedrockService } from '@/services/bedrockService';

const router = Router();

/**
 * Basic health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    res.json(health);
  } catch (error) {
    logger.error('❌ Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service temporarily unavailable',
      responseTime: Date.now() - startTime,
    });
  }
});

/**
 * Detailed health check with dependencies
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    const dbHealthPromise = prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
    
    // Check Bedrock service
    const bedrockHealthPromise = bedrockService.healthCheck();
    
    // Execute checks in parallel
    const [dbHealthy, bedrockHealth] = await Promise.all([
      dbHealthPromise,
      bedrockHealthPromise,
    ]);

    const overallStatus = dbHealthy && bedrockHealth.status === 'healthy' ? 'healthy' : 'unhealthy';
    
    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          connection: dbHealthy,
        },
        bedrock: {
          status: bedrockHealth.status,
          details: bedrockHealth.details,
        },
      },
      system: {
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
        },
        cpu: {
          usage: process.cpuUsage(),
        },
      },
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
    
  } catch (error) {
    logger.error('❌ Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service temporarily unavailable',
      responseTime: Date.now() - startTime,
    });
  }
});

/**
 * Readiness probe (for Kubernetes)
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if essential services are ready
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('❌ Readiness check failed:', error);
    res.status(503).json({
      status: 'not-ready',
      timestamp: new Date().toISOString(),
      error: 'Service not ready',
    });
  }
});

/**
 * Liveness probe (for Kubernetes)
 */
router.get('/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;