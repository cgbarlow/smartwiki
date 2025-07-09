import { ComplianceStandard, ComplianceRequirement } from '../../types';
import { prisma } from '../../../config/database';
import { logger } from '../../../utils/logger';

/**
 * Standards Library for managing compliance standards and requirements
 */
export class StandardsLibrary {
  private cache: Map<string, ComplianceStandard> = new Map();
  private requirementsCache: Map<string, ComplianceRequirement[]> = new Map();

  /**
   * Get a compliance standard by ID
   */
  async getStandard(id: string): Promise<ComplianceStandard | null> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    try {
      const dbStandard = await prisma.complianceStandard.findUnique({
        where: { id },
        include: {
          requirements: true,
        },
      });

      if (!dbStandard) {
        return null;
      }

      const standard: ComplianceStandard = {
        id: dbStandard.id,
        name: dbStandard.name,
        version: dbStandard.version,
        category: dbStandard.category.toLowerCase() as any,
        description: dbStandard.description,
        requirements: dbStandard.requirements.map(req => ({
          id: req.id,
          standardId: req.standardId,
          section: req.section,
          title: req.title,
          description: req.description,
          criticality: req.criticality.toLowerCase() as any,
          tags: req.tags,
          relatedRequirements: req.relatedRequirements,
        })),
      };

      // Cache the result
      this.cache.set(id, standard);
      return standard;
    } catch (error) {
      logger.error(`❌ Failed to get standard ${id}:`, error);
      return null;
    }
  }

  /**
   * Get requirements for a specific standard
   */
  async getRequirements(standardId: string): Promise<ComplianceRequirement[]> {
    // Check cache first
    if (this.requirementsCache.has(standardId)) {
      return this.requirementsCache.get(standardId)!;
    }

    try {
      const dbRequirements = await prisma.complianceRequirement.findMany({
        where: { standardId },
        orderBy: { section: 'asc' },
      });

      const requirements: ComplianceRequirement[] = dbRequirements.map(req => ({
        id: req.id,
        standardId: req.standardId,
        section: req.section,
        title: req.title,
        description: req.description,
        criticality: req.criticality.toLowerCase() as any,
        tags: req.tags,
        relatedRequirements: req.relatedRequirements,
      }));

      // Cache the result
      this.requirementsCache.set(standardId, requirements);
      return requirements;
    } catch (error) {
      logger.error(`❌ Failed to get requirements for standard ${standardId}:`, error);
      return [];
    }
  }

  /**
   * Search standards by name or description
   */
  async searchStandards(query: string): Promise<ComplianceStandard[]> {
    try {
      const dbStandards = await prisma.complianceStandard.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
          isActive: true,
        },
        include: {
          requirements: true,
        },
        orderBy: { name: 'asc' },
      });

      return dbStandards.map(dbStandard => ({
        id: dbStandard.id,
        name: dbStandard.name,
        version: dbStandard.version,
        category: dbStandard.category.toLowerCase() as any,
        description: dbStandard.description,
        requirements: dbStandard.requirements.map(req => ({
          id: req.id,
          standardId: req.standardId,
          section: req.section,
          title: req.title,
          description: req.description,
          criticality: req.criticality.toLowerCase() as any,
          tags: req.tags,
          relatedRequirements: req.relatedRequirements,
        })),
      }));
    } catch (error) {
      logger.error(`❌ Failed to search standards with query "${query}":`, error);
      return [];
    }
  }

  /**
   * Get standards by category
   */
  async getStandardsByCategory(category: string): Promise<ComplianceStandard[]> {
    try {
      const dbStandards = await prisma.complianceStandard.findMany({
        where: {
          category: category.toUpperCase() as any,
          isActive: true,
        },
        include: {
          requirements: true,
        },
        orderBy: { name: 'asc' },
      });

      return dbStandards.map(dbStandard => ({
        id: dbStandard.id,
        name: dbStandard.name,
        version: dbStandard.version,
        category: dbStandard.category.toLowerCase() as any,
        description: dbStandard.description,
        requirements: dbStandard.requirements.map(req => ({
          id: req.id,
          standardId: req.standardId,
          section: req.section,
          title: req.title,
          description: req.description,
          criticality: req.criticality.toLowerCase() as any,
          tags: req.tags,
          relatedRequirements: req.relatedRequirements,
        })),
      }));
    } catch (error) {
      logger.error(`❌ Failed to get standards by category "${category}":`, error);
      return [];
    }
  }

  /**
   * Add a new compliance standard
   */
  async addStandard(standard: Omit<ComplianceStandard, 'id'>): Promise<string | null> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Create the standard
        const dbStandard = await tx.complianceStandard.create({
          data: {
            name: standard.name,
            version: standard.version,
            category: standard.category.toUpperCase() as any,
            description: standard.description,
            isActive: true,
          },
        });

        // Create the requirements
        if (standard.requirements.length > 0) {
          await tx.complianceRequirement.createMany({
            data: standard.requirements.map(req => ({
              standardId: dbStandard.id,
              section: req.section,
              title: req.title,
              description: req.description,
              criticality: req.criticality.toUpperCase() as any,
              tags: req.tags,
              relatedRequirements: req.relatedRequirements,
            })),
          });
        }

        return dbStandard.id;
      });

      // Clear cache to force refresh
      this.clearCache();

      logger.info(`✅ Added new compliance standard: ${standard.name} (${result})`);
      return result;
    } catch (error) {
      logger.error(`❌ Failed to add standard "${standard.name}":`, error);
      return null;
    }
  }

  /**
   * Update an existing standard
   */
  async updateStandard(id: string, updates: Partial<ComplianceStandard>): Promise<boolean> {
    try {
      await prisma.complianceStandard.update({
        where: { id },
        data: {
          ...(updates.name && { name: updates.name }),
          ...(updates.version && { version: updates.version }),
          ...(updates.category && { category: updates.category.toUpperCase() as any }),
          ...(updates.description && { description: updates.description }),
        },
      });

      // Clear cache to force refresh
      this.cache.delete(id);
      this.requirementsCache.delete(id);

      logger.info(`🔧 Updated compliance standard: ${id}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to update standard ${id}:`, error);
      return false;
    }
  }

  /**
   * Get all available standards
   */
  async getAllStandards(): Promise<ComplianceStandard[]> {
    try {
      const dbStandards = await prisma.complianceStandard.findMany({
        where: { isActive: true },
        include: {
          requirements: true,
        },
        orderBy: { name: 'asc' },
      });

      return dbStandards.map(dbStandard => ({
        id: dbStandard.id,
        name: dbStandard.name,
        version: dbStandard.version,
        category: dbStandard.category.toLowerCase() as any,
        description: dbStandard.description,
        requirements: dbStandard.requirements.map(req => ({
          id: req.id,
          standardId: req.standardId,
          section: req.section,
          title: req.title,
          description: req.description,
          criticality: req.criticality.toLowerCase() as any,
          tags: req.tags,
          relatedRequirements: req.relatedRequirements,
        })),
      }));
    } catch (error) {
      logger.error('❌ Failed to get all standards:', error);
      return [];
    }
  }

  /**
   * Initialize with default compliance standards
   */
  async initializeDefaultStandards(): Promise<void> {
    try {
      const existingCount = await prisma.complianceStandard.count();
      
      if (existingCount > 0) {
        logger.info(`📋 Standards library already initialized with ${existingCount} standards`);
        return;
      }

      // Add default standards
      await this.addDefaultStandards();
      
      logger.info('🚀 Standards library initialized with default standards');
    } catch (error) {
      logger.error('❌ Failed to initialize default standards:', error);
    }
  }

  /**
   * Add default compliance standards (SOX, GDPR, HIPAA, etc.)
   */
  private async addDefaultStandards(): Promise<void> {
    const defaultStandards: Omit<ComplianceStandard, 'id'>[] = [
      {
        name: 'SOX',
        version: '2002',
        category: 'financial',
        description: 'Sarbanes-Oxley Act - Financial reporting and corporate governance standards',
        requirements: [
          {
            id: 'sox-302',
            standardId: '',
            section: '302',
            title: 'Corporate Responsibility for Financial Reports',
            description: 'Principal executive and financial officers must certify financial reports',
            criticality: 'critical',
            tags: ['certification', 'financial-reports', 'executive-responsibility'],
            relatedRequirements: ['sox-404'],
          },
          {
            id: 'sox-404',
            standardId: '',
            section: '404',
            title: 'Management Assessment of Internal Controls',
            description: 'Annual internal control report and assessment required',
            criticality: 'critical',
            tags: ['internal-controls', 'assessment', 'annual-report'],
            relatedRequirements: ['sox-302'],
          },
        ],
      },
      {
        name: 'GDPR',
        version: '2018',
        category: 'privacy',
        description: 'General Data Protection Regulation - EU data protection and privacy law',
        requirements: [
          {
            id: 'gdpr-art6',
            standardId: '',
            section: 'Article 6',
            title: 'Lawfulness of Processing',
            description: 'Personal data processing must have lawful basis',
            criticality: 'critical',
            tags: ['lawfulness', 'processing', 'consent'],
            relatedRequirements: ['gdpr-art7'],
          },
          {
            id: 'gdpr-art7',
            standardId: '',
            section: 'Article 7',
            title: 'Conditions for Consent',
            description: 'Clear and specific consent requirements',
            criticality: 'high',
            tags: ['consent', 'conditions', 'clear'],
            relatedRequirements: ['gdpr-art6'],
          },
        ],
      },
      {
        name: 'HIPAA',
        version: '1996',
        category: 'healthcare',
        description: 'Health Insurance Portability and Accountability Act - Healthcare data protection',
        requirements: [
          {
            id: 'hipaa-safeguards',
            standardId: '',
            section: '164.308',
            title: 'Administrative Safeguards',
            description: 'Implement administrative safeguards to protect PHI',
            criticality: 'critical',
            tags: ['administrative', 'safeguards', 'phi'],
            relatedRequirements: ['hipaa-physical'],
          },
          {
            id: 'hipaa-physical',
            standardId: '',
            section: '164.310',
            title: 'Physical Safeguards',
            description: 'Physical access controls and workstation security',
            criticality: 'high',
            tags: ['physical', 'access-control', 'workstation'],
            relatedRequirements: ['hipaa-safeguards'],
          },
        ],
      },
    ];

    for (const standard of defaultStandards) {
      await this.addStandard(standard);
    }
  }

  /**
   * Clear all caches
   */
  private clearCache(): void {
    this.cache.clear();
    this.requirementsCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    standardsCached: number;
    requirementsCached: number;
  } {
    return {
      standardsCached: this.cache.size,
      requirementsCached: this.requirementsCache.size,
    };
  }
}