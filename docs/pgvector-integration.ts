// SmartWiki pgvector Integration - Complete TypeScript Implementation
// This file demonstrates production-ready integration patterns for pgvector

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { BedrockEmbeddings } from '@langchain/community/embeddings/bedrock'
import { BedrockChat } from '@langchain/community/chat_models/bedrock'
import { Redis } from 'ioredis'
import { z } from 'zod'

// Type definitions for SmartWiki
export interface Document {
  id: string
  title: string
  content: string
  summary?: string
  embedding: number[]
  tenantId: string
  userId: string
  documentType: 'policy' | 'procedure' | 'regulation' | 'standard' | 'guideline' | 'memo' | 'report'
  metadata: {
    department?: string
    complianceTags?: string[]
    classification?: 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret'
    wordCount?: number
    language?: string
    lastReviewed?: string
    reviewedBy?: string
    version?: number
    relatedDocuments?: string[]
  }
  classification: string
  status: 'active' | 'archived' | 'deleted' | 'under_review'
  filePath?: string
  fileSize?: number
  fileType?: string
  checksum?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
  version: number
  previousVersionId?: string
  complianceScore: number
  lastComplianceCheck?: string
  complianceStatus: 'pending' | 'compliant' | 'non_compliant' | 'review_required'
}

export interface SearchOptions {
  complianceStandards?: string[]
  departments?: string[]
  classification?: string
  documentTypes?: string[]
  dateRange?: {
    start: string
    end: string
  }
  limit?: number
  threshold?: number
  includeChunks?: boolean
  hybridSearch?: boolean
  textWeight?: number
  vectorWeight?: number
}

export interface SearchResult {
  id: string
  title: string
  content: string
  snippet: string
  similarity: number
  metadata: Record<string, any>
  documentType: string
  classification: string
  complianceScore: number
  createdAt: string
  chunks?: ChunkResult[]
}

export interface ChunkResult {
  id: string
  text: string
  similarity: number
  chunkIndex: number
  metadata: Record<string, any>
}

export interface ComplianceAnalysis {
  documentId: string
  standardId: string
  overallScore: number
  gaps: ComplianceGap[]
  recommendations: ComplianceRecommendation[]
  assessedAt: string
  assessedBy: string
}

export interface ComplianceGap {
  requirementId: string
  requirementText: string
  similarity: number
  status: 'compliant' | 'partial' | 'non_compliant'
  evidence?: string
  confidence: number
}

export interface ComplianceRecommendation {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  actionItems: string[]
}

// Main SmartWiki Vector Service
export class SmartWikiVectorService {
  private supabase: SupabaseClient
  private redis: Redis
  private embeddings: BedrockEmbeddings
  private chat: BedrockChat
  private cachePrefix = 'smartwiki:vector:'

  constructor({
    supabaseUrl,
    supabaseKey,
    redisUrl,
    awsRegion = 'us-east-1'
  }: {
    supabaseUrl: string
    supabaseKey: string
    redisUrl: string
    awsRegion?: string
  }) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.redis = new Redis(redisUrl)
    
    this.embeddings = new BedrockEmbeddings({
      region: awsRegion,
      model: 'amazon.titan-embed-text-v1',
      maxConcurrency: 10
    })
    
    this.chat = new BedrockChat({
      region: awsRegion,
      model: 'anthropic.claude-3-sonnet-20240229-v1:0',
      maxTokens: 2000
    })
  }

  // Set tenant context for RLS
  async setTenantContext(tenantId: string, userId: string, userRole: string, userClearance: number, department?: string) {
    const promises = [
      this.supabase.rpc('set_config', {
        setting_name: 'app.current_tenant_id',
        new_value: tenantId,
        is_local: true
      }),
      this.supabase.rpc('set_config', {
        setting_name: 'app.current_user_id',
        new_value: userId,
        is_local: true
      }),
      this.supabase.rpc('set_config', {
        setting_name: 'app.user_role',
        new_value: userRole,
        is_local: true
      }),
      this.supabase.rpc('set_config', {
        setting_name: 'app.user_clearance',
        new_value: userClearance.toString(),
        is_local: true
      })
    ]

    if (department) {
      promises.push(
        this.supabase.rpc('set_config', {
          setting_name: 'app.current_department',
          new_value: department,
          is_local: true
        })
      )
    }

    await Promise.all(promises)
  }

  // Index a single document
  async indexDocument(document: Omit<Document, 'id' | 'embedding' | 'createdAt' | 'updatedAt'>): Promise<Document> {
    // Generate embedding
    const text = `${document.title}\n\n${document.content}`
    const embedding = await this.embeddings.embedQuery(text)

    // Calculate compliance score (simplified)
    const complianceScore = await this.calculateComplianceScore(document.content, document.metadata.complianceTags || [])

    const documentData = {
      ...document,
      embedding,
      complianceScore,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single()

    if (error) throw error

    // Index chunks if document is large
    if (document.content.length > 2000) {
      await this.indexDocumentChunks(data.id, document.content, document.tenantId)
    }

    // Invalidate cache
    await this.invalidateCache(document.tenantId)

    return data
  }

  // Index document chunks for large documents
  private async indexDocumentChunks(documentId: string, content: string, tenantId: string) {
    const chunkSize = 500
    const overlap = 100
    const chunks = this.createChunks(content, chunkSize, overlap)

    const chunkPromises = chunks.map(async (chunk, index) => {
      const embedding = await this.embeddings.embedQuery(chunk)
      
      return {
        documentId,
        chunkIndex: index,
        chunkText: chunk,
        chunkEmbedding: embedding,
        chunkMetadata: {
          wordCount: chunk.split(' ').length,
          charCount: chunk.length,
          position: index * (chunkSize - overlap)
        },
        tenantId
      }
    })

    const chunkData = await Promise.all(chunkPromises)

    const { error } = await this.supabase
      .from('document_chunks')
      .insert(chunkData)

    if (error) throw error
  }

  // Create text chunks with overlap
  private createChunks(text: string, chunkSize: number, overlap: number): string[] {
    const words = text.split(' ')
    const chunks: string[] = []
    
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ')
      chunks.push(chunk)
    }
    
    return chunks
  }

  // Batch index multiple documents
  async indexDocuments(documents: Omit<Document, 'id' | 'embedding' | 'createdAt' | 'updatedAt'>[]): Promise<Document[]> {
    const batchSize = 50
    const results: Document[] = []

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize)
      const batchResults = await this.processBatch(batch)
      results.push(...batchResults)
    }

    return results
  }

  private async processBatch(batch: Omit<Document, 'id' | 'embedding' | 'createdAt' | 'updatedAt'>[]): Promise<Document[]> {
    // Generate embeddings for batch
    const texts = batch.map(doc => `${doc.title}\n\n${doc.content}`)
    const embeddings = await this.embeddings.embedDocuments(texts)

    // Calculate compliance scores
    const complianceScores = await Promise.all(
      batch.map(doc => this.calculateComplianceScore(doc.content, doc.metadata.complianceTags || []))
    )

    // Prepare data for insertion
    const insertData = batch.map((doc, index) => ({
      ...doc,
      embedding: embeddings[index],
      complianceScore: complianceScores[index],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))

    const { data, error } = await this.supabase
      .from('documents')
      .insert(insertData)
      .select()

    if (error) throw error

    return data
  }

  // Semantic search with advanced filtering
  async searchDocuments(
    query: string,
    tenantId: string,
    options: SearchOptions = {}
  ): Promise<{
    results: SearchResult[]
    totalResults: number
    searchTime: number
    fromCache: boolean
  }> {
    const startTime = Date.now()
    
    // Check cache first
    const cacheKey = this.getCacheKey(query, tenantId, options)
    const cachedResults = await this.redis.get(cacheKey)
    
    if (cachedResults) {
      return {
        ...JSON.parse(cachedResults),
        fromCache: true
      }
    }

    // Generate query embedding
    const queryEmbedding = await this.embeddings.embedQuery(query)

    let results: SearchResult[]

    if (options.hybridSearch) {
      results = await this.hybridSearch(query, queryEmbedding, tenantId, options)
    } else {
      results = await this.vectorSearch(queryEmbedding, tenantId, options)
    }

    // Add snippets to results
    const enrichedResults = results.map(result => ({
      ...result,
      snippet: this.extractSnippet(result.content, query)
    }))

    // Include chunks if requested
    if (options.includeChunks) {
      for (const result of enrichedResults) {
        result.chunks = await this.searchChunks(result.id, queryEmbedding, 3)
      }
    }

    const response = {
      results: enrichedResults,
      totalResults: enrichedResults.length,
      searchTime: Date.now() - startTime,
      fromCache: false
    }

    // Cache results for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(response))

    return response
  }

  private async vectorSearch(
    queryEmbedding: number[],
    tenantId: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const { data, error } = await this.supabase
      .rpc('semantic_search', {
        query_embedding: queryEmbedding,
        tenant_filter: tenantId,
        document_types: options.documentTypes || null,
        classification_filter: options.classification || null,
        compliance_filter: options.complianceStandards || null,
        match_threshold: options.threshold || 0.7,
        match_count: options.limit || 10
      })

    if (error) throw error

    return data.map((item: any) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      snippet: '',
      similarity: item.similarity,
      metadata: item.metadata,
      documentType: item.document_type,
      classification: item.classification,
      complianceScore: item.compliance_score,
      createdAt: item.created_at
    }))
  }

  private async hybridSearch(
    query: string,
    queryEmbedding: number[],
    tenantId: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const { data, error } = await this.supabase
      .rpc('hybrid_search', {
        query_text: query,
        query_embedding: queryEmbedding,
        tenant_filter: tenantId,
        match_count: options.limit || 10,
        vector_weight: options.vectorWeight || 0.7,
        text_weight: options.textWeight || 0.3
      })

    if (error) throw error

    return data.map((item: any) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      snippet: '',
      similarity: item.vector_similarity,
      metadata: item.metadata,
      documentType: item.document_type,
      classification: item.classification,
      complianceScore: item.compliance_score,
      createdAt: item.created_at
    }))
  }

  // Search document chunks
  private async searchChunks(
    documentId: string,
    queryEmbedding: number[],
    limit: number = 3
  ): Promise<ChunkResult[]> {
    const { data, error } = await this.supabase
      .from('document_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_embedding <-> ' + JSON.stringify(queryEmbedding) as any)
      .limit(limit)

    if (error) throw error

    return data.map((chunk: any) => ({
      id: chunk.id,
      text: chunk.chunk_text,
      similarity: 1 - chunk.similarity,
      chunkIndex: chunk.chunk_index,
      metadata: chunk.chunk_metadata
    }))
  }

  // RAG query with context
  async ragQuery(
    query: string,
    tenantId: string,
    options: SearchOptions = {}
  ): Promise<{
    answer: string
    sources: SearchResult[]
    confidence: number
  }> {
    // Get relevant documents
    const searchResults = await this.searchDocuments(query, tenantId, {
      ...options,
      limit: 5
    })

    // Build context from search results
    const context = searchResults.results
      .map(doc => `Document: ${doc.title}\n${doc.content}`)
      .join('\n\n')

    // Generate answer using LLM
    const prompt = `Based on the following compliance documents, answer the user's question. Be specific and cite the relevant documents.

Context:
${context}

Question: ${query}

Answer:`

    const response = await this.chat.invoke([
      { role: 'user', content: prompt }
    ])

    // Calculate confidence based on source relevance
    const avgSimilarity = searchResults.results.reduce((sum, doc) => sum + doc.similarity, 0) / searchResults.results.length
    const confidence = Math.min(avgSimilarity * 100, 95)

    return {
      answer: response.content as string,
      sources: searchResults.results,
      confidence
    }
  }

  // Compliance analysis
  async analyzeCompliance(
    documentId: string,
    standardId: string,
    userId: string
  ): Promise<ComplianceAnalysis> {
    // Get document and standard
    const [document, standard] = await Promise.all([
      this.getDocument(documentId),
      this.getComplianceStandard(standardId)
    ])

    // Analyze gaps using database function
    const { data: gapAnalysis, error } = await this.supabase
      .rpc('analyze_compliance_gaps', {
        doc_id: documentId,
        standard_id: standardId
      })

    if (error) throw error

    // Generate recommendations using AI
    const recommendations = await this.generateComplianceRecommendations(
      document.content,
      gapAnalysis,
      standard
    )

    // Calculate overall score
    const overallScore = this.calculateOverallComplianceScore(gapAnalysis)

    // Save analysis
    const analysis: ComplianceAnalysis = {
      documentId,
      standardId,
      overallScore,
      gaps: gapAnalysis,
      recommendations,
      assessedAt: new Date().toISOString(),
      assessedBy: userId
    }

    const { error: saveError } = await this.supabase
      .from('document_compliance')
      .upsert({
        document_id: documentId,
        standard_id: standardId,
        compliance_score: overallScore,
        gap_analysis: gapAnalysis,
        recommendations,
        assessed_at: new Date().toISOString(),
        assessed_by: userId,
        tenant_id: document.tenantId
      })

    if (saveError) throw saveError

    return analysis
  }

  // Update document
  async updateDocument(
    documentId: string,
    updates: Partial<Document>
  ): Promise<Document> {
    let newEmbedding: number[] | undefined

    // Regenerate embedding if content changed
    if (updates.content || updates.title) {
      const text = `${updates.title || ''}\n\n${updates.content || ''}`
      newEmbedding = await this.embeddings.embedQuery(text)
    }

    const updateData = {
      ...updates,
      ...(newEmbedding && { embedding: newEmbedding }),
      updatedAt: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single()

    if (error) throw error

    // Update chunks if content changed
    if (updates.content) {
      await this.updateDocumentChunks(documentId, updates.content, data.tenantId)
    }

    // Invalidate cache
    await this.invalidateCache(data.tenantId)

    return data
  }

  // Delete document
  async deleteDocument(documentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('documents')
      .update({ status: 'deleted' })
      .eq('id', documentId)

    if (error) throw error

    // Invalidate cache
    const document = await this.getDocument(documentId)
    await this.invalidateCache(document.tenantId)
  }

  // Performance monitoring
  async getPerformanceMetrics(tenantId: string): Promise<{
    documentCount: number
    averageQueryTime: number
    cacheHitRate: number
    complianceScore: number
  }> {
    const { data: stats, error } = await this.supabase
      .from('document_statistics')
      .select('*')
      .eq('tenant_id', tenantId)

    if (error) throw error

    const documentCount = stats.reduce((sum, stat) => sum + stat.document_count, 0)
    const avgComplianceScore = stats.reduce((sum, stat) => sum + stat.avg_compliance_score, 0) / stats.length

    // Get cache metrics from Redis
    const cacheInfo = await this.redis.info('stats')
    const cacheHitRate = this.parseCacheHitRate(cacheInfo)

    return {
      documentCount,
      averageQueryTime: 45, // Placeholder - implement actual timing
      cacheHitRate,
      complianceScore: avgComplianceScore
    }
  }

  // Helper methods
  private getCacheKey(query: string, tenantId: string, options: SearchOptions): string {
    const optionsStr = JSON.stringify(options)
    return `${this.cachePrefix}${tenantId}:${Buffer.from(query + optionsStr).toString('base64')}`
  }

  private async invalidateCache(tenantId: string): Promise<void> {
    const pattern = `${this.cachePrefix}${tenantId}:*`
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }

  private extractSnippet(content: string, query: string, length: number = 200): string {
    const queryTerms = query.toLowerCase().split(' ')
    const contentLower = content.toLowerCase()
    
    let bestIndex = 0
    let bestScore = 0
    
    for (const term of queryTerms) {
      const index = contentLower.indexOf(term)
      if (index !== -1) {
        const score = term.length / (index + 1)
        if (score > bestScore) {
          bestScore = score
          bestIndex = Math.max(0, index - 50)
        }
      }
    }
    
    return content.substring(bestIndex, bestIndex + length) + '...'
  }

  private async calculateComplianceScore(content: string, complianceTags: string[]): Promise<number> {
    // Simplified compliance scoring
    // In practice, this would use ML models or rule-based systems
    const baseScore = 0.5
    const tagBonus = complianceTags.length * 0.1
    const contentBonus = content.length > 1000 ? 0.2 : 0.1
    
    return Math.min(baseScore + tagBonus + contentBonus, 1.0)
  }

  private async getDocument(documentId: string): Promise<Document> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error) throw error
    return data
  }

  private async getComplianceStandard(standardId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('compliance_standards')
      .select('*')
      .eq('id', standardId)
      .single()

    if (error) throw error
    return data
  }

  private async generateComplianceRecommendations(
    content: string,
    gapAnalysis: any,
    standard: any
  ): Promise<ComplianceRecommendation[]> {
    // Generate AI-powered recommendations
    const prompt = `Based on the compliance gap analysis, provide specific recommendations for improving compliance with ${standard.name}.

Gap Analysis: ${JSON.stringify(gapAnalysis)}

Provide 3-5 specific, actionable recommendations in JSON format.`

    const response = await this.chat.invoke([
      { role: 'user', content: prompt }
    ])

    try {
      return JSON.parse(response.content as string)
    } catch {
      // Fallback to basic recommendations
      return [
        {
          title: 'Review compliance requirements',
          description: 'Conduct a detailed review of all compliance requirements',
          priority: 'high' as const,
          category: 'review',
          actionItems: ['Schedule compliance review meeting', 'Assign compliance officer']
        }
      ]
    }
  }

  private calculateOverallComplianceScore(gapAnalysis: any[]): number {
    const compliantCount = gapAnalysis.filter(gap => gap.status === 'compliant').length
    return compliantCount / gapAnalysis.length
  }

  private parseCacheHitRate(cacheInfo: string): number {
    // Parse Redis cache hit rate from info stats
    const hitRateMatch = cacheInfo.match(/keyspace_hits:(\d+)/)
    const missRateMatch = cacheInfo.match(/keyspace_misses:(\d+)/)
    
    if (hitRateMatch && missRateMatch) {
      const hits = parseInt(hitRateMatch[1])
      const misses = parseInt(missRateMatch[1])
      return hits / (hits + misses)
    }
    
    return 0
  }

  private async updateDocumentChunks(documentId: string, content: string, tenantId: string): Promise<void> {
    // Delete existing chunks
    await this.supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId)

    // Create new chunks
    if (content.length > 2000) {
      await this.indexDocumentChunks(documentId, content, tenantId)
    }
  }
}

// Usage example
export class SmartWikiService {
  private vectorService: SmartWikiVectorService

  constructor(config: {
    supabaseUrl: string
    supabaseKey: string
    redisUrl: string
    awsRegion?: string
  }) {
    this.vectorService = new SmartWikiVectorService(config)
  }

  async initializeForTenant(tenantId: string, userId: string, userRole: string, userClearance: number, department?: string) {
    await this.vectorService.setTenantContext(tenantId, userId, userRole, userClearance, department)
  }

  async uploadDocument(document: Omit<Document, 'id' | 'embedding' | 'createdAt' | 'updatedAt'>): Promise<Document> {
    return this.vectorService.indexDocument(document)
  }

  async searchDocuments(query: string, tenantId: string, options?: SearchOptions) {
    return this.vectorService.searchDocuments(query, tenantId, options)
  }

  async askQuestion(question: string, tenantId: string, options?: SearchOptions) {
    return this.vectorService.ragQuery(question, tenantId, options)
  }

  async analyzeCompliance(documentId: string, standardId: string, userId: string) {
    return this.vectorService.analyzeCompliance(documentId, standardId, userId)
  }

  async getMetrics(tenantId: string) {
    return this.vectorService.getPerformanceMetrics(tenantId)
  }
}

// Export for use in SmartWiki application
export default SmartWikiService