import { ComplianceAgent, AgentConfig } from '../types';
import { ModelProviderFactory } from '../providers/ModelProviderFactory';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

export interface AgentInstance {
  id: string;
  agent: ComplianceAgent;
  isActive: boolean;
  lastUsed: Date;
  usageCount: number;
}

/**
 * Central registry for managing agent instances
 */
export class AgentRegistry {
  private static instances: Map<string, AgentInstance> = new Map();
  private static configs: Map<string, AgentConfig> = new Map();

  /**
   * Register an agent configuration
   */
  static registerAgent(id: string, config: AgentConfig): void {
    this.configs.set(id, config);
    logger.info(`📋 Registered agent configuration: ${id}`);
  }

  /**
   * Create a new agent instance
   */
  static async createAgent(
    id: string,
    name: string,
    type: 'compliance' = 'compliance',
    config?: Partial<AgentConfig>
  ): Promise<ComplianceAgent> {
    const defaultConfig = this.getDefaultConfig();
    const mergedConfig = { ...defaultConfig, ...config };

    // Validate provider availability
    const provider = ModelProviderFactory.getProvider(
      mergedConfig.provider.name,
      mergedConfig.provider
    );

    const agent: ComplianceAgent = {
      id,
      name,
      type,
      status: 'active',
      capabilities: mergedConfig.capabilities,
      config: {
        modelProvider: mergedConfig.provider.name as any,
        modelVersion: mergedConfig.provider.model,
        temperature: mergedConfig.parameters.temperature,
        maxTokens: mergedConfig.parameters.maxTokens,
        systemPrompt: mergedConfig.prompts.systemPrompt,
        complianceFrameworks: [],
      },
      context: {
        selectedStandards: [],
        analysisHistory: [],
        userPreferences: {
          defaultStandards: [],
          reportFormat: 'pdf',
          alertLevel: 'medium',
        },
      },
      memory: {
        conversations: [],
        documentCache: new Map(),
        standardsCache: new Map(),
        patterns: [],
      },
    };

    // Store instance
    const instance: AgentInstance = {
      id,
      agent,
      isActive: true,
      lastUsed: new Date(),
      usageCount: 0,
    };

    this.instances.set(id, instance);
    this.configs.set(id, mergedConfig);

    logger.info(`🤖 Created agent instance: ${name} (${id})`);
    return agent;
  }

  /**
   * Get an agent instance
   */
  static getAgent(id: string): ComplianceAgent | null {
    const instance = this.instances.get(id);
    if (!instance || !instance.isActive) {
      return null;
    }

    // Update usage statistics
    instance.lastUsed = new Date();
    instance.usageCount++;

    return instance.agent;
  }

  /**
   * Update agent configuration
   */
  static updateAgent(id: string, updates: Partial<ComplianceAgent>): boolean {
    const instance = this.instances.get(id);
    if (!instance) {
      return false;
    }

    Object.assign(instance.agent, updates);
    logger.info(`🔧 Updated agent: ${id}`);
    return true;
  }

  /**
   * Deactivate an agent
   */
  static deactivateAgent(id: string): boolean {
    const instance = this.instances.get(id);
    if (!instance) {
      return false;
    }

    instance.isActive = false;
    instance.agent.status = 'inactive';
    logger.info(`🔌 Deactivated agent: ${id}`);
    return true;
  }

  /**
   * Activate an agent
   */
  static activateAgent(id: string): boolean {
    const instance = this.instances.get(id);
    if (!instance) {
      return false;
    }

    instance.isActive = true;
    instance.agent.status = 'active';
    logger.info(`⚡ Activated agent: ${id}`);
    return true;
  }

  /**
   * Remove an agent from registry
   */
  static removeAgent(id: string): boolean {
    const removed = this.instances.delete(id);
    this.configs.delete(id);
    
    if (removed) {
      logger.info(`🗑️ Removed agent from registry: ${id}`);
    }
    
    return removed;
  }

  /**
   * List all active agents
   */
  static listActiveAgents(): AgentInstance[] {
    return Array.from(this.instances.values()).filter(instance => instance.isActive);
  }

  /**
   * List all agents (active and inactive)
   */
  static listAllAgents(): AgentInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get agent statistics
   */
  static getAgentStats(id: string): {
    usageCount: number;
    lastUsed: Date;
    isActive: boolean;
    conversations: number;
    documents: number;
  } | null {
    const instance = this.instances.get(id);
    if (!instance) {
      return null;
    }

    return {
      usageCount: instance.usageCount,
      lastUsed: instance.lastUsed,
      isActive: instance.isActive,
      conversations: instance.agent.memory.conversations.length,
      documents: instance.agent.memory.documentCache.size,
    };
  }

  /**
   * Clean up inactive agents
   */
  static cleanupInactiveAgents(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [id, instance] of this.instances.entries()) {
      if (!instance.isActive && instance.lastUsed < cutoffTime) {
        this.instances.delete(id);
        this.configs.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`🧹 Cleaned up ${cleanedCount} inactive agents`);
    }

    return cleanedCount;
  }

  /**
   * Load agents from database
   */
  static async loadAgentsFromDatabase(tenantId: string): Promise<void> {
    try {
      const dbAgents = await prisma.agent.findMany({
        where: { tenantId, isActive: true },
        include: {
          createdBy: true,
        },
      });

      for (const dbAgent of dbAgents) {
        const config = dbAgent.configuration as any || this.getDefaultConfig();
        
        await this.createAgent(
          dbAgent.id,
          dbAgent.name,
          'compliance',
          config
        );
      }

      logger.info(`📥 Loaded ${dbAgents.length} agents from database for tenant ${tenantId}`);
    } catch (error) {
      logger.error('❌ Failed to load agents from database:', error);
    }
  }

  /**
   * Save agent to database
   */
  static async saveAgentToDatabase(
    agentId: string,
    tenantId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const instance = this.instances.get(agentId);
      if (!instance) {
        return false;
      }

      const config = this.configs.get(agentId);
      
      await prisma.agent.upsert({
        where: { id: agentId },
        update: {
          name: instance.agent.name,
          type: instance.agent.type.toUpperCase() as any,
          status: instance.agent.status.toUpperCase() as any,
          configuration: config || {},
          isActive: instance.isActive,
        },
        create: {
          id: agentId,
          name: instance.agent.name,
          type: instance.agent.type.toUpperCase() as any,
          status: instance.agent.status.toUpperCase() as any,
          configuration: config || {},
          isActive: instance.isActive,
          createdById: userId,
          tenantId,
        },
      });

      logger.info(`💾 Saved agent to database: ${agentId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to save agent ${agentId} to database:`, error);
      return false;
    }
  }

  /**
   * Get default agent configuration
   */
  private static getDefaultConfig(): AgentConfig {
    return {
      provider: {
        name: 'mistral',
        model: 'mistral-7b-instruct',
        apiKey: process.env.MISTRAL_API_KEY || '',
        baseUrl: process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1',
      },
      parameters: {
        temperature: 0.1,
        maxTokens: 2048,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
      },
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
      prompts: {
        systemPrompt: this.getDefaultSystemPrompt(),
        analysisPrompt: this.getDefaultAnalysisPrompt(),
        gapAnalysisPrompt: this.getDefaultGapAnalysisPrompt(),
        recommendationPrompt: this.getDefaultRecommendationPrompt(),
      },
    };
  }

  private static getDefaultSystemPrompt(): string {
    return `You are a compliance analysis expert AI assistant specializing in regulatory compliance assessment. Your role is to analyze documents against various compliance standards and provide detailed gap analysis and recommendations.`;
  }

  private static getDefaultAnalysisPrompt(): string {
    return `Analyze the provided document for compliance with the specified standards. Identify key sections, policies, procedures, and controls. Provide a structured assessment.`;
  }

  private static getDefaultGapAnalysisPrompt(): string {
    return `Perform a comprehensive gap analysis between the document content and compliance requirements. Identify missing elements, insufficient coverage, and non-compliant areas.`;
  }

  private static getDefaultRecommendationPrompt(): string {
    return `Based on the gap analysis, provide specific, actionable recommendations to achieve compliance. Prioritize recommendations by risk level and implementation complexity.`;
  }

  /**
   * Initialize registry with environment configuration
   */
  static initialize(): void {
    ModelProviderFactory.initializeFromEnv();
    logger.info('🚀 Agent Registry initialized');
  }
}