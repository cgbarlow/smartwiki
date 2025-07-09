// Model Provider Types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface ChatResponse {
  message: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface AnalysisResponse {
  analysis: string;
  confidence: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface EmbeddingResponse {
  embedding: number[];
  usage: {
    totalTokens: number;
  };
}

export type ModelFeature = 'chat' | 'completion' | 'structured_output' | 'embedding';

export interface ModelProvider {
  name: string;
  version: string;
  maxTokens: number;
  supportedFeatures: ModelFeature[];
  
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  embed?(text: string): Promise<EmbeddingResponse>;
  analyze(document: string, prompt: string): Promise<AnalysisResponse>;
}

// Agent Types
export interface ComplianceAgent {
  id: string;
  name: string;
  type: 'compliance';
  status: 'active' | 'inactive' | 'processing';
  
  capabilities: {
    documentAnalysis: boolean;
    standardsComparison: boolean;
    gapIdentification: boolean;
    reportGeneration: boolean;
    riskAssessment: boolean;
  };
  
  config: {
    modelProvider: 'mistral' | 'openai' | 'anthropic' | 'custom';
    modelVersion: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    complianceFrameworks: string[];
  };
  
  context: ComplianceContext;
  memory: AgentMemory;
}

export interface ComplianceContext {
  currentDocument?: DocumentMetadata;
  selectedStandards: ComplianceStandard[];
  analysisHistory: AnalysisResult[];
  userPreferences: UserPreferences;
}

export interface AgentMemory {
  conversations: ConversationHistory[];
  documentCache: Map<string, DocumentAnalysis>;
  standardsCache: Map<string, StandardDefinition>;
  patterns: LearnedPattern[];
}

export interface DocumentMetadata {
  id: string;
  title: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

export interface ComplianceStandard {
  id: string;
  name: string;
  version: string;
  category: 'security' | 'privacy' | 'financial' | 'healthcare' | 'general';
  description: string;
  requirements: ComplianceRequirement[];
}

export interface ComplianceRequirement {
  id: string;
  standardId: string;
  section: string;
  title: string;
  description: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  relatedRequirements: string[];
}

export interface AnalysisResult {
  id: string;
  documentId: string;
  standardIds: string[];
  score: number;
  gaps: ComplianceGap[];
  recommendations: Recommendation[];
  timestamp: Date;
}

export interface ComplianceGap {
  requirementId: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string;
  recommendation: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  actionItems: string[];
}

export interface UserPreferences {
  defaultStandards: string[];
  reportFormat: 'pdf' | 'docx' | 'html' | 'json';
  alertLevel: 'low' | 'medium' | 'high';
}

export interface ConversationHistory {
  id: string;
  messages: ChatMessage[];
  timestamp: Date;
}

export interface DocumentAnalysis {
  id: string;
  structure: DocumentStructure;
  content: string;
  metadata: any;
  analyzedAt: Date;
}

export interface DocumentStructure {
  headers: string[];
  sections: Section[];
  policies: PolicyStatement[];
  procedures: Procedure[];
  controls: Control[];
  roles: RoleDefinition[];
}

export interface Section {
  title: string;
  content: string;
  level: number;
}

export interface PolicyStatement {
  title: string;
  content: string;
  category: string;
}

export interface Procedure {
  title: string;
  steps: string[];
  category: string;
}

export interface Control {
  title: string;
  description: string;
  category: string;
  implementation: string;
}

export interface RoleDefinition {
  title: string;
  responsibilities: string[];
  permissions: string[];
}

export interface StandardDefinition {
  id: string;
  name: string;
  requirements: ComplianceRequirement[];
  lastUpdated: Date;
}

export interface LearnedPattern {
  id: string;
  pattern: string;
  confidence: number;
  usageCount: number;
  lastUsed: Date;
}

// RAG System Types
export interface RAGContext {
  documentIds?: string[];
  standardIds?: string[];
  analysisType?: 'document' | 'article' | 'policy' | 'procedure';
}

export interface RAGResponse {
  chunks: ContentChunk[];
  sources: string[];
  totalResults: number;
}

export interface ContentChunk {
  content: string;
  source: string;
  score: number;
}

export interface RAGSystem {
  query(question: string, context?: RAGContext): Promise<RAGResponse>;
  addDocument(document: Document): Promise<void>;
  updateStandards(standards: ComplianceStandard[]): Promise<void>;
}

// Analysis Types
export interface GapAnalysis {
  gaps: ComplianceGap[];
  details: AnalysisDetail[];
}

export interface AnalysisDetail {
  requirementId: string;
  satisfied: 'yes' | 'no' | 'partial';
  evidence: string;
  confidence: number;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
}

export interface RiskFactor {
  factor: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  likelihood: 'low' | 'medium' | 'high';
  description: string;
}

export interface ComplianceReport {
  id: string;
  documentId: string;
  documentTitle: string;
  analysisDate: Date;
  standards: ComplianceStandard[];
  overallScore: number;
  gaps: ComplianceGap[];
  recommendations: Recommendation[];
  riskAssessment: RiskAssessment;
}

// Configuration Types
export interface AgentConfig {
  provider: {
    name: 'mistral';
    model: 'mistral-7b-instruct';
    apiKey: string;
    baseUrl: string;
  };
  
  parameters: {
    temperature: 0.1;
    maxTokens: 2048;
    topP: 0.9;
    frequencyPenalty: 0.0;
    presencePenalty: 0.0;
  };
  
  capabilities: {
    documentAnalysis: true;
    standardsComparison: true;
    gapIdentification: true;
    reportGeneration: true;
    riskAssessment: true;
  };
  
  limits: {
    maxDocumentSize: 50000;
    maxAnalysisTime: 300000;
    maxConcurrentAnalyses: 3;
  };
  
  prompts: {
    systemPrompt: string;
    analysisPrompt: string;
    gapAnalysisPrompt: string;
    recommendationPrompt: string;
  };
}