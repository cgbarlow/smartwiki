import { 
  ComplianceAgent as IComplianceAgent,
  ComplianceStandard,
  AnalysisResult,
  Document,
  ComplianceReport,
  UserPreferences
} from '../types';
import { ComplianceAnalyzer } from './analyzers/ComplianceAnalyzer';
import { StandardsLibrary } from './standards/StandardsLibrary';
import { AgentRegistry } from '../core/AgentRegistry';
import { ModelProviderFactory } from '../providers/ModelProviderFactory';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

/**
 * Main Compliance Agent implementation
 * Orchestrates compliance analysis workflows
 */
export class ComplianceAgent {
  private id: string;
  private analyzer: ComplianceAnalyzer;
  private standardsLibrary: StandardsLibrary;
  private agentInstance: IComplianceAgent;

  constructor(
    id: string,
    name: string,
    modelProvider: string = 'mistral'
  ) {
    this.id = id;
    this.analyzer = new ComplianceAnalyzer(modelProvider);
    this.standardsLibrary = new StandardsLibrary();
    
    // Initialize agent instance
    this.agentInstance = {
      id,
      name,
      type: 'compliance',
      status: 'active',
      capabilities: {
        documentAnalysis: true,
        standardsComparison: true,
        gapIdentification: true,
        reportGeneration: true,
        riskAssessment: true,
      },
      config: {
        modelProvider: modelProvider as any,
        modelVersion: 'mistral-7b-instruct',
        temperature: 0.1,
        maxTokens: 2048,
        systemPrompt: this.getSystemPrompt(),
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
  }

  /**
   * Analyze a document for compliance
   */
  async analyzeCompliance(
    document: Document,
    standardIds: string[],
    userId: string,
    options?: {
      detailedAnalysis?: boolean;
      includeRecommendations?: boolean;
      riskAssessment?: boolean;
    }
  ): Promise<AnalysisResult> {
    logger.info(`🤖 Compliance Agent ${this.id} starting analysis of document ${document.id}`);

    try {
      // Update agent status
      this.agentInstance.status = 'processing';

      // Load compliance standards
      const standards = await this.loadStandards(standardIds);
      if (standards.length === 0) {
        throw new Error('No valid compliance standards found');
      }

      // Update context
      this.agentInstance.context.selectedStandards = standards;

      // Perform analysis
      const analysisResult = await this.analyzer.analyzeDocument(
        document,
        standards,
        this.id,
        userId
      );

      // Store in agent memory
      this.agentInstance.context.analysisHistory.push(analysisResult);
      this.agentInstance.memory.documentCache.set(document.id, {
        id: document.id,
        structure: {} as any, // Will be populated by analyzer
        content: document.content,
        metadata: { analyzedAt: new Date() },
        analyzedAt: new Date(),
      });

      // Update agent status
      this.agentInstance.status = 'active';

      logger.info(`✅ Compliance analysis completed: ${analysisResult.id}`);
      return analysisResult;

    } catch (error) {
      this.agentInstance.status = 'active';
      logger.error(`❌ Compliance analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateReport(
    analysisId: string,
    format: 'pdf' | 'docx' | 'html' | 'json' = 'pdf'
  ): Promise<ComplianceReport> {
    logger.info(`📊 Generating compliance report for analysis ${analysisId}`);

    try {
      // Load analysis from database
      const analysis = await prisma.complianceAnalysis.findUnique({
        where: { id: analysisId },
        include: {
          gaps: {
            include: {
              requirement: {
                include: {
                  standard: true,
                },
              },
            },
          },
          recommendations: true,
          standards: true,
        },
      });

      if (!analysis) {
        throw new Error(`Analysis ${analysisId} not found`);
      }

      // Generate report content
      const reportContent = await this.generateReportContent(analysis);

      // Create report record
      const report = await prisma.complianceReport.create({
        data: {
          analysisId,
          title: `Compliance Report - ${analysis.documentTitle}`,
          content: reportContent,
          format: format.toUpperCase() as any,
        },
      });

      const complianceReport: ComplianceReport = {
        id: report.id,
        documentId: analysis.documentId || '',
        documentTitle: analysis.documentTitle,
        analysisDate: analysis.analysisDate,
        standards: analysis.standards.map(s => ({
          id: s.id,
          name: s.name,
          version: s.version,
          category: s.category.toLowerCase() as any,
          description: s.description,
          requirements: [], // Will be populated if needed
        })),
        overallScore: analysis.overallScore,
        gaps: analysis.gaps.map(gap => ({
          requirementId: gap.requirementId,
          description: gap.description,
          severity: gap.severity.toLowerCase() as any,
          evidence: gap.evidence || '',
          recommendation: '', // Will be from recommendations
        })),
        recommendations: analysis.recommendations.map(rec => ({
          id: rec.id,
          title: rec.title,
          description: rec.description,
          priority: rec.priority.toLowerCase() as any,
          category: rec.category,
          actionItems: rec.actionItems,
        })),
        riskAssessment: {
          overallRisk: this.calculateOverallRisk(analysis.gaps),
          riskFactors: [],
          mitigationStrategies: analysis.recommendations.map(r => r.description),
        },
      };

      logger.info(`✅ Compliance report generated: ${report.id}`);
      return complianceReport;

    } catch (error) {
      logger.error('❌ Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Get available compliance standards
   */
  async getAvailableStandards(category?: string): Promise<ComplianceStandard[]> {
    if (category) {
      return await this.standardsLibrary.getStandardsByCategory(category);
    }
    return await this.standardsLibrary.getAllStandards();
  }

  /**
   * Search compliance standards
   */
  async searchStandards(query: string): Promise<ComplianceStandard[]> {
    return await this.standardsLibrary.searchStandards(query);
  }

  /**
   * Get analysis history
   */
  getAnalysisHistory(): AnalysisResult[] {
    return this.agentInstance.context.analysisHistory;
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Partial<UserPreferences>): void {
    Object.assign(this.agentInstance.context.userPreferences, preferences);
    logger.info(`🔧 Updated user preferences for agent ${this.id}`);
  }

  /**
   * Get agent status and statistics
   */
  getStatus(): {
    id: string;
    name: string;
    status: string;
    documentsAnalyzed: number;
    standardsLoaded: number;
    averageScore: number;
    lastAnalysis?: Date;
  } {
    const history = this.agentInstance.context.analysisHistory;
    const averageScore = history.length > 0 
      ? history.reduce((sum, analysis) => sum + analysis.score, 0) / history.length
      : 0;

    return {
      id: this.id,
      name: this.agentInstance.name,
      status: this.agentInstance.status,
      documentsAnalyzed: history.length,
      standardsLoaded: this.agentInstance.memory.standardsCache.size,
      averageScore,
      lastAnalysis: history.length > 0 ? history[history.length - 1].timestamp : undefined,
    };
  }

  /**
   * Validate agent configuration
   */
  async validateConfiguration(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Test model provider
      const provider = ModelProviderFactory.getProvider(this.agentInstance.config.modelProvider);
      const testResult = await provider.chat([
        { role: 'user', content: 'Test connection. Please respond with "OK".' }
      ], { maxTokens: 10 });

      if (!testResult.message.toLowerCase().includes('ok')) {
        issues.push('Model provider test failed');
      }
    } catch (error) {
      issues.push(`Model provider error: ${error.message}`);
    }

    // Test standards library
    try {
      const standards = await this.standardsLibrary.getAllStandards();
      if (standards.length === 0) {
        issues.push('No compliance standards available');
      }
    } catch (error) {
      issues.push(`Standards library error: ${error.message}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Load compliance standards by IDs
   */
  private async loadStandards(standardIds: string[]): Promise<ComplianceStandard[]> {
    const standards: ComplianceStandard[] = [];

    for (const id of standardIds) {
      const standard = await this.standardsLibrary.getStandard(id);
      if (standard) {
        standards.push(standard);
        this.agentInstance.memory.standardsCache.set(id, {
          id: standard.id,
          name: standard.name,
          requirements: standard.requirements,
          lastUpdated: new Date(),
        });
      }
    }

    return standards;
  }

  /**
   * Generate report content
   */
  private async generateReportContent(analysis: any): Promise<string> {
    const reportTemplate = `
# Compliance Analysis Report

## Document Information
- **Title**: ${analysis.documentTitle}
- **Analysis Date**: ${analysis.analysisDate.toISOString().split('T')[0]}
- **Overall Score**: ${analysis.overallScore.toFixed(1)}%

## Standards Analyzed
${analysis.standards.map(s => `- ${s.name} (${s.version})`).join('\n')}

## Compliance Gaps
${analysis.gaps.length === 0 ? 'No significant gaps identified.' : analysis.gaps.map((gap, index) => `
### Gap ${index + 1}: ${gap.requirement?.title || 'Unknown Requirement'}
- **Severity**: ${gap.severity}
- **Description**: ${gap.description}
- **Evidence**: ${gap.evidence || 'No specific evidence provided'}
`).join('\n')}

## Recommendations
${analysis.recommendations.map((rec, index) => `
### Recommendation ${index + 1}: ${rec.title}
- **Priority**: ${rec.priority}
- **Category**: ${rec.category}
- **Description**: ${rec.description}
- **Action Items**:
${rec.actionItems.map(item => `  - ${item}`).join('\n')}
`).join('\n')}

## Risk Assessment
- **Overall Risk Level**: ${this.calculateOverallRisk(analysis.gaps)}
- **Critical Issues**: ${analysis.gaps.filter(g => g.severity === 'CRITICAL').length}
- **High Priority Issues**: ${analysis.gaps.filter(g => g.severity === 'HIGH').length}

---
*Report generated by SmartWiki Compliance Agent on ${new Date().toISOString()}*
    `;

    return reportTemplate.trim();
  }

  /**
   * Calculate overall risk level
   */
  private calculateOverallRisk(gaps: any[]): 'low' | 'medium' | 'high' | 'critical' {
    if (gaps.some(g => g.severity === 'CRITICAL')) return 'critical';
    if (gaps.filter(g => g.severity === 'HIGH').length >= 3) return 'high';
    if (gaps.filter(g => g.severity === 'MEDIUM').length >= 5) return 'medium';
    return 'low';
  }

  /**
   * Get system prompt for the agent
   */
  private getSystemPrompt(): string {
    return `You are a specialized compliance analysis agent for SmartWiki. Your primary functions include:

1. Document Analysis: Review documents for compliance with regulatory standards
2. Gap Identification: Identify missing or insufficient compliance elements
3. Risk Assessment: Evaluate compliance risks and their potential impact
4. Recommendation Generation: Provide actionable recommendations for compliance improvement
5. Report Generation: Create comprehensive compliance reports

Key Standards Expertise:
- SOX (Sarbanes-Oxley Act)
- GDPR (General Data Protection Regulation)
- HIPAA (Health Insurance Portability and Accountability Act)
- PCI DSS (Payment Card Industry Data Security Standard)
- ISO 27001 (Information Security Management)
- NIST Cybersecurity Framework

Always provide:
- Structured, professional analysis
- Evidence-based findings
- Clear, actionable recommendations
- Risk-prioritized guidance
- Comprehensive documentation

Maintain objectivity and focus on practical, implementable solutions.`;
  }
}