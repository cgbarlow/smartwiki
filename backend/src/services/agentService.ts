import { AgentRegistry } from '../agents/core/AgentRegistry';
import { ModelProviderFactory } from '../agents/providers/ModelProviderFactory';
import { StandardsLibrary } from '../agents/compliance/standards/StandardsLibrary';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

/**
 * Service for initializing and managing the agent system
 */
export class AgentService {
  private static instance: AgentService;
  private initialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): AgentService {
    if (!this.instance) {
      this.instance = new AgentService();
    }
    return this.instance;
  }

  /**
   * Initialize the agent system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.info('🤖 Agent system already initialized');
      return;
    }

    try {
      logger.info('🚀 Initializing agent system...');

      // Step 1: Initialize model providers
      await this.initializeModelProviders();

      // Step 2: Initialize agent registry
      AgentRegistry.initialize();

      // Step 3: Initialize standards library
      await this.initializeStandardsLibrary();

      // Step 4: Validate system configuration
      await this.validateSystemConfiguration();

      this.initialized = true;
      logger.info('✅ Agent system initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize agent system:', error);
      throw error;
    }
  }

  /**
   * Initialize model providers from environment
   */
  private async initializeModelProviders(): Promise<void> {
    try {
      ModelProviderFactory.initializeFromEnv();
      
      const registeredProviders = ModelProviderFactory.getRegistered();
      if (registeredProviders.length === 0) {
        throw new Error('No model providers configured. Please set MISTRAL_API_KEY or other provider keys.');
      }

      logger.info(`🔧 Initialized ${registeredProviders.length} model providers: ${registeredProviders.join(', ')}`);

      // Test default provider
      const defaultProvider = ModelProviderFactory.getDefaultProvider();
      const isValid = await ModelProviderFactory.testProvider(defaultProvider);
      
      if (!isValid) {
        logger.warn(`⚠️ Default provider ${defaultProvider} failed connectivity test`);
      } else {
        logger.info(`✅ Default provider ${defaultProvider} connectivity verified`);
      }

    } catch (error) {
      logger.error('❌ Failed to initialize model providers:', error);
      throw error;
    }
  }

  /**
   * Initialize standards library with default standards
   */
  private async initializeStandardsLibrary(): Promise<void> {
    try {
      const standardsLibrary = new StandardsLibrary();
      await standardsLibrary.initializeDefaultStandards();
      
      const allStandards = await standardsLibrary.getAllStandards();
      logger.info(`📋 Standards library initialized with ${allStandards.length} standards`);

    } catch (error) {
      logger.error('❌ Failed to initialize standards library:', error);
      throw error;
    }
  }

  /**
   * Validate system configuration
   */
  private async validateSystemConfiguration(): Promise<void> {
    const issues: string[] = [];

    // Check database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      issues.push('Database connectivity failed');
    }

    // Check required environment variables
    if (!process.env.MISTRAL_API_KEY && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      issues.push('No AI model provider API keys configured');
    }

    // Check AWS configuration for RAG (optional)
    if (!process.env.AWS_REGION || !process.env.AWS_BEDROCK_KB_ID) {
      logger.warn('⚠️ AWS Bedrock configuration missing - RAG features will be limited');
    }

    if (issues.length > 0) {
      throw new Error(`System validation failed: ${issues.join(', ')}`);
    }

    logger.info('✅ System configuration validated');
  }

  /**
   * Create a default compliance agent for a tenant
   */
  async createDefaultComplianceAgent(tenantId: string, userId: string): Promise<string | null> {
    try {
      // Check if tenant already has a default compliance agent
      const existingAgent = await prisma.agent.findFirst({
        where: {
          tenantId,
          type: 'COMPLIANCE',
          name: 'Default Compliance Agent',
        },
      });

      if (existingAgent) {
        logger.info(`🤖 Default compliance agent already exists for tenant ${tenantId}: ${existingAgent.id}`);
        return existingAgent.id;
      }

      // Create default compliance agent
      const agentId = `compliance-default-${tenantId}`;
      const agent = await prisma.agent.create({
        data: {
          id: agentId,
          name: 'Default Compliance Agent',
          description: 'Default compliance analysis agent with support for SOX, GDPR, HIPAA, and other standards',
          type: 'COMPLIANCE',
          status: 'ACTIVE',
          configuration: {
            modelProvider: ModelProviderFactory.getDefaultProvider(),
            capabilities: {
              documentAnalysis: true,
              standardsComparison: true,
              gapIdentification: true,
              reportGeneration: true,
              riskAssessment: true,
            },
            limits: {
              maxDocumentSize: 50000,
              maxAnalysisTime: 300000,
              maxConcurrentAnalyses: 3,
            },
          },
          knowledgeBaseIds: [],
          isActive: true,
          createdById: userId,
          tenantId,
        },
      });

      // Register in agent registry
      await AgentRegistry.saveAgentToDatabase(agentId, tenantId, userId);

      logger.info(`✅ Created default compliance agent for tenant ${tenantId}: ${agent.id}`);
      return agent.id;

    } catch (error) {
      logger.error(`❌ Failed to create default compliance agent for tenant ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      database: boolean;
      modelProviders: boolean;
      standardsLibrary: boolean;
    };
    metrics: {
      activeAgents: number;
      totalAnalyses: number;
      availableStandards: number;
    };
  }> {
    const health = {
      status: 'healthy' as const,
      components: {
        database: false,
        modelProviders: false,
        standardsLibrary: false,
      },
      metrics: {
        activeAgents: 0,
        totalAnalyses: 0,
        availableStandards: 0,
      },
    };

    try {
      // Check database
      await prisma.$queryRaw`SELECT 1`;
      health.components.database = true;
    } catch (error) {
      health.components.database = false;
      health.status = 'unhealthy';
    }

    try {
      // Check model providers
      const defaultProvider = ModelProviderFactory.getDefaultProvider();
      health.components.modelProviders = await ModelProviderFactory.testProvider(defaultProvider);
      if (!health.components.modelProviders) {
        health.status = 'degraded';
      }
    } catch (error) {
      health.components.modelProviders = false;
      health.status = 'unhealthy';
    }

    try {
      // Check standards library
      const standardsLibrary = new StandardsLibrary();
      const standards = await standardsLibrary.getAllStandards();
      health.components.standardsLibrary = standards.length > 0;
      health.metrics.availableStandards = standards.length;
      
      if (!health.components.standardsLibrary) {
        health.status = 'degraded';
      }
    } catch (error) {
      health.components.standardsLibrary = false;
      health.status = 'degraded';
    }

    try {
      // Get metrics
      const [agentCount, analysisCount] = await Promise.all([
        prisma.agent.count({ where: { isActive: true } }),
        prisma.complianceAnalysis.count(),
      ]);

      health.metrics.activeAgents = agentCount;
      health.metrics.totalAnalyses = analysisCount;
    } catch (error) {
      // Metrics failure doesn't affect health status
      logger.warn('⚠️ Failed to get system metrics:', error);
    }

    return health;
  }

  /**
   * Cleanup inactive agents and old data
   */
  async cleanup(options: {
    removeInactiveAgentsOlderThan?: number; // hours
    removeAnalysesOlderThan?: number; // days
    removeReportsOlderThan?: number; // days
  } = {}): Promise<{
    agentsRemoved: number;
    analysesRemoved: number;
    reportsRemoved: number;
  }> {
    const {
      removeInactiveAgentsOlderThan = 24 * 7, // 1 week
      removeAnalysesOlderThan = 90, // 3 months
      removeReportsOlderThan = 30, // 1 month
    } = options;

    const results = {
      agentsRemoved: 0,
      analysesRemoved: 0,
      reportsRemoved: 0,
    };

    try {
      // Cleanup agent registry
      results.agentsRemoved = AgentRegistry.cleanupInactiveAgents(removeInactiveAgentsOlderThan);

      // Cleanup old analyses
      const analysisCleanupDate = new Date(Date.now() - removeAnalysesOlderThan * 24 * 60 * 60 * 1000);
      const analysesResult = await prisma.complianceAnalysis.deleteMany({
        where: {
          analysisDate: {
            lt: analysisCleanupDate,
          },
        },
      });
      results.analysesRemoved = analysesResult.count;

      // Cleanup old reports
      const reportCleanupDate = new Date(Date.now() - removeReportsOlderThan * 24 * 60 * 60 * 1000);
      const reportsResult = await prisma.complianceReport.deleteMany({
        where: {
          createdAt: {
            lt: reportCleanupDate,
          },
        },
      });
      results.reportsRemoved = reportsResult.count;

      logger.info(`🧹 Cleanup completed: ${results.agentsRemoved} agents, ${results.analysesRemoved} analyses, ${results.reportsRemoved} reports removed`);

    } catch (error) {
      logger.error('❌ Cleanup failed:', error);
      throw error;
    }

    return results;
  }

  /**
   * Check if system is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}