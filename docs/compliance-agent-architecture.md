# SmartWiki Compliance Agent Architecture

## 🎯 Overview

The SmartWiki Compliance Agent is a specialized AI agent designed to help organizations assess document compliance against regulatory standards. Starting with Mistral's free API for cost-effectiveness, the architecture is designed for easy model switching as requirements evolve.

## 🏗️ High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Compliance UI Components]
        Forms[Standard Selection Forms]
        Reports[Report Viewer]
    end
    
    subgraph "Agent Layer"
        CA[Compliance Agent]
        Orchestrator[Agent Orchestrator]
        Memory[Agent Memory]
    end
    
    subgraph "Inference Layer"
        Abstraction[Model Abstraction Layer]
        Mistral[Mistral Free API]
        Future[Future Models]
    end
    
    subgraph "Knowledge Layer"
        RAG[RAG System]
        Bedrock[AWS Bedrock KB]
        Standards[Compliance Standards DB]
    end
    
    subgraph "Storage Layer"
        S3[Document Storage]
        PostgreSQL[Metadata DB]
        Vector[Vector Store]
    end
    
    UI --> CA
    Forms --> CA
    Reports --> CA
    CA --> Orchestrator
    CA --> Memory
    Orchestrator --> Abstraction
    Abstraction --> Mistral
    Abstraction --> Future
    CA --> RAG
    RAG --> Bedrock
    RAG --> Standards
    Bedrock --> Vector
    Standards --> PostgreSQL
    S3 --> RAG
```

## 🤖 Compliance Agent Core Components

### 1. Agent Framework
```typescript
interface ComplianceAgent {
  id: string;
  name: string;
  type: 'compliance';
  status: 'active' | 'inactive' | 'processing';
  
  // Core capabilities
  capabilities: {
    documentAnalysis: boolean;
    standardsComparison: boolean;
    gapIdentification: boolean;
    reportGeneration: boolean;
    riskAssessment: boolean;
  };
  
  // Configuration
  config: {
    modelProvider: 'mistral' | 'openai' | 'anthropic' | 'custom';
    modelVersion: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    complianceFrameworks: string[];
  };
  
  // State management
  context: ComplianceContext;
  memory: AgentMemory;
}

interface ComplianceContext {
  currentDocument: DocumentMetadata;
  selectedStandards: ComplianceStandard[];
  analysisHistory: AnalysisResult[];
  userPreferences: UserPreferences;
}

interface AgentMemory {
  conversations: ConversationHistory[];
  documentCache: Map<string, DocumentAnalysis>;
  standardsCache: Map<string, StandardDefinition>;
  patterns: LearnedPattern[];
}
```

### 2. Model Abstraction Layer
```typescript
// Core abstraction interface
interface ModelProvider {
  name: string;
  version: string;
  maxTokens: number;
  supportedFeatures: ModelFeature[];
  
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  embed(text: string): Promise<EmbeddingResponse>;
  analyze(document: string, prompt: string): Promise<AnalysisResponse>;
}

// Mistral implementation (Day 1)
class MistralProvider implements ModelProvider {
  name = 'mistral';
  version = 'mistral-7b-instruct';
  maxTokens = 8192;
  supportedFeatures = ['chat', 'completion', 'structured_output'];
  
  private apiKey: string;
  private baseUrl = 'https://api.mistral.ai/v1';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.version,
        messages,
        temperature: options?.temperature ?? 0.1,
        max_tokens: options?.maxTokens ?? 2048,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      message: data.choices[0].message.content,
      usage: data.usage,
      model: this.version,
    };
  }
  
  async analyze(document: string, prompt: string): Promise<AnalysisResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: prompt,
      },
      {
        role: 'user',
        content: document,
      },
    ];
    
    const response = await this.chat(messages, { temperature: 0.1 });
    return {
      analysis: response.message,
      confidence: this.calculateConfidence(response),
      usage: response.usage,
    };
  }
  
  private calculateConfidence(response: ChatResponse): number {
    // Simple confidence calculation based on response length and certainty indicators
    const certaintyKeywords = ['clearly', 'definitely', 'certainly', 'obviously'];
    const uncertaintyKeywords = ['might', 'possibly', 'potentially', 'unclear'];
    
    const text = response.message.toLowerCase();
    const certaintyCount = certaintyKeywords.filter(word => text.includes(word)).length;
    const uncertaintyCount = uncertaintyKeywords.filter(word => text.includes(word)).length;
    
    const baseConfidence = Math.min(response.message.length / 1000, 1.0);
    const confidenceAdjustment = (certaintyCount - uncertaintyCount) * 0.1;
    
    return Math.max(0.1, Math.min(0.95, baseConfidence + confidenceAdjustment));
  }
}

// Provider factory for easy switching
class ModelProviderFactory {
  private static providers: Map<string, ModelProvider> = new Map();
  
  static register(name: string, provider: ModelProvider): void {
    this.providers.set(name, provider);
  }
  
  static create(name: string, config: any): ModelProvider {
    switch (name) {
      case 'mistral':
        return new MistralProvider(config.apiKey);
      case 'openai':
        return new OpenAIProvider(config.apiKey);
      case 'anthropic':
        return new AnthropicProvider(config.apiKey);
      default:
        throw new Error(`Unknown model provider: ${name}`);
    }
  }
  
  static getAvailable(): string[] {
    return Array.from(this.providers.keys());
  }
}
```

### 3. RAG Integration
```typescript
interface RAGSystem {
  vectorStore: VectorStore;
  documentStore: DocumentStore;
  standardsLibrary: StandardsLibrary;
  
  query(question: string, context?: RAGContext): Promise<RAGResponse>;
  addDocument(document: Document): Promise<void>;
  updateStandards(standards: ComplianceStandard[]): Promise<void>;
}

class BedrockRAGSystem implements RAGSystem {
  private bedrockClient: BedrockClient;
  private knowledgeBaseId: string;
  
  constructor(knowledgeBaseId: string, region: string) {
    this.bedrockClient = new BedrockClient({ region });
    this.knowledgeBaseId = knowledgeBaseId;
  }
  
  async query(question: string, context?: RAGContext): Promise<RAGResponse> {
    const retrieveCommand = new RetrieveCommand({
      knowledgeBaseId: this.knowledgeBaseId,
      retrievalQuery: {
        text: question,
      },
      retrievalConfiguration: {
        vectorSearchConfiguration: {
          numberOfResults: 10,
          overrideSearchType: 'HYBRID',
        },
      },
    });
    
    const retrievalResponse = await this.bedrockClient.send(retrieveCommand);
    
    const relevantChunks = retrievalResponse.retrievalResults?.map(result => ({
      content: result.content?.text || '',
      source: result.location?.s3Location?.uri || '',
      score: result.score || 0,
    })) || [];
    
    return {
      chunks: relevantChunks,
      sources: [...new Set(relevantChunks.map(chunk => chunk.source))],
      totalResults: relevantChunks.length,
    };
  }
  
  async addDocument(document: Document): Promise<void> {
    // Upload document to S3 for Bedrock indexing
    const s3Key = `documents/${document.tenantId}/${document.id}`;
    await this.uploadToS3(document.content, s3Key);
    
    // Trigger Bedrock knowledge base sync
    await this.syncKnowledgeBase();
  }
  
  private async uploadToS3(content: string, key: string): Promise<void> {
    // S3 upload implementation
  }
  
  private async syncKnowledgeBase(): Promise<void> {
    // Trigger Bedrock KB sync
  }
}
```

## 🔍 Compliance Analysis Workflow

### 1. Document Analysis Pipeline
```typescript
class ComplianceAnalyzer {
  private modelProvider: ModelProvider;
  private ragSystem: RAGSystem;
  private standardsLibrary: StandardsLibrary;
  
  async analyzeDocument(
    document: Document,
    standards: ComplianceStandard[]
  ): Promise<ComplianceAnalysis> {
    
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
    const recommendations = await this.generateRecommendations(gapAnalysis);
    
    return {
      documentId: document.id,
      analysisId: generateId(),
      timestamp: new Date(),
      standards: standards.map(s => s.id),
      score: complianceScore,
      gaps: gapAnalysis.gaps,
      recommendations,
      details: gapAnalysis.details,
    };
  }
  
  private async extractStructure(document: Document): Promise<DocumentStructure> {
    const prompt = `
    Analyze the following document and extract its structural elements:
    - Headers and sections
    - Policy statements
    - Procedures and processes
    - Controls and safeguards
    - Roles and responsibilities
    
    Return a structured JSON representation.
    `;
    
    const response = await this.modelProvider.analyze(document.content, prompt);
    return JSON.parse(response.analysis);
  }
  
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
  
  private async performGapAnalysis(
    documentStructure: DocumentStructure,
    requirements: ComplianceRequirement[]
  ): Promise<GapAnalysis> {
    const gaps: ComplianceGap[] = [];
    const details: AnalysisDetail[] = [];
    
    for (const requirement of requirements) {
      const analysisPrompt = `
      Analyze if the following document structure satisfies this compliance requirement:
      
      Requirement: ${requirement.description}
      Standard: ${requirement.standardId}
      Criticality: ${requirement.criticality}
      
      Document Structure: ${JSON.stringify(documentStructure)}
      
      Determine:
      1. Is this requirement fully satisfied? (yes/no/partial)
      2. What evidence exists in the document?
      3. What gaps exist?
      4. Risk level if not addressed (low/medium/high/critical)
      
      Respond in JSON format.
      `;
      
      const response = await this.modelProvider.analyze('', analysisPrompt);
      const analysis = JSON.parse(response.analysis);
      
      if (analysis.satisfied !== 'yes') {
        gaps.push({
          requirementId: requirement.id,
          description: requirement.description,
          severity: analysis.riskLevel,
          evidence: analysis.evidence || '',
          recommendation: analysis.recommendation || '',
        });
      }
      
      details.push({
        requirementId: requirement.id,
        satisfied: analysis.satisfied,
        evidence: analysis.evidence,
        confidence: response.confidence,
      });
    }
    
    return { gaps, details };
  }
}
```

### 2. Standards Library
```typescript
interface ComplianceStandard {
  id: string;
  name: string;
  version: string;
  category: 'security' | 'privacy' | 'financial' | 'healthcare' | 'general';
  description: string;
  requirements: ComplianceRequirement[];
  lastUpdated: Date;
}

interface ComplianceRequirement {
  id: string;
  standardId: string;
  section: string;
  title: string;
  description: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  relatedRequirements: string[];
}

class StandardsLibrary {
  private db: Database;
  private cache: Map<string, ComplianceStandard> = new Map();
  
  async getStandard(id: string): Promise<ComplianceStandard | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    
    const standard = await this.db.query(
      'SELECT * FROM compliance_standards WHERE id = ?',
      [id]
    );
    
    if (standard) {
      this.cache.set(id, standard);
    }
    
    return standard;
  }
  
  async getRequirements(standardId: string): Promise<ComplianceRequirement[]> {
    return await this.db.query(
      'SELECT * FROM compliance_requirements WHERE standard_id = ?',
      [standardId]
    );
  }
  
  async searchStandards(query: string): Promise<ComplianceStandard[]> {
    return await this.db.query(`
      SELECT * FROM compliance_standards 
      WHERE name ILIKE ? OR description ILIKE ?
      ORDER BY name
    `, [`%${query}%`, `%${query}%`]);
  }
  
  async addStandard(standard: ComplianceStandard): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.query(
        'INSERT INTO compliance_standards (id, name, version, category, description) VALUES (?, ?, ?, ?, ?)',
        [standard.id, standard.name, standard.version, standard.category, standard.description]
      );
      
      for (const requirement of standard.requirements) {
        await tx.query(
          'INSERT INTO compliance_requirements (id, standard_id, section, title, description, criticality) VALUES (?, ?, ?, ?, ?, ?)',
          [requirement.id, standard.id, requirement.section, requirement.title, requirement.description, requirement.criticality]
        );
      }
    });
  }
}
```

## 📊 Frontend Integration

### 1. Compliance UI Components
```typescript
// Compliance Agent Panel
interface ComplianceAgentPanelProps {
  documents: Document[];
  onAnalyze: (documentId: string, standardIds: string[]) => void;
  onViewReport: (analysisId: string) => void;
}

const ComplianceAgentPanel: React.FC<ComplianceAgentPanelProps> = ({
  documents,
  onAnalyze,
  onViewReport,
}) => {
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  return (
    <div className="compliance-panel">
      <div className="panel-header">
        <h2>Compliance Analysis</h2>
        <ComplianceAgentStatus />
      </div>
      
      <div className="analysis-form">
        <DocumentSelector
          documents={documents}
          selected={selectedDocument}
          onSelect={setSelectedDocument}
        />
        
        <StandardsSelector
          selected={selectedStandards}
          onSelect={setSelectedStandards}
        />
        
        <Button
          onClick={() => onAnalyze(selectedDocument, selectedStandards)}
          disabled={!selectedDocument || selectedStandards.length === 0 || isAnalyzing}
          loading={isAnalyzing}
        >
          Analyze Compliance
        </Button>
      </div>
      
      <ComplianceHistory onViewReport={onViewReport} />
    </div>
  );
};

// Standards Selector Component
const StandardsSelector: React.FC<{
  selected: string[];
  onSelect: (standards: string[]) => void;
}> = ({ selected, onSelect }) => {
  const [availableStandards, setAvailableStandards] = useState<ComplianceStandard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    loadAvailableStandards();
  }, []);
  
  return (
    <div className="standards-selector">
      <label>Select Compliance Standards</label>
      
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search standards..."
      />
      
      <div className="standards-list">
        {availableStandards
          .filter(standard => 
            standard.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map(standard => (
            <StandardCard
              key={standard.id}
              standard={standard}
              selected={selected.includes(standard.id)}
              onToggle={(standardId) => {
                if (selected.includes(standardId)) {
                  onSelect(selected.filter(id => id !== standardId));
                } else {
                  onSelect([...selected, standardId]);
                }
              }}
            />
          ))}
      </div>
    </div>
  );
};
```

### 2. Report Generation
```typescript
interface ComplianceReport {
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

const ComplianceReportViewer: React.FC<{
  report: ComplianceReport;
  onExport: (format: 'pdf' | 'docx' | 'json') => void;
}> = ({ report, onExport }) => {
  return (
    <div className="compliance-report">
      <div className="report-header">
        <h1>Compliance Analysis Report</h1>
        <div className="report-actions">
          <Button onClick={() => onExport('pdf')}>Export PDF</Button>
          <Button onClick={() => onExport('docx')}>Export Word</Button>
          <Button onClick={() => onExport('json')}>Export JSON</Button>
        </div>
      </div>
      
      <ReportSummary 
        score={report.overallScore}
        standards={report.standards}
        gapCount={report.gaps.length}
      />
      
      <ComplianceGapsList gaps={report.gaps} />
      
      <RecommendationsList recommendations={report.recommendations} />
      
      <RiskAssessmentSection assessment={report.riskAssessment} />
      
      <DetailedAnalysis report={report} />
    </div>
  );
};
```

## 🔧 Configuration & Environment

### 1. Environment Variables
```bash
# Mistral API Configuration
MISTRAL_API_KEY=your_mistral_api_key_here
MISTRAL_MODEL=mistral-7b-instruct
MISTRAL_BASE_URL=https://api.mistral.ai/v1

# AWS Configuration for RAG
AWS_REGION=us-east-1
AWS_BEDROCK_KB_ID=your_knowledge_base_id
AWS_S3_BUCKET=smartwiki-documents

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/smartwiki
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

### 2. Agent Configuration
```typescript
interface AgentConfig {
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
    maxDocumentSize: 50000; // characters
    maxAnalysisTime: 300000; // 5 minutes in ms
    maxConcurrentAnalyses: 3;
  };
  
  prompts: {
    systemPrompt: string;
    analysisPrompt: string;
    gapAnalysisPrompt: string;
    recommendationPrompt: string;
  };
}
```

## 🚀 Implementation Phases

### Phase 1: Core Agent Framework (Week 1)
- [ ] Model abstraction layer with Mistral integration
- [ ] Basic compliance agent structure
- [ ] Document analysis pipeline
- [ ] Simple gap identification

### Phase 2: Standards Integration (Week 2)
- [ ] Standards library implementation
- [ ] RAG system integration with Bedrock
- [ ] Compliance requirements mapping
- [ ] Basic report generation

### Phase 3: Frontend Integration (Week 3)
- [ ] Compliance UI components
- [ ] Standards selector interface
- [ ] Report viewer and export
- [ ] Agent status monitoring

### Phase 4: Advanced Features (Week 4)
- [ ] Risk assessment algorithms
- [ ] Advanced recommendation engine
- [ ] Batch processing capabilities
- [ ] Performance optimization

## 💰 Cost Management

### Mistral Free Tier Limits
- **Daily Requests**: 1,000 requests per day
- **Monthly Requests**: 20,000 requests per month
- **Rate Limiting**: 1 request per second
- **Context Window**: 8,192 tokens
- **Output Tokens**: 1,024 tokens per request

### Cost Optimization Strategies
1. **Caching**: Cache analysis results for similar documents
2. **Batching**: Process multiple requirements in single requests
3. **Chunking**: Break large documents into optimized chunks
4. **Preprocessing**: Extract relevant sections before analysis
5. **Monitoring**: Track usage and implement alerts

### Future Scaling Options
1. **Mistral Paid Plans**: $7/month for 10M tokens
2. **OpenAI Integration**: GPT-4 for complex analysis
3. **Local Models**: Deploy open-source models for high volume
4. **Hybrid Approach**: Free tier + paid models for critical analysis

## 🔒 Security & Compliance

### Data Protection
- Document encryption at rest and in transit
- Tenant data isolation
- Audit logging for all analysis activities
- GDPR/CCPA compliance for EU/CA users

### API Security
- Rate limiting and request validation
- API key rotation and management
- Input sanitization and output filtering
- Secure credential storage

This architecture provides a robust foundation for the SmartWiki compliance agent while maintaining cost-effectiveness through the Mistral free tier and ensuring easy migration to other models as needs evolve.