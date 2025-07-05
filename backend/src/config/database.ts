import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { config } from './config';

// Prisma Client configuration
const prismaConfig = {
  datasources: {
    db: {
      url: config.database.url,
    },
  },
  log: config.isDevelopment 
    ? ['query', 'info', 'warn', 'error'] as const
    : ['warn', 'error'] as const,
};

// Create Prisma Client instance
export const prisma = new PrismaClient(prismaConfig);

// Database connection utilities
export class DatabaseManager {
  private static instance: DatabaseManager;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async connect(): Promise<void> {
    try {
      await prisma.$connect();
      this.isConnected = true;
      logger.info('🗄️ Database connected successfully');
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await prisma.$disconnect();
      this.isConnected = false;
      logger.info('🔌 Database disconnected');
    } catch (error) {
      logger.error('❌ Database disconnection failed:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('❌ Database health check failed:', error);
      return false;
    }
  }

  public isConnectionActive(): boolean {
    return this.isConnected;
  }

  public async testConnection(): Promise<{ success: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;
      
      return {
        success: true,
        latency,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async getStats(): Promise<{
    activeConnections: number;
    totalConnections: number;
    uptime: number;
  }> {
    try {
      const result = await prisma.$queryRaw<Array<{
        numbackends: number;
        xact_commit: number;
        uptime: number;
      }>>`
        SELECT 
          numbackends,
          xact_commit,
          EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time())) as uptime
        FROM pg_stat_database 
        WHERE datname = current_database()
      `;

      if (result && result.length > 0) {
        const stats = result[0];
        return {
          activeConnections: stats.numbackends,
          totalConnections: stats.xact_commit,
          uptime: stats.uptime,
        };
      }

      return {
        activeConnections: 0,
        totalConnections: 0,
        uptime: 0,
      };
    } catch (error) {
      logger.error('❌ Failed to get database stats:', error);
      return {
        activeConnections: 0,
        totalConnections: 0,
        uptime: 0,
      };
    }
  }
}

// Multi-tenant database utilities
export class TenantDatabaseManager {
  /**
   * Get tenant-specific Prisma client with row-level security
   */
  public static getTenantClient(tenantId: string): PrismaClient {
    // In a real implementation, you might:
    // 1. Use row-level security (RLS) with SET LOCAL
    // 2. Use separate database schemas per tenant
    // 3. Use tenant-specific connection strings
    
    // For now, we'll use middleware to filter by tenantId
    const client = new PrismaClient(prismaConfig);
    
    // Add middleware to automatically filter by tenant
    client.$use(async (params, next) => {
      // Skip tenant filtering for certain models that don't have tenantId
      const nonTenantModels = ['Tenant'];
      
      if (!nonTenantModels.includes(params.model || '')) {
        if (params.action === 'findMany' || params.action === 'findFirst') {
          params.args.where = {
            ...params.args.where,
            tenantId,
          };
        } else if (params.action === 'create') {
          params.args.data = {
            ...params.args.data,
            tenantId,
          };
        } else if (params.action === 'update' || params.action === 'updateMany') {
          params.args.where = {
            ...params.args.where,
            tenantId,
          };
        } else if (params.action === 'delete' || params.action === 'deleteMany') {
          params.args.where = {
            ...params.args.where,
            tenantId,
          };
        }
      }
      
      return next(params);
    });
    
    return client;
  }

  /**
   * Initialize tenant database schema
   */
  public static async initializeTenant(tenantId: string): Promise<void> {
    try {
      // Create default tenant record if it doesn't exist
      await prisma.tenant.upsert({
        where: { id: tenantId },
        update: {},
        create: {
          id: tenantId,
          name: `Tenant ${tenantId}`,
          slug: tenantId,
          isActive: true,
        },
      });
      
      logger.info(`🏢 Tenant ${tenantId} initialized successfully`);
    } catch (error) {
      logger.error(`❌ Failed to initialize tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up tenant data (for testing or tenant deletion)
   */
  public static async cleanupTenant(tenantId: string): Promise<void> {
    try {
      // Delete in order of dependencies
      await prisma.auditLog.deleteMany({ where: { tenantId } });
      await prisma.query.deleteMany({ where: { agent: { tenantId } } });
      await prisma.conversation.deleteMany({ where: { agent: { tenantId } } });
      await prisma.agent.deleteMany({ where: { tenantId } });
      await prisma.knowledgeBaseDocument.deleteMany({ where: { knowledgeBase: { tenantId } } });
      await prisma.knowledgeBase.deleteMany({ where: { tenantId } });
      await prisma.documentEmbedding.deleteMany({ where: { document: { tenantId } } });
      await prisma.documentChunk.deleteMany({ where: { document: { tenantId } } });
      await prisma.document.deleteMany({ where: { tenantId } });
      await prisma.session.deleteMany({ where: { user: { tenantId } } });
      await prisma.apiKey.deleteMany({ where: { tenantId } });
      await prisma.user.deleteMany({ where: { tenantId } });
      await prisma.tenant.delete({ where: { id: tenantId } });
      
      logger.info(`🗑️ Tenant ${tenantId} cleaned up successfully`);
    } catch (error) {
      logger.error(`❌ Failed to cleanup tenant ${tenantId}:`, error);
      throw error;
    }
  }
}

// Enhanced error handling for database operations
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Database transaction utilities
export async function withTransaction<T>(
  callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback);
}

// Export singleton instance
export const dbManager = DatabaseManager.getInstance();

// Graceful shutdown handling
process.on('beforeExit', async () => {
  await dbManager.disconnect();
});

process.on('SIGINT', async () => {
  await dbManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await dbManager.disconnect();
  process.exit(0);
});