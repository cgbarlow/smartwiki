import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

// Performance metrics tracking
interface RequestMetrics {
  timestamp: number;
  method: string;
  path: string;
  userAgent?: string;
  ip: string;
  userId?: string;
  tenantId?: string;
  responseTime?: number;
  statusCode?: number;
  contentLength?: number;
}

// In-memory metrics store (in production, use Redis or a proper metrics system)
const metricsStore: RequestMetrics[] = [];
const MAX_METRICS_ENTRIES = 10000;

/**
 * Metrics collection middleware
 */
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  
  // Capture request start metrics
  const requestMetrics: RequestMetrics = {
    timestamp: startTime,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userId: req.user?.userId,
    tenantId: req.tenant?.id,
  };

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const endTime = Date.now();
    
    // Complete metrics
    requestMetrics.responseTime = endTime - startTime;
    requestMetrics.statusCode = res.statusCode;
    requestMetrics.contentLength = parseInt(res.get('Content-Length') || '0');

    // Store metrics (with rotation)
    metricsStore.push(requestMetrics);
    if (metricsStore.length > MAX_METRICS_ENTRIES) {
      metricsStore.shift(); // Remove oldest entry
    }

    // Log performance metrics
    logger.info('📊 Request metrics', {
      method: requestMetrics.method,
      path: requestMetrics.path,
      statusCode: requestMetrics.statusCode,
      responseTime: requestMetrics.responseTime,
      userId: requestMetrics.userId,
      tenantId: requestMetrics.tenantId,
    });

    // Call original end
    originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

/**
 * Get aggregated metrics
 */
export const getMetrics = () => {
  const now = Date.now();
  const last24Hours = now - (24 * 60 * 60 * 1000);
  const lastHour = now - (60 * 60 * 1000);
  
  const recentMetrics = metricsStore.filter(m => m.timestamp > last24Hours);
  const hourlyMetrics = metricsStore.filter(m => m.timestamp > lastHour);

  const calculateStats = (metrics: RequestMetrics[]) => {
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        statusCodes: {},
        paths: {},
      };
    }

    const responseTimes = metrics.map(m => m.responseTime).filter(rt => rt !== undefined) as number[];
    const statusCodes = metrics.reduce((acc, m) => {
      if (m.statusCode) {
        acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    const paths = metrics.reduce((acc, m) => {
      acc[m.path] = (acc[m.path] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorCount = metrics.filter(m => m.statusCode && m.statusCode >= 400).length;

    return {
      totalRequests: metrics.length,
      averageResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0,
      errorRate: metrics.length > 0 ? (errorCount / metrics.length) * 100 : 0,
      statusCodes,
      paths,
    };
  };

  return {
    last24Hours: calculateStats(recentMetrics),
    lastHour: calculateStats(hourlyMetrics),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
  };
};

/**
 * Health metrics for monitoring
 */
export const getHealthMetrics = () => {
  const metrics = getMetrics();
  
  return {
    healthy: metrics.last24Hours.errorRate < 5, // Less than 5% error rate
    metrics: {
      errorRate: metrics.last24Hours.errorRate,
      averageResponseTime: metrics.last24Hours.averageResponseTime,
      requestsPerHour: metrics.lastHour.totalRequests,
      uptime: metrics.uptime,
    },
  };
};

/**
 * Performance warning middleware
 */
export const performanceWarningMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  
  // Override res.end to check response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const responseTime = Date.now() - startTime;
    
    // Log slow requests
    if (responseTime > 5000) { // 5 seconds
      logger.warn('🐌 Slow request detected', {
        method: req.method,
        path: req.path,
        responseTime,
        userId: req.user?.userId,
        tenantId: req.tenant?.id,
      });
    }

    // Call original end
    originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};