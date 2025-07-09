import { 
  ComplianceStandard, 
  ComplianceRequirement, 
  ComplianceGap, 
  DocumentStructure,
  GapAnalysis,
  AnalysisDetail,
  AnalysisResult,
  Recommendation,
  Document
} from '../../types';
import { ModelProvider } from '../../providers/ModelProvider';
import { ModelProviderFactory } from '../../providers/ModelProviderFactory';
import { StandardsLibrary } from '../standards/StandardsLibrary';
import { logger } from '../../../utils/logger';
import { prisma } from '../../../config/database';

/**
 * Core compliance analysis engine
 */
export class ComplianceAnalyzer {
  private modelProvider: ModelProvider;
  private standardsLibrary: StandardsLibrary;

  constructor(
    modelProviderName: string = 'mistral',
    standardsLibrary?: StandardsLibrary
  ) {
    this.modelProvider = ModelProviderFactory.getProvider(modelProviderName);
    this.standardsLibrary = standardsLibrary || new StandardsLibrary();
  }

  /**
   * Analyze a document against compliance standards
   */
  async analyzeDocument(
    document: Document,
    standards: ComplianceStandard[],
    agentId: string,
    userId: string
  ): Promise<AnalysisResult> {
    logger.info(`🔍 Starting compliance analysis for document: ${document.id}`);

    try {
      // Step 1: Extract document structure and content
      const documentStructure = await this.extractStructure(document);

      // Step 2: Retrieve relevant compliance requirements
      const requirements = await this.getRelevantRequirements(standards);

      // Step 3: Perform gap analysis
      const gapAnalysis = await this.performGapAnalysis(
        documentStructure,
        requirements
      );

      // Step 4: Generate compliance score
      const complianceScore = this.calculateComplianceScore(gapAnalysis);

      // Step 5: Create recommendations
      const recommendations = await this.generateRecommendations(gapAnalysis, requirements);

      // Step 6: Save analysis to database
      const analysisResult: AnalysisResult = {
        id: await this.saveAnalysisToDatabase(
          document,
          standards,
          complianceScore,
          gapAnalysis.gaps,
          recommendations,
          agentId,
          userId
        ),
        documentId: document.id,
        standardIds: standards.map(s => s.id),
        score: complianceScore,
        gaps: gapAnalysis.gaps,
        recommendations,
        timestamp: new Date(),
      };

      logger.info(`✅ Compliance analysis completed: ${analysisResult.id} (score: ${complianceScore.toFixed(2)})`);
      return analysisResult;

    } catch (error) {
      logger.error(`❌ Compliance analysis failed for document ${document.id}:`, error);
      throw error;
    }
  }

  /**
   * Extract document structure and key elements
   */
  private async extractStructure(document: Document): Promise<DocumentStructure> {
    const prompt = `
    Analyze the following document and extract its structural elements in JSON format:
    
    Required structure:
    {
      "headers": ["list of main headers/titles"],
      "sections": [
        {
          "title": "section title",
          "content": "section content summary",
          "level": 1
        }
      ],
      "policies": [
        {
          "title": "policy title",
          "content": "policy statement",
          "category": "policy category"
        }
      ],
      "procedures": [
        {
          "title": "procedure title",
          "steps": ["step 1", "step 2"],
          "category": "procedure category"
        }
      ],
      "controls": [
        {
          "title": "control title",
          "description": "control description",
          "category": "control category",
          "implementation": "how it's implemented"
        }
      ],
      "roles": [
        {
          "title": "role title",
          "responsibilities": ["responsibility 1", "responsibility 2"],
          "permissions": ["permission 1", "permission 2"]
        }
      ]
    }
    
    Focus on compliance-relevant content such as:
    - Security policies and procedures
    - Data handling and privacy measures
    - Access controls and authorization
    - Risk management processes
    - Audit and monitoring procedures
    - Incident response plans
    - Training and awareness programs
    
    Return only the JSON structure, no additional text.
    `;

    try {
      const response = await this.modelProvider.analyze(document.content, prompt);
      const structure = JSON.parse(response.analysis);

      // Validate structure and provide defaults
      return {
        headers: structure.headers || [],
        sections: structure.sections || [],
        policies: structure.policies || [],
        procedures: structure.procedures || [],
        controls: structure.controls || [],
        roles: structure.roles || [],
      };
    } catch (error) {
      logger.error('❌ Failed to extract document structure:', error);
      // Return empty structure as fallback
      return {
        headers: [],
        sections: [],
        policies: [],
        procedures: [],
        controls: [],
        roles: [],
      };
    }
  }

  /**
   * Get relevant requirements from all standards
   */
  private async getRelevantRequirements(
    standards: ComplianceStandard[]
  ): Promise<ComplianceRequirement[]> {
    const allRequirements: ComplianceRequirement[] = [];

    for (const standard of standards) {
      const requirements = await this.standardsLibrary.getRequirements(standard.id);
      allRequirements.push(...requirements);
    }

    return allRequirements;
  }

  /**
   * Perform comprehensive gap analysis
   */
  private async performGapAnalysis(
    documentStructure: DocumentStructure,
    requirements: ComplianceRequirement[]
  ): Promise<GapAnalysis> {
    const gaps: ComplianceGap[] = [];
    const details: AnalysisDetail[] = [];

    // Process requirements in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < requirements.length; i += batchSize) {
      const batch = requirements.slice(i, i + batchSize);
      
      const batchPromises = batch.map(requirement => 
        this.analyzeRequirement(documentStructure, requirement)
      );

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        if (result.gap) {
          gaps.push(result.gap);
        }
        details.push(result.detail);
      }

      // Small delay to respect rate limits
      if (i + batchSize < requirements.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { gaps, details };
  }

  /**
   * Analyze a single requirement against document structure
   */
  private async analyzeRequirement(
    documentStructure: DocumentStructure,
    requirement: ComplianceRequirement
  ): Promise<{
    gap: ComplianceGap | null;
    detail: AnalysisDetail;
  }> {
    const analysisPrompt = `
    Analyze if the following document structure satisfies this compliance requirement:
    
    REQUIREMENT:
    Standard: ${requirement.standardId}
    Section: ${requirement.section}
    Title: ${requirement.title}
    Description: ${requirement.description}
    Criticality: ${requirement.criticality}
    
    DOCUMENT STRUCTURE:
    ${JSON.stringify(documentStructure, null, 2)}
    
    Analyze and respond in JSON format:
    {
      "satisfied": "yes|no|partial",
      "evidence": "specific evidence found in document or explanation of absence",
      "confidence": 0.85,
      "riskLevel": "low|medium|high|critical",
      "gaps": "description of what's missing or insufficient",
      "recommendation": "specific action to address gaps"
    }
    
    Consider:
    1. Does the document explicitly address this requirement?
    2. Is the coverage adequate and specific?
    3. Are there proper controls and procedures in place?
    4. What evidence supports compliance or non-compliance?
    5. What is the risk if this requirement is not met?
    `;

    try {
      const response = await this.modelProvider.analyze('', analysisPrompt);
      const analysis = JSON.parse(response.analysis);

      const detail: AnalysisDetail = {
        requirementId: requirement.id,
        satisfied: analysis.satisfied || 'no',
        evidence: analysis.evidence || '',
        confidence: Math.min(1, Math.max(0, analysis.confidence || 0.5)),
      };

      let gap: ComplianceGap | null = null;
      if (analysis.satisfied !== 'yes') {
        gap = {
          requirementId: requirement.id,
          description: analysis.gaps || requirement.description,
          severity: this.mapRiskToSeverity(analysis.riskLevel || 'medium'),
          evidence: analysis.evidence || '',
          recommendation: analysis.recommendation || '',
        };
      }

      return { gap, detail };

    } catch (error) {
      logger.error(`❌ Failed to analyze requirement ${requirement.id}:`, error);
      
      // Return default analysis on error
      return {
        gap: {
          requirementId: requirement.id,
          description: `Analysis failed: ${requirement.description}`,
          severity: 'medium',
          evidence: 'Analysis could not be completed',
          recommendation: 'Manual review required',
        },
        detail: {
          requirementId: requirement.id,
          satisfied: 'no',
          evidence: 'Analysis failed',
          confidence: 0.1,
        },
      };
    }
  }

  /**
   * Calculate overall compliance score
   */
  private calculateComplianceScore(gapAnalysis: GapAnalysis): number {
    const totalRequirements = gapAnalysis.details.length;
    if (totalRequirements === 0) return 0;

    let weightedScore = 0;
    let totalWeight = 0;

    for (const detail of gapAnalysis.details) {
      let score = 0;
      switch (detail.satisfied) {
        case 'yes':
          score = 1.0;
          break;
        case 'partial':
          score = 0.5;
          break;
        case 'no':
          score = 0.0;
          break;
      }

      const weight = detail.confidence;
      weightedScore += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
  }

  /**
   * Generate recommendations based on gap analysis
   */
  private async generateRecommendations(
    gapAnalysis: GapAnalysis,
    requirements: ComplianceRequirement[]
  ): Promise<Recommendation[]> {
    if (gapAnalysis.gaps.length === 0) {
      return [{
        id: 'compliance-achieved',
        title: 'Compliance Achieved',
        description: 'The document appears to meet all analyzed compliance requirements.',
        priority: 'low',
        category: 'maintenance',
        actionItems: ['Continue monitoring compliance status', 'Regular reviews recommended'],
      }];
    }

    const recommendations: Recommendation[] = [];
    
    // Group gaps by severity
    const gapsBySeverity = this.groupGapsBySeverity(gapAnalysis.gaps);

    for (const [severity, gaps] of Object.entries(gapsBySeverity)) {
      if (gaps.length === 0) continue;

      const recommendationPrompt = `
      Generate specific recommendations for addressing these compliance gaps:
      
      SEVERITY: ${severity}
      GAPS:
      ${gaps.map(gap => `- ${gap.description} (Requirement: ${gap.requirementId})`).join('\n')}
      
      Generate actionable recommendations in JSON format:
      {
        "recommendations": [
          {
            "title": "Clear, actionable recommendation title",
            "description": "Detailed description of what needs to be done",
            "priority": "low|medium|high|urgent",
            "category": "policy|procedure|control|training|technical",
            "actionItems": ["specific action 1", "specific action 2", "specific action 3"]
          }
        ]
      }
      
      Focus on:
      1. Practical, implementable solutions
      2. Cost-effective approaches
      3. Risk-based prioritization
      4. Clear action steps
      5. Timeline considerations
      `;

      try {
        const response = await this.modelProvider.analyze('', recommendationPrompt);
        const result = JSON.parse(response.analysis);

        if (result.recommendations && Array.isArray(result.recommendations)) {
          for (const rec of result.recommendations) {
            recommendations.push({
              id: `rec-${severity}-${recommendations.length}`,
              title: rec.title || 'Address Compliance Gap',
              description: rec.description || 'Review and address identified compliance gaps',
              priority: this.mapSeverityToPriority(severity),
              category: rec.category || 'general',
              actionItems: rec.actionItems || ['Review compliance requirements', 'Implement necessary controls'],
            });
          }
        }
      } catch (error) {
        logger.error(`❌ Failed to generate recommendations for ${severity} gaps:`, error);
        
        // Add fallback recommendation
        recommendations.push({
          id: `rec-${severity}-fallback`,
          title: `Address ${severity} Compliance Gaps`,
          description: `Review and address ${gaps.length} identified compliance gaps of ${severity} severity`,
          priority: this.mapSeverityToPriority(severity),
          category: 'general',
          actionItems: gaps.map(gap => `Address: ${gap.description}`),
        });
      }
    }

    return recommendations;
  }

  /**
   * Save analysis results to database
   */
  private async saveAnalysisToDatabase(
    document: Document,
    standards: ComplianceStandard[],
    score: number,
    gaps: ComplianceGap[],
    recommendations: Recommendation[],
    agentId: string,
    userId: string
  ): Promise<string> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Create analysis record
        const analysis = await tx.complianceAnalysis.create({
          data: {
            documentId: document.id,
            documentTitle: document.title || 'Untitled Document',
            documentContent: document.content.substring(0, 5000), // Store truncated content
            analysisType: 'DOCUMENT',
            overallScore: score,
            status: 'COMPLETED',
            agentId,
            userId,
            metadata: {
              standardsAnalyzed: standards.map(s => ({ id: s.id, name: s.name, version: s.version })),
              analysisDate: new Date().toISOString(),
            },
          },
        });

        // Create compliance gaps
        if (gaps.length > 0) {
          await tx.complianceGap.createMany({
            data: gaps.map(gap => ({
              analysisId: analysis.id,
              requirementId: gap.requirementId,
              description: gap.description,
              severity: gap.severity.toUpperCase() as any,
              evidence: gap.evidence,
              confidence: 0.8, // Default confidence
            })),
          });
        }

        // Create recommendations
        if (recommendations.length > 0) {
          await tx.complianceRecommendation.createMany({
            data: recommendations.map(rec => ({
              analysisId: analysis.id,
              title: rec.title,
              description: rec.description,
              priority: rec.priority.toUpperCase() as any,
              category: rec.category,
              actionItems: rec.actionItems,
            })),
          });
        }

        return analysis.id;
      });

      logger.info(`💾 Saved compliance analysis to database: ${result}`);
      return result;
    } catch (error) {
      logger.error('❌ Failed to save analysis to database:', error);
      throw error;
    }
  }

  /**
   * Utility functions
   */
  private mapRiskToSeverity(risk: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (risk.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private mapSeverityToPriority(severity: string): 'low' | 'medium' | 'high' | 'urgent' {
    switch (severity.toLowerCase()) {
      case 'critical': return 'urgent';
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private groupGapsBySeverity(gaps: ComplianceGap[]): Record<string, ComplianceGap[]> {
    return gaps.reduce((acc, gap) => {
      const severity = gap.severity;
      if (!acc[severity]) {
        acc[severity] = [];
      }
      acc[severity].push(gap);
      return acc;
    }, {} as Record<string, ComplianceGap[]>);
  }
}