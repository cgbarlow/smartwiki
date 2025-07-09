import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { createServer } from 'http';
import { config } from '@/config/config';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { authMiddleware } from '@/middleware/auth';
import { tenantMiddleware } from '@/middleware/tenant';
import { validationMiddleware } from '@/middleware/validation';
import { prisma } from '@/config/database';
import { setupSwagger } from '@/config/swagger';
import { metricsMiddleware } from '@/middleware/metrics';
import { AgentService } from '@/services/agentService';

// Import routes
import authRoutes from '@/routes/auth';
import oauthRoutes from '@/routes/oauth';
import documentRoutes from '@/routes/documents';
import agentRoutes from '@/routes/agents';
import knowledgeBaseRoutes from '@/routes/knowledgeBase';
import queryRoutes from '@/routes/queries';
import tenantRoutes from '@/routes/tenants';
import fileRoutes from '@/routes/files';
import healthRoutes from '@/routes/health';

class SmartWikiServer {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Tenant-ID',
        'X-API-Key',
        'X-Request-ID',
      ],
      credentials: true,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api', limiter);

    // Compression
    this.app.use(compression());

    // Request parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Logging
    this.app.use(morgan(config.log.format, {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    }));

    // Custom middleware
    this.app.use(metricsMiddleware);
    this.app.use(tenantMiddleware);
  }

  private setupRoutes(): void {
    // Health check (no auth required)
    this.app.use('/health', healthRoutes);

    // API documentation
    if (config.swagger.enabled) {
      setupSwagger(this.app);
    }

    // API routes with authentication
    const apiRouter = express.Router();
    
    // Authentication routes (public)
    apiRouter.use('/auth', authRoutes);
    apiRouter.use('/oauth', oauthRoutes);
    
    // Protected routes
    apiRouter.use(authMiddleware);
    apiRouter.use('/tenants', tenantRoutes);
    apiRouter.use('/documents', documentRoutes);
    apiRouter.use('/agents', agentRoutes);
    apiRouter.use('/knowledge-bases', knowledgeBaseRoutes);
    apiRouter.use('/queries', queryRoutes);
    apiRouter.use('/files', fileRoutes);

    this.app.use(`/api/${config.api.version}`, apiRouter);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'SmartWiki Backend API',
        version: config.api.version,
        status: 'running',
        timestamp: new Date().toISOString(),
        documentation: config.swagger.enabled ? '/api-docs' : 'Not available',
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Test database connection
      await prisma.$connect();
      logger.info('✅ Database connected successfully');

      // Initialize agent system
      const agentService = AgentService.getInstance();
      await agentService.initialize();
      logger.info('🤖 Agent system initialized successfully');

      // Start server
      this.server = createServer(this.app);
      
      this.server.listen(config.port, () => {
        logger.info(`🚀 SmartWiki Backend started on port ${config.port}`);
        logger.info(`📖 API Documentation: http://localhost:${config.port}/api-docs`);
        logger.info(`🏥 Health Check: http://localhost:${config.port}/health`);
        logger.info(`🌍 Environment: ${config.env}`);
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`📴 Received ${signal}. Starting graceful shutdown...`);
      
      if (this.server) {
        this.server.close(async () => {
          logger.info('🔌 HTTP server closed');
          
          try {
            await prisma.$disconnect();
            logger.info('🔌 Database connection closed');
            
            logger.info('✅ Graceful shutdown completed');
            process.exit(0);
          } catch (error) {
            logger.error('❌ Error during shutdown:', error);
            process.exit(1);
          }
        });
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new SmartWikiServer();
  server.start().catch((error) => {
    logger.error('❌ Server startup failed:', error);
    process.exit(1);
  });
}

export { SmartWikiServer };
export default SmartWikiServer;