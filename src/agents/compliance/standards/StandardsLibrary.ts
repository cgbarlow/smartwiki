/**
 * Standards Library for managing compliance standards and requirements
 */
import { 
  ComplianceStandard, 
  ComplianceRequirement, 
  ComplianceCategory,
  RequirementType,
  StandardApplicability 
} from '../../types/index.js';

export interface StandardsQuery {
  category?: ComplianceCategory;
  search?: string;
  organizationType?: string;
  industryVertical?: string;
  geographicRegion?: string;
  limit?: number;
  offset?: number;
}

export interface StandardsLibraryConfig {
  dataSource: 'memory' | 'database' | 'api';
  databaseUrl?: string;
  apiEndpoint?: string;
  cacheSize?: number;
  cacheTtl?: number;
}

export class StandardsLibrary {
  private standards: Map<string, ComplianceStandard> = new Map();
  private requirements: Map<string, ComplianceRequirement[]> = new Map();
  private cache: Map<string, any> = new Map();
  private config: StandardsLibraryConfig;

  constructor(config: StandardsLibraryConfig) {
    this.config = {
      cacheSize: 1000,
      cacheTtl: 3600000, // 1 hour
      ...config
    };

    // Initialize with common standards
    this.initializeDefaultStandards();
  }

  /**
   * Get a compliance standard by ID
   */
  async getStandard(id: string): Promise<ComplianceStandard | null> {
    // Check cache first
    const cacheKey = `standard:${id}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Get from memory store
    const standard = this.standards.get(id);
    
    if (standard) {
      this.setCache(cacheKey, standard);
    }

    return standard || null;
  }

  /**
   * Get requirements for a specific standard
   */
  async getRequirements(standardId: string): Promise<ComplianceRequirement[]> {
    const cacheKey = `requirements:${standardId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const requirements = this.requirements.get(standardId) || [];
    this.setCache(cacheKey, requirements);
    
    return requirements;
  }

  /**
   * Search for standards based on criteria
   */
  async searchStandards(query: StandardsQuery): Promise<ComplianceStandard[]> {
    let results = Array.from(this.standards.values());

    // Filter by category
    if (query.category) {
      results = results.filter(standard => standard.category === query.category);
    }

    // Filter by text search
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      results = results.filter(standard => 
        standard.name.toLowerCase().includes(searchLower) ||
        standard.shortName.toLowerCase().includes(searchLower) ||
        standard.description.toLowerCase().includes(searchLower)
      );
    }

    // Filter by applicability
    if (query.organizationType) {
      results = results.filter(standard => 
        standard.applicability.organizationTypes.includes(query.organizationType!)
      );
    }

    if (query.industryVertical) {
      results = results.filter(standard => 
        standard.applicability.industryVerticals.includes(query.industryVertical!)
      );
    }

    if (query.geographicRegion) {
      results = results.filter(standard => 
        standard.applicability.geographicRegions.includes(query.geographicRegion!)
      );
    }

    // Sort by relevance (name match first, then description)
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      results.sort((a, b) => {
        const aNameMatch = a.name.toLowerCase().includes(searchLower);
        const bNameMatch = b.name.toLowerCase().includes(searchLower);
        
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return a.name.localeCompare(b.name);
      });
    } else {
      results.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    
    return results.slice(offset, offset + limit);
  }

  /**
   * Get all available categories
   */
  getCategories(): ComplianceCategory[] {
    return ['security', 'privacy', 'financial', 'healthcare', 'quality', 'environmental', 'general'];
  }

  /**
   * Get standards by category
   */
  async getStandardsByCategory(category: ComplianceCategory): Promise<ComplianceStandard[]> {
    return this.searchStandards({ category });
  }

  /**
   * Add a new standard to the library
   */
  async addStandard(standard: ComplianceStandard): Promise<void> {
    // Validate standard
    this.validateStandard(standard);

    // Store standard
    this.standards.set(standard.id, standard);

    // Store requirements
    if (standard.requirements && standard.requirements.length > 0) {
      this.requirements.set(standard.id, standard.requirements);
    }

    // Clear related cache entries
    this.clearCachePattern(`standard:${standard.id}`);
    this.clearCachePattern(`requirements:${standard.id}`);
  }

  /**
   * Update an existing standard
   */
  async updateStandard(standard: ComplianceStandard): Promise<void> {
    if (!this.standards.has(standard.id)) {
      throw new Error(`Standard with ID ${standard.id} not found`);
    }

    await this.addStandard(standard);
  }

  /**
   * Remove a standard from the library
   */
  async removeStandard(standardId: string): Promise<void> {
    this.standards.delete(standardId);
    this.requirements.delete(standardId);
    
    // Clear cache
    this.clearCachePattern(`standard:${standardId}`);
    this.clearCachePattern(`requirements:${standardId}`);
  }

  /**
   * Get requirements by type
   */
  async getRequirementsByType(
    standardId: string, 
    type: RequirementType
  ): Promise<ComplianceRequirement[]> {
    const allRequirements = await this.getRequirements(standardId);
    return allRequirements.filter(req => req.type === type);
  }

  /**
   * Get requirements by criticality
   */
  async getRequirementsByCriticality(
    standardId: string,
    criticality: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<ComplianceRequirement[]> {
    const allRequirements = await this.getRequirements(standardId);
    return allRequirements.filter(req => req.criticality === criticality);
  }

  /**
   * Find related requirements across standards
   */
  async findRelatedRequirements(
    requirementId: string
  ): Promise<ComplianceRequirement[]> {
    const relatedRequirements: ComplianceRequirement[] = [];

    for (const [standardId, requirements] of this.requirements) {
      for (const requirement of requirements) {
        if (requirement.relatedRequirements.includes(requirementId)) {
          relatedRequirements.push(requirement);
        }
      }
    }

    return relatedRequirements;
  }

  /**
   * Get statistics about the standards library
   */
  getLibraryStats(): {
    totalStandards: number;
    totalRequirements: number;
    standardsByCategory: Record<ComplianceCategory, number>;
    requirementsByType: Record<RequirementType, number>;
    requirementsByCriticality: Record<string, number>;
  } {
    const stats = {
      totalStandards: this.standards.size,
      totalRequirements: 0,
      standardsByCategory: {} as Record<ComplianceCategory, number>,
      requirementsByType: {} as Record<RequirementType, number>,
      requirementsByCriticality: {} as Record<string, number>
    };

    // Initialize counters
    this.getCategories().forEach(category => {
      stats.standardsByCategory[category] = 0;
    });

    const requirementTypes: RequirementType[] = ['policy', 'procedure', 'control', 'documentation', 'training', 'technical', 'governance'];
    requirementTypes.forEach(type => {
      stats.requirementsByType[type] = 0;
    });

    ['low', 'medium', 'high', 'critical'].forEach(level => {
      stats.requirementsByCriticality[level] = 0;
    });

    // Count standards by category
    for (const standard of this.standards.values()) {
      stats.standardsByCategory[standard.category]++;
    }

    // Count requirements by type and criticality
    for (const requirements of this.requirements.values()) {
      stats.totalRequirements += requirements.length;
      
      for (const requirement of requirements) {
        stats.requirementsByType[requirement.type]++;
        stats.requirementsByCriticality[requirement.criticality]++;
      }
    }

    return stats;
  }

  /**
   * Initialize with default compliance standards
   */
  private initializeDefaultStandards(): void {
    const defaultStandards: ComplianceStandard[] = [
      {
        id: 'iso-27001',
        name: 'ISO/IEC 27001:2022 Information Security Management',
        shortName: 'ISO 27001',
        version: '2022',
        category: 'security',
        description: 'International standard for information security management systems (ISMS)',
        requirements: this.getISO27001Requirements(),
        lastUpdated: new Date('2022-10-01'),
        jurisdiction: ['Global'],
        applicability: {
          organizationTypes: ['enterprise', 'government', 'nonprofit'],
          industryVerticals: ['technology', 'financial', 'healthcare', 'manufacturing'],
          geographicRegions: ['Global'],
          companySize: ['small', 'medium', 'large'],
          conditions: []
        }
      },
      {
        id: 'gdpr',
        name: 'General Data Protection Regulation',
        shortName: 'GDPR',
        version: '2018',
        category: 'privacy',
        description: 'EU regulation for data protection and privacy',
        requirements: this.getGDPRRequirements(),
        lastUpdated: new Date('2018-05-25'),
        jurisdiction: ['EU', 'EEA'],
        applicability: {
          organizationTypes: ['enterprise', 'small-business', 'nonprofit'],
          industryVerticals: ['all'],
          geographicRegions: ['EU', 'EEA', 'Global'],
          companySize: ['small', 'medium', 'large'],
          conditions: ['processes_eu_data']
        }
      },
      {
        id: 'sox',
        name: 'Sarbanes-Oxley Act',
        shortName: 'SOX',
        version: '2002',
        category: 'financial',
        description: 'US federal law for corporate financial reporting and accountability',
        requirements: this.getSOXRequirements(),
        lastUpdated: new Date('2002-07-30'),
        jurisdiction: ['US'],
        applicability: {
          organizationTypes: ['public-company'],
          industryVerticals: ['all'],
          geographicRegions: ['US'],
          companySize: ['large'],
          conditions: ['publicly_traded']
        }
      }
    ];

    defaultStandards.forEach(standard => {
      this.standards.set(standard.id, standard);
      this.requirements.set(standard.id, standard.requirements);
    });
  }

  private getISO27001Requirements(): ComplianceRequirement[] {
    return [
      {
        id: 'iso27001-4.1',
        standardId: 'iso-27001',
        section: '4.1',
        title: 'Understanding the organization and its context',
        description: 'The organization shall determine external and internal issues relevant to its purpose and information security management system.',
        implementation: 'Document organizational context, stakeholder requirements, and scope of ISMS',
        evidence: ['Context analysis document', 'Stakeholder register', 'ISMS scope statement'],
        criticality: 'high',
        type: 'governance',
        tags: ['context', 'scope', 'stakeholders'],
        relatedRequirements: ['iso27001-4.2', 'iso27001-4.3'],
        auditQuestions: [
          'Has the organization documented its external and internal context?',
          'Are stakeholder requirements clearly identified?',
          'Is the ISMS scope appropriately defined?'
        ]
      },
      {
        id: 'iso27001-5.1',
        standardId: 'iso-27001',
        section: '5.1',
        title: 'Leadership and commitment',
        description: 'Top management shall demonstrate leadership and commitment with respect to the ISMS.',
        implementation: 'Establish information security policy, assign responsibilities, provide resources',
        evidence: ['Information security policy', 'Management commitment statement', 'Resource allocation records'],
        criticality: 'critical',
        type: 'governance',
        tags: ['leadership', 'policy', 'commitment'],
        relatedRequirements: ['iso27001-5.2', 'iso27001-5.3'],
        auditQuestions: [
          'Has top management demonstrated commitment to the ISMS?',
          'Is there an approved information security policy?',
          'Are adequate resources allocated to information security?'
        ]
      }
      // Additional requirements would be added here...
    ];
  }

  private getGDPRRequirements(): ComplianceRequirement[] {
    return [
      {
        id: 'gdpr-art5',
        standardId: 'gdpr',
        section: 'Article 5',
        title: 'Principles relating to processing of personal data',
        description: 'Personal data shall be processed lawfully, fairly and transparently.',
        implementation: 'Implement lawful basis for processing, ensure fair and transparent processing',
        evidence: ['Privacy notices', 'Lawful basis documentation', 'Processing records'],
        criticality: 'critical',
        type: 'policy',
        tags: ['principles', 'lawfulness', 'transparency'],
        relatedRequirements: ['gdpr-art6', 'gdpr-art13'],
        auditQuestions: [
          'Is there a lawful basis for all personal data processing?',
          'Are privacy notices clear and accessible?',
          'Is processing documented in records?'
        ]
      },
      {
        id: 'gdpr-art25',
        standardId: 'gdpr',
        section: 'Article 25',
        title: 'Data protection by design and by default',
        description: 'Implement appropriate technical and organizational measures to ensure data protection.',
        implementation: 'Integrate data protection into system design, implement privacy-preserving defaults',
        evidence: ['System design documentation', 'Privacy impact assessments', 'Default configuration settings'],
        criticality: 'high',
        type: 'technical',
        tags: ['privacy-by-design', 'technical-measures', 'defaults'],
        relatedRequirements: ['gdpr-art32', 'gdpr-art35'],
        auditQuestions: [
          'Are data protection measures built into system design?',
          'Are privacy-preserving settings the default?',
          'Have privacy impact assessments been conducted?'
        ]
      }
      // Additional GDPR requirements would be added here...
    ];
  }

  private getSOXRequirements(): ComplianceRequirement[] {
    return [
      {
        id: 'sox-302',
        standardId: 'sox',
        section: '302',
        title: 'Corporate responsibility for financial reports',
        description: 'CEOs and CFOs must certify the accuracy of financial statements and internal controls.',
        implementation: 'Establish certification process, document internal controls, quarterly attestation',
        evidence: ['CEO/CFO certifications', 'Internal control documentation', 'Quarterly attestations'],
        criticality: 'critical',
        type: 'governance',
        tags: ['certification', 'financial-reporting', 'internal-controls'],
        relatedRequirements: ['sox-404', 'sox-906'],
        auditQuestions: [
          'Do CEO and CFO certify financial statement accuracy?',
          'Are internal controls properly documented?',
          'Is the certification process followed quarterly?'
        ]
      },
      {
        id: 'sox-404',
        standardId: 'sox',
        section: '404',
        title: 'Assessment of internal control',
        description: 'Annual assessment of internal control over financial reporting effectiveness.',
        implementation: 'Document internal controls, conduct annual assessment, external auditor attestation',
        evidence: ['Internal control assessment', 'Management report', 'External auditor opinion'],
        criticality: 'critical',
        type: 'control',
        tags: ['internal-controls', 'assessment', 'financial-reporting'],
        relatedRequirements: ['sox-302', 'sox-906'],
        auditQuestions: [
          'Is there an annual internal control assessment?',
          'Has management reported on control effectiveness?',
          'Has the external auditor provided an attestation?'
        ]
      }
      // Additional SOX requirements would be added here...
    ];
  }

  private validateStandard(standard: ComplianceStandard): void {
    if (!standard.id || !standard.name || !standard.version) {
      throw new Error('Standard must have ID, name, and version');
    }

    if (!this.getCategories().includes(standard.category)) {
      throw new Error(`Invalid category: ${standard.category}`);
    }

    if (standard.requirements) {
      for (const requirement of standard.requirements) {
        this.validateRequirement(requirement);
      }
    }
  }

  private validateRequirement(requirement: ComplianceRequirement): void {
    if (!requirement.id || !requirement.standardId || !requirement.title) {
      throw new Error('Requirement must have ID, standardId, and title');
    }

    const validTypes: RequirementType[] = ['policy', 'procedure', 'control', 'documentation', 'training', 'technical', 'governance'];
    if (!validTypes.includes(requirement.type)) {
      throw new Error(`Invalid requirement type: ${requirement.type}`);
    }

    const validCriticalities = ['low', 'medium', 'high', 'critical'];
    if (!validCriticalities.includes(requirement.criticality)) {
      throw new Error(`Invalid criticality: ${requirement.criticality}`);
    }
  }

  private setCache(key: string, value: any): void {
    // Simple LRU-like cache management
    if (this.cache.size >= (this.config.cacheSize || 1000)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  private clearCachePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}