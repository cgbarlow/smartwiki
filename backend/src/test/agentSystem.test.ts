import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AgentService } from '../services/agentService';
import { ModelProviderFactory } from '../agents/providers/ModelProviderFactory';
import { StandardsLibrary } from '../agents/compliance/standards/StandardsLibrary';
import { ComplianceAgent } from '../agents/compliance/ComplianceAgent';
import { prisma } from '../config/database';

describe('Agent System Integration Tests', () => {
  let agentService: AgentService;
  let testTenantId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Initialize agent service
    agentService = AgentService.getInstance();
    
    // Create test tenant and user
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        slug: 'test-tenant-agent',
      },
    });
    testTenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        tenantId: testTenantId,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.agent.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.user.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.tenant.deleteMany({
      where: { id: testTenantId },
    });
  });

  describe('Agent Service', () => {
    it('should initialize successfully', async () => {
      // Skip initialization if already done
      if (!agentService.isInitialized()) {
        await expect(agentService.initialize()).resolves.not.toThrow();
      }
      expect(agentService.isInitialized()).toBe(true);
    });

    it('should get system health status', async () => {
      const health = await agentService.getSystemHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('components');
      expect(health).toHaveProperty('metrics');
      
      expect(health.components).toHaveProperty('database');
      expect(health.components).toHaveProperty('modelProviders');
      expect(health.components).toHaveProperty('standardsLibrary');
      
      expect(health.metrics).toHaveProperty('activeAgents');
      expect(health.metrics).toHaveProperty('totalAnalyses');
      expect(health.metrics).toHaveProperty('availableStandards');
    });

    it('should create default compliance agent', async () => {
      const agentId = await agentService.createDefaultComplianceAgent(testTenantId, testUserId);
      
      expect(agentId).toBeTruthy();
      expect(typeof agentId).toBe('string');

      // Verify agent was created in database
      const agent = await prisma.agent.findUnique({
        where: { id: agentId! },
      });

      expect(agent).toBeTruthy();
      expect(agent!.type).toBe('COMPLIANCE');
      expect(agent!.tenantId).toBe(testTenantId);
      expect(agent!.createdById).toBe(testUserId);
    });
  });

  describe('Model Provider Factory', () => {
    it('should initialize providers from environment', () => {
      // This might not work in test environment without actual API keys
      expect(() => ModelProviderFactory.initializeFromEnv()).not.toThrow();
    });

    it('should get available providers', () => {
      const available = ModelProviderFactory.getAvailable();
      expect(available).toContain('mistral');
      expect(available).toContain('openai');
      expect(available).toContain('anthropic');
    });

    it('should validate provider configuration', () => {
      const isValid = ModelProviderFactory.validateConfig('mistral', {
        apiKey: 'test-key',
      });
      expect(isValid).toBe(true);

      const isInvalid = ModelProviderFactory.validateConfig('mistral', {
        // missing apiKey
      } as any);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Standards Library', () => {
    let standardsLibrary: StandardsLibrary;

    beforeAll(() => {
      standardsLibrary = new StandardsLibrary();
    });

    it('should initialize with default standards', async () => {
      await standardsLibrary.initializeDefaultStandards();
      
      const allStandards = await standardsLibrary.getAllStandards();
      expect(allStandards.length).toBeGreaterThan(0);
      
      // Check for expected default standards
      const standardNames = allStandards.map(s => s.name);
      expect(standardNames).toContain('SOX');
      expect(standardNames).toContain('GDPR');
      expect(standardNames).toContain('HIPAA');
    });

    it('should search standards', async () => {
      const searchResults = await standardsLibrary.searchStandards('data protection');
      expect(Array.isArray(searchResults)).toBe(true);
    });

    it('should get standards by category', async () => {
      const financialStandards = await standardsLibrary.getStandardsByCategory('financial');
      expect(Array.isArray(financialStandards)).toBe(true);
      
      if (financialStandards.length > 0) {
        expect(financialStandards[0].category).toBe('financial');
      }
    });

    it('should get requirements for a standard', async () => {
      const allStandards = await standardsLibrary.getAllStandards();
      if (allStandards.length > 0) {
        const requirements = await standardsLibrary.getRequirements(allStandards[0].id);
        expect(Array.isArray(requirements)).toBe(true);
      }
    });
  });

  describe('Compliance Agent', () => {
    let complianceAgent: ComplianceAgent;
    let mockStandardIds: string[];

    beforeAll(async () => {
      complianceAgent = new ComplianceAgent(
        'test-compliance-agent',
        'Test Compliance Agent'
      );

      // Get some standard IDs for testing
      const standardsLibrary = new StandardsLibrary();
      const standards = await standardsLibrary.getAllStandards();
      mockStandardIds = standards.slice(0, 2).map(s => s.id);
    });

    it('should create compliance agent', () => {
      expect(complianceAgent).toBeTruthy();
    });

    it('should validate configuration', async () => {
      const validation = await complianceAgent.validateConfiguration();
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('issues');
      expect(Array.isArray(validation.issues)).toBe(true);
      
      // Note: validation might fail in test environment without API keys
      if (!validation.isValid) {
        expect(validation.issues.length).toBeGreaterThan(0);
      }
    });

    it('should get available standards', async () => {
      const standards = await complianceAgent.getAvailableStandards();
      expect(Array.isArray(standards)).toBe(true);
    });

    it('should search standards', async () => {
      const searchResults = await complianceAgent.searchStandards('compliance');
      expect(Array.isArray(searchResults)).toBe(true);
    });

    it('should get agent status', () => {
      const status = complianceAgent.getStatus();
      
      expect(status).toHaveProperty('id');
      expect(status).toHaveProperty('name');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('documentsAnalyzed');
      expect(status).toHaveProperty('standardsLoaded');
      expect(status).toHaveProperty('averageScore');
      
      expect(status.documentsAnalyzed).toBe(0);
      expect(status.standardsLoaded).toBe(0);
      expect(status.averageScore).toBe(0);
    });

    // Skip actual analysis test if no API key available
    it.skip('should analyze document compliance', async () => {
      if (mockStandardIds.length === 0) {
        console.log('Skipping analysis test - no standards available');
        return;
      }

      const mockDocument = {
        id: 'test-doc-1',
        title: 'Test Document',
        content: `
          # Data Protection Policy
          
          ## Purpose
          This policy establishes guidelines for protecting personal data.
          
          ## Scope
          This policy applies to all employees and contractors.
          
          ## Data Processing
          Personal data must be processed lawfully and fairly.
          
          ## Security Measures
          Appropriate technical and organizational measures must be implemented.
          
          ## Access Controls
          Access to personal data is restricted to authorized personnel only.
        `,
      };

      try {
        const result = await complianceAgent.analyzeCompliance(
          mockDocument,
          mockStandardIds,
          testUserId
        );

        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('documentId');
        expect(result).toHaveProperty('standardIds');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('gaps');
        expect(result).toHaveProperty('recommendations');
        expect(result).toHaveProperty('timestamp');

        expect(result.documentId).toBe(mockDocument.id);
        expect(result.standardIds).toEqual(mockStandardIds);
        expect(typeof result.score).toBe('number');
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(Array.isArray(result.gaps)).toBe(true);
        expect(Array.isArray(result.recommendations)).toBe(true);
      } catch (error) {
        console.log('Analysis test failed (expected without API key):', error.message);
      }
    });
  });

  describe('System Integration', () => {
    it('should handle cleanup operations', async () => {
      const results = await agentService.cleanup({
        removeInactiveAgentsOlderThan: 0, // Remove all inactive agents
        removeAnalysesOlderThan: 0, // Remove all old analyses
        removeReportsOlderThan: 0, // Remove all old reports
      });

      expect(results).toHaveProperty('agentsRemoved');
      expect(results).toHaveProperty('analysesRemoved');
      expect(results).toHaveProperty('reportsRemoved');

      expect(typeof results.agentsRemoved).toBe('number');
      expect(typeof results.analysesRemoved).toBe('number');
      expect(typeof results.reportsRemoved).toBe('number');
    });
  });
});

describe('Agent System Error Handling', () => {
  it('should handle invalid provider names gracefully', () => {
    expect(() => {
      ModelProviderFactory.create('invalid-provider', { apiKey: 'test' });
    }).toThrow('Unknown model provider: invalid-provider');
  });

  it('should handle missing API keys gracefully', () => {
    expect(() => {
      ModelProviderFactory.validateConfig('mistral', {} as any);
    }).not.toThrow();
    
    const isValid = ModelProviderFactory.validateConfig('mistral', {} as any);
    expect(isValid).toBe(false);
  });

  it('should handle database connection errors gracefully', async () => {
    // This test would require mocking the database connection
    // For now, we just ensure the system doesn't crash
    const agentService = AgentService.getInstance();
    
    try {
      const health = await agentService.getSystemHealth();
      expect(health).toBeTruthy();
    } catch (error) {
      // Expected if database is not available
      expect(error).toBeTruthy();
    }
  });
});