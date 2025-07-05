/**
 * Agent Registry for managing and discovering agents in the SmartWiki system
 */
import { 
  AgentBase, 
  ComplianceAgent, 
  AgentEvent, 
  AgentCommand, 
  AgentError,
  PerformanceMetrics,
  HealthStatus 
} from '../types/index.js';

export interface AgentRegistration {
  agent: AgentBase;
  capabilities: string[];
  dependencies: string[];
  healthCheckInterval: number;
  lastHealthCheck: Date;
  metrics: PerformanceMetrics[];
}

export interface AgentFilter {
  type?: string;
  status?: string;
  capabilities?: string[];
  tenantId?: string;
}

export class AgentRegistry {
  private agents: Map<string, AgentRegistration> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();
  private healthCheckTimers: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Register a new agent in the system
   */
  async register(agent: AgentBase, options?: {
    capabilities?: string[];
    dependencies?: string[];
    healthCheckInterval?: number;
    autoStart?: boolean;
  }): Promise<void> {
    const agentId = agent.id;
    
    if (this.agents.has(agentId)) {
      throw new Error(`Agent with ID ${agentId} is already registered`);
    }

    const registration: AgentRegistration = {
      agent,
      capabilities: options?.capabilities || [],
      dependencies: options?.dependencies || [],
      healthCheckInterval: options?.healthCheckInterval || 60000, // 1 minute default
      lastHealthCheck: new Date(),
      metrics: []
    };

    // Validate dependencies
    await this.validateDependencies(registration.dependencies);

    // Register the agent
    this.agents.set(agentId, registration);

    // Start health checking if auto-start is enabled
    if (options?.autoStart !== false) {
      this.startHealthCheck(agentId);
    }

    // Emit registration event
    this.emitEvent({
      id: this.generateEventId(),
      type: 'agent.registered',
      agentId,
      tenantId: '', // Will be set by specific implementations
      payload: { agent, capabilities: registration.capabilities },
      timestamp: new Date(),
      processed: false
    });
  }

  /**
   * Unregister an agent from the system
   */
  async unregister(agentId: string): Promise<void> {
    const registration = this.agents.get(agentId);
    if (!registration) {
      throw new Error(`Agent with ID ${agentId} is not registered`);
    }

    // Stop health checking
    this.stopHealthCheck(agentId);

    // Update agent status
    registration.agent.status = 'inactive';

    // Remove from registry
    this.agents.delete(agentId);

    // Emit unregistration event
    this.emitEvent({
      id: this.generateEventId(),
      type: 'agent.unregistered',
      agentId,
      tenantId: '',
      payload: { agent: registration.agent },
      timestamp: new Date(),
      processed: false
    });
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: string): AgentBase | null {
    const registration = this.agents.get(agentId);
    return registration ? registration.agent : null;
  }

  /**
   * Get all registered agents with optional filtering
   */
  getAgents(filter?: AgentFilter): AgentBase[] {
    let agents = Array.from(this.agents.values()).map(reg => reg.agent);

    if (filter) {
      if (filter.type) {
        agents = agents.filter(agent => agent.type === filter.type);
      }
      
      if (filter.status) {
        agents = agents.filter(agent => agent.status === filter.status);
      }
      
      if (filter.capabilities && filter.capabilities.length > 0) {
        agents = agents.filter(agent => {
          const registration = this.agents.get(agent.id);
          if (!registration) return false;
          
          return filter.capabilities!.every(capability => 
            registration.capabilities.includes(capability)
          );
        });
      }

      // Note: tenantId filtering would need to be implemented at the agent level
      // as different agent types might store tenant information differently
    }

    return agents;
  }

  /**
   * Find agents by capability
   */
  findAgentsByCapability(capability: string): AgentBase[] {
    return this.getAgents({ capabilities: [capability] });
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type: string): AgentBase[] {
    return this.getAgents({ type });
  }

  /**
   * Get active agents
   */
  getActiveAgents(): AgentBase[] {
    return this.getAgents({ status: 'active' });
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId: string, status: AgentBase['status']): void {
    const registration = this.agents.get(agentId);
    if (!registration) {
      throw new Error(`Agent with ID ${agentId} is not registered`);
    }

    const oldStatus = registration.agent.status;
    registration.agent.status = status;
    registration.agent.updated = new Date();

    // Emit status change event
    this.emitEvent({
      id: this.generateEventId(),
      type: 'agent.status_changed',
      agentId,
      tenantId: '',
      payload: { oldStatus, newStatus: status },
      timestamp: new Date(),
      processed: false
    });
  }

  /**
   * Add performance metrics for an agent
   */
  addMetrics(agentId: string, metrics: PerformanceMetrics): void {
    const registration = this.agents.get(agentId);
    if (!registration) {
      throw new Error(`Agent with ID ${agentId} is not registered`);
    }

    registration.metrics.push(metrics);

    // Keep only last 100 metrics to prevent memory bloat
    if (registration.metrics.length > 100) {
      registration.metrics = registration.metrics.slice(-100);
    }
  }

  /**
   * Get metrics for an agent
   */
  getMetrics(agentId: string, limit?: number): PerformanceMetrics[] {
    const registration = this.agents.get(agentId);
    if (!registration) {
      return [];
    }

    const metrics = registration.metrics;
    return limit ? metrics.slice(-limit) : metrics;
  }

  /**
   * Get aggregated metrics for all agents
   */
  getAggregatedMetrics(): {
    totalAgents: number;
    activeAgents: number;
    averageResponseTime: number;
    totalTokenUsage: number;
    errorRate: number;
  } {
    const allAgents = Array.from(this.agents.values());
    const activeAgents = allAgents.filter(reg => reg.agent.status === 'active');
    
    let totalResponseTime = 0;
    let totalTokenUsage = 0;
    let totalRequests = 0;
    let totalErrors = 0;

    allAgents.forEach(registration => {
      registration.metrics.forEach(metric => {
        totalResponseTime += metric.duration;
        totalTokenUsage += metric.tokenUsage.totalTokens;
        totalRequests++;
        if (metric.errorRate > 0) {
          totalErrors++;
        }
      });
    });

    return {
      totalAgents: allAgents.length,
      activeAgents: activeAgents.length,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      totalTokenUsage,
      errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0
    };
  }

  /**
   * Check health of a specific agent
   */
  async checkAgentHealth(agentId: string): Promise<HealthStatus> {
    const registration = this.agents.get(agentId);
    if (!registration) {
      throw new Error(`Agent with ID ${agentId} is not registered`);
    }

    const agent = registration.agent;
    const now = new Date();
    
    try {
      // Basic health check - verify agent is responsive
      const isHealthy = agent.status === 'active';
      
      // Get recent metrics
      const recentMetrics = registration.metrics.slice(-10);
      const recentErrors: AgentError[] = []; // Would be populated from error tracking
      
      // Calculate uptime
      const uptime = now.getTime() - agent.created.getTime();
      
      const healthStatus: HealthStatus = {
        agentId,
        status: isHealthy ? 'healthy' : 'unhealthy',
        uptime,
        lastHealthCheck: now,
        metrics: recentMetrics,
        errors: recentErrors,
        warnings: []
      };

      // Update last health check time
      registration.lastHealthCheck = now;

      return healthStatus;
    } catch (error) {
      return {
        agentId,
        status: 'unhealthy',
        uptime: 0,
        lastHealthCheck: now,
        metrics: [],
        errors: [{
          code: 'HEALTH_CHECK_FAILED',
          message: error.message,
          timestamp: now,
          agentId
        }],
        warnings: []
      };
    }
  }

  /**
   * Event handling
   */
  addEventListener(eventType: string, handler: Function): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  removeEventListener(eventType: string, handler: Function): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emitEvent(event: AgentEvent): void {
    const handlers = this.eventHandlers.get(event.type) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${event.type}:`, error);
      }
    });
  }

  /**
   * Start health checking for an agent
   */
  private startHealthCheck(agentId: string): void {
    const registration = this.agents.get(agentId);
    if (!registration) return;

    const timer = setInterval(async () => {
      try {
        await this.checkAgentHealth(agentId);
      } catch (error) {
        console.error(`Health check failed for agent ${agentId}:`, error);
      }
    }, registration.healthCheckInterval);

    this.healthCheckTimers.set(agentId, timer);
  }

  /**
   * Stop health checking for an agent
   */
  private stopHealthCheck(agentId: string): void {
    const timer = this.healthCheckTimers.get(agentId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckTimers.delete(agentId);
    }
  }

  /**
   * Validate agent dependencies
   */
  private async validateDependencies(dependencies: string[]): Promise<void> {
    for (const dependency of dependencies) {
      const dependentAgent = this.getAgent(dependency);
      if (!dependentAgent) {
        throw new Error(`Dependency agent ${dependency} is not registered`);
      }
      
      if (dependentAgent.status !== 'active') {
        throw new Error(`Dependency agent ${dependency} is not active`);
      }
    }
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalAgents: number;
    activeAgents: number;
    inactiveAgents: number;
    processingAgents: number;
    errorAgents: number;
    agentTypes: Record<string, number>;
  } {
    const agents = Array.from(this.agents.values());
    const stats = {
      totalAgents: agents.length,
      activeAgents: 0,
      inactiveAgents: 0,
      processingAgents: 0,
      errorAgents: 0,
      agentTypes: {} as Record<string, number>
    };

    agents.forEach(registration => {
      const agent = registration.agent;
      
      // Count by status
      switch (agent.status) {
        case 'active':
          stats.activeAgents++;
          break;
        case 'inactive':
          stats.inactiveAgents++;
          break;
        case 'processing':
          stats.processingAgents++;
          break;
        case 'error':
          stats.errorAgents++;
          break;
      }

      // Count by type
      stats.agentTypes[agent.type] = (stats.agentTypes[agent.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Shutdown all agents and clean up resources
   */
  async shutdown(): Promise<void> {
    const agentIds = Array.from(this.agents.keys());
    
    for (const agentId of agentIds) {
      try {
        await this.unregister(agentId);
      } catch (error) {
        console.error(`Error unregistering agent ${agentId}:`, error);
      }
    }

    // Clear all event handlers
    this.eventHandlers.clear();

    // Clear all health check timers
    this.healthCheckTimers.forEach(timer => clearInterval(timer));
    this.healthCheckTimers.clear();
  }
}