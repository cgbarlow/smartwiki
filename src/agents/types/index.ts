/**
 * Core type definitions for the SmartWiki Agent System
 */

// Base interfaces for all agents
export interface AgentBase {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'processing' | 'error';
  version: string;
  created: Date;
  updated: Date;
}

// Model provider interfaces
export interface ModelProvider {
  name: string;
  version: string;
  maxTokens: number;
  supportedFeatures: ModelFeature[];
  
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  embed(text: string): Promise<EmbeddingResponse>;
  analyze(document: string, prompt: string): Promise<AnalysisResponse>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
}

export interface ChatResponse {
  message: string;
  usage: TokenUsage;
  model: string;
  timestamp: Date;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: TokenUsage;
}

export interface AnalysisResponse {
  analysis: string;
  confidence: number;
  usage: TokenUsage;
  metadata?: Record<string, any>;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type ModelFeature = 'chat' | 'completion' | 'embedding' | 'structured_output' | 'function_calling';

// Compliance-specific interfaces
export interface ComplianceAgent extends AgentBase {
  type: 'compliance';
  capabilities: ComplianceCapabilities;
  config: ComplianceConfig;
  context: ComplianceContext;
  memory: AgentMemory;
}

export interface ComplianceCapabilities {
  documentAnalysis: boolean;
  standardsComparison: boolean;
  gapIdentification: boolean;
  reportGeneration: boolean;
  riskAssessment: boolean;
  batchProcessing: boolean;
}

export interface ComplianceConfig {
  modelProvider: string;
  modelVersion: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  complianceFrameworks: string[];
  analysisDepth: 'basic' | 'detailed' | 'comprehensive';
  riskTolerance: 'low' | 'medium' | 'high';
}

export interface ComplianceContext {
  currentDocument?: DocumentMetadata;
  selectedStandards: ComplianceStandard[];
  analysisHistory: AnalysisResult[];
  userPreferences: UserPreferences;
  tenantId: string;
}

export interface AgentMemory {
  conversations: ConversationHistory[];
  documentCache: Map<string, DocumentAnalysis>;
  standardsCache: Map<string, StandardDefinition>;
  patterns: LearnedPattern[];
  maxSize: number;
  currentSize: number;
}

// Document and analysis interfaces
export interface DocumentMetadata {
  id: string;
  tenantId: string;
  title: string;
  filename: string;
  contentType: string;
  size: number;
  uploadDate: Date;
  lastModified: Date;
  tags: string[];
  author?: string;
  version?: string;
  checksum: string;
}

export interface DocumentAnalysis {
  documentId: string;
  structure: DocumentStructure;
  content: ProcessedContent;
  metadata: AnalysisMetadata;
  cached: boolean;
  cacheExpiry: Date;
}

export interface DocumentStructure {
  sections: DocumentSection[];
  policies: PolicyStatement[];
  procedures: ProcedureStep[];
  controls: ControlMeasure[];
  roles: RoleDefinition[];
  references: DocumentReference[];
}

export interface DocumentSection {
  id: string;
  title: string;
  level: number;
  content: string;
  subsections: DocumentSection[];
  pageNumber?: number;
  wordCount: number;
}

export interface PolicyStatement {
  id: string;
  title: string;
  content: string;
  category: string;
  severity: 'informational' | 'low' | 'medium' | 'high' | 'critical';
  effectiveDate?: Date;
  reviewDate?: Date;
}

export interface ProcedureStep {
  id: string;
  title: string;
  description: string;
  order: number;
  required: boolean;
  owner?: string;
  inputs: string[];
  outputs: string[];
  controls: string[];
}

export interface ControlMeasure {
  id: string;
  title: string;
  description: string;
  type: 'preventive' | 'detective' | 'corrective';
  category: string;
  effectiveness: 'low' | 'medium' | 'high';
  frequency: string;
  owner?: string;
  evidence?: string[];
}

export interface RoleDefinition {
  id: string;
  title: string;
  description: string;
  responsibilities: string[];
  authority: string[];
  qualifications: string[];
  reporting: string[];
}

export interface DocumentReference {
  id: string;
  title: string;
  url?: string;
  documentId?: string;
  section?: string;
  type: 'internal' | 'external' | 'regulatory';
}

// Compliance standards interfaces
export interface ComplianceStandard {
  id: string;
  name: string;
  shortName: string;
  version: string;
  category: ComplianceCategory;
  description: string;
  requirements: ComplianceRequirement[];
  lastUpdated: Date;
  jurisdiction: string[];
  applicability: StandardApplicability;
}

export type ComplianceCategory = 'security' | 'privacy' | 'financial' | 'healthcare' | 'quality' | 'environmental' | 'general';

export interface ComplianceRequirement {
  id: string;
  standardId: string;
  section: string;
  subsection?: string;
  title: string;
  description: string;
  implementation: string;
  evidence: string[];
  criticality: 'low' | 'medium' | 'high' | 'critical';
  type: RequirementType;
  tags: string[];
  relatedRequirements: string[];
  auditQuestions: string[];
}

export type RequirementType = 'policy' | 'procedure' | 'control' | 'documentation' | 'training' | 'technical' | 'governance';

export interface StandardApplicability {
  organizationTypes: string[];
  industryVerticals: string[];
  geographicRegions: string[];
  companySize: string[];
  conditions: string[];
}

// Analysis and reporting interfaces
export interface AnalysisResult {
  id: string;
  documentId: string;
  standardIds: string[];
  analysisDate: Date;
  overallScore: number;
  gaps: ComplianceGap[];
  recommendations: Recommendation[];
  riskAssessment: RiskAssessment;
  details: AnalysisDetail[];
  metadata: AnalysisMetadata;
}

export interface ComplianceGap {
  id: string;
  requirementId: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  currentState: string;
  requiredState: string;
  evidence: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  priority: number;
  recommendation: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  timeframe: string;
  cost: string;
  owner: string;
  dependencies: string[];
  risks: string[];
  benefits: string[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  categories: RiskCategory[];
  mitigationStrategies: MitigationStrategy[];
  residualRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  riskMatrix: RiskMatrix;
}

export interface RiskCategory {
  category: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high' | 'critical';
  probability: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string[];
}

export interface MitigationStrategy {
  id: string;
  title: string;
  description: string;
  category: string;
  effectiveness: 'low' | 'medium' | 'high';
  cost: 'low' | 'medium' | 'high';
  timeframe: string;
  owner: string;
  dependencies: string[];
}

export interface RiskMatrix {
  dimensions: string[];
  values: number[][];
  thresholds: RiskThreshold[];
}

export interface RiskThreshold {
  level: 'low' | 'medium' | 'high' | 'critical';
  minScore: number;
  maxScore: number;
  color: string;
  description: string;
}

export interface AnalysisDetail {
  requirementId: string;
  satisfied: 'yes' | 'no' | 'partial' | 'na';
  evidence: string;
  confidence: number;
  reasoning: string;
  sources: string[];
  reviewDate: Date;
  reviewer?: string;
}

export interface AnalysisMetadata {
  analysisVersion: string;
  modelVersion: string;
  processingTime: number;
  tokenUsage: TokenUsage;
  confidence: number;
  quality: 'low' | 'medium' | 'high';
  flags: string[];
  parameters: Record<string, any>;
}

// Utility interfaces
export interface ProcessedContent {
  plainText: string;
  markdownText: string;
  structuredData: Record<string, any>;
  extractedEntities: ExtractedEntity[];
  sentiment: SentimentAnalysis;
  wordCount: number;
  readingTime: number;
  complexity: number;
}

export interface ExtractedEntity {
  type: 'person' | 'organization' | 'location' | 'date' | 'policy' | 'procedure' | 'control' | 'risk';
  value: string;
  confidence: number;
  context: string;
  position: number;
}

export interface SentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative';
  confidence: number;
  emotions: Record<string, number>;
  tone: string[];
}

export interface ConversationHistory {
  id: string;
  sessionId: string;
  messages: ChatMessage[];
  context: Record<string, any>;
  created: Date;
  lastActivity: Date;
}

export interface StandardDefinition {
  id: string;
  standard: ComplianceStandard;
  requirements: ComplianceRequirement[];
  mappings: RequirementMapping[];
  cached: boolean;
  cacheExpiry: Date;
}

export interface RequirementMapping {
  requirementId: string;
  relatedRequirements: string[];
  conflictingRequirements: string[];
  supportingEvidence: string[];
  implementationGuidance: string[];
}

export interface LearnedPattern {
  id: string;
  type: 'gap' | 'recommendation' | 'risk' | 'improvement';
  pattern: string;
  frequency: number;
  confidence: number;
  effectiveness: number;
  context: string[];
  examples: string[];
  lastSeen: Date;
}

export interface UserPreferences {
  analysisDepth: 'basic' | 'detailed' | 'comprehensive';
  riskTolerance: 'low' | 'medium' | 'high';
  reportFormat: 'summary' | 'detailed' | 'executive';
  notificationSettings: NotificationSettings;
  preferredStandards: string[];
  customPrompts: Record<string, string>;
}

export interface NotificationSettings {
  email: boolean;
  inApp: boolean;
  webhook?: string;
  frequency: 'immediate' | 'daily' | 'weekly';
  severityThreshold: 'low' | 'medium' | 'high' | 'critical';
}

// RAG system interfaces
export interface RAGContext {
  tenantId: string;
  documentIds?: string[];
  standardIds?: string[];
  maxResults?: number;
  searchType?: 'semantic' | 'keyword' | 'hybrid';
  filters?: Record<string, any>;
}

export interface RAGResponse {
  chunks: RAGChunk[];
  sources: string[];
  totalResults: number;
  query: string;
  processingTime: number;
}

export interface RAGChunk {
  content: string;
  source: string;
  score: number;
  metadata: Record<string, any>;
  highlights: string[];
}

// Event interfaces for agent communication
export interface AgentEvent {
  id: string;
  type: string;
  agentId: string;
  tenantId: string;
  payload: Record<string, any>;
  timestamp: Date;
  processed: boolean;
}

export interface AgentCommand {
  id: string;
  type: string;
  agentId: string;
  tenantId: string;
  command: string;
  parameters: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeout: number;
  retries: number;
  timestamp: Date;
}

// Error handling interfaces
export interface AgentError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  agentId?: string;
  tenantId?: string;
  stack?: string;
}

export interface ValidationError extends AgentError {
  field: string;
  value: any;
  constraint: string;
}

// Performance monitoring interfaces
export interface PerformanceMetrics {
  agentId: string;
  tenantId: string;
  operation: string;
  duration: number;
  tokenUsage: TokenUsage;
  memoryUsage: number;
  cacheHitRate: number;
  errorRate: number;
  throughput: number;
  timestamp: Date;
}

export interface HealthStatus {
  agentId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  lastHealthCheck: Date;
  metrics: PerformanceMetrics[];
  errors: AgentError[];
  warnings: string[];
}