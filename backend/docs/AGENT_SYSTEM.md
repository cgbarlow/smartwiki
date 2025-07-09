# SmartWiki Agent System

A comprehensive AI-powered agent system for SmartWiki, featuring compliance analysis, document assessment, and automated report generation.

## 🎯 Overview

The SmartWiki Agent System is designed to provide intelligent document analysis and compliance checking capabilities. The system is built with a pluggable architecture that supports multiple AI model providers and can be extended with additional agent types.

### Key Features

- **🤖 Pluggable Agent Architecture** - Modular design for easy extension
- **📋 Compliance Analysis** - Automated compliance checking against multiple standards
- **🔍 Gap Analysis** - Identifies compliance gaps and provides recommendations
- **📊 Report Generation** - Automated compliance reports in multiple formats
- **🧠 Model Abstraction** - Support for multiple AI providers (Mistral, OpenAI, Anthropic)
- **⚡ Cost-Effective** - Uses Mistral free tier for cost-effective AI inference
- **🔧 RAG Integration** - Context-aware analysis using AWS Bedrock Knowledge Base

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Compliance UI   │  │ Agent Manager   │  │ Report Viewer   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                      Agent Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Compliance      │  │ Agent Registry  │  │ Agent Memory    │ │
│  │ Agent           │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                   Inference Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Model           │  │ Mistral         │  │ Future Models   │ │
│  │ Abstraction     │  │ Provider        │  │ (OpenAI, etc.)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                   Knowledge Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Standards       │  │ RAG System      │  │ AWS Bedrock     │ │
│  │ Library         │  │                 │  │ Knowledge Base  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ PostgreSQL      │  │ S3 Document     │  │ Vector Store    │ │
│  │ (Metadata)      │  │ Storage         │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites

1. **Node.js** (>=18.0.0)
2. **PostgreSQL** database
3. **Mistral API Key** (free tier available)
4. **AWS Account** (for Bedrock RAG features)

### Environment Configuration

Copy the `.env.example` file and configure the following variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/smartwiki"

# Mistral API (Primary Provider)
MISTRAL_API_KEY="your_mistral_api_key_here"
MISTRAL_MODEL="mistral-7b-instruct"
MISTRAL_BASE_URL="https://api.mistral.ai/v1"

# AWS (for RAG features)
AWS_REGION="us-east-1"
AWS_BEDROCK_KB_ID="your_knowledge_base_id"

# Agent Configuration
AGENT_MAX_CONCURRENT=3
AGENT_TIMEOUT_MS=300000
AGENT_MAX_DOCUMENT_SIZE=50000
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npm run db:generate
```

3. Run database migrations:
```bash
npm run db:migrate
```

4. Start the server:
```bash
npm run dev
```

The agent system will automatically initialize on server startup.

## 📖 Usage Guide

### Creating a Compliance Agent

```typescript
// Via API
POST /api/v1/agents/compliance
{
  "name": "SOX Compliance Agent",
  "description": "Specialized agent for SOX compliance analysis",
  "modelProvider": "mistral"
}
```

```typescript
// Programmatically
import { ComplianceAgent } from '@/agents/compliance/ComplianceAgent';

const agent = new ComplianceAgent(
  'agent-id',
  'SOX Compliance Agent',
  'mistral'
);
```

### Analyzing Document Compliance

```typescript
// Via API
POST /api/v1/agents/{agentId}/analyze
{
  "documentId": "doc-123",
  "standardIds": ["sox-2002", "gdpr-2018"],
  "options": {
    "detailedAnalysis": true,
    "includeRecommendations": true,
    "riskAssessment": true
  }
}
```

```typescript
// Programmatically
const result = await agent.analyzeCompliance(
  {
    id: 'doc-123',
    title: 'Data Protection Policy',
    content: documentContent
  },
  ['sox-2002', 'gdpr-2018'],
  'user-id'
);
```

### Generating Reports

```typescript
// Via API
POST /api/v1/agents/{agentId}/report
{
  "analysisId": "analysis-123",
  "format": "pdf"
}
```

```typescript
// Programmatically
const report = await agent.generateReport('analysis-123', 'pdf');
```

## 🔧 Configuration

### Model Providers

The system supports multiple AI model providers:

#### Mistral (Primary - Free Tier)
```bash
MISTRAL_API_KEY="your_api_key"
MISTRAL_MODEL="mistral-7b-instruct"
```

**Advantages:**
- Free tier available (1,000 requests/day)
- Cost-effective for high volume
- Good performance for compliance analysis

#### OpenAI (Optional)
```bash
OPENAI_API_KEY="your_api_key"
OPENAI_MODEL="gpt-3.5-turbo"
```

#### Anthropic (Optional)
```bash
ANTHROPIC_API_KEY="your_api_key"
ANTHROPIC_MODEL="claude-3-haiku-20240307"
```

### Compliance Standards

The system includes default standards:

- **SOX** (Sarbanes-Oxley Act)
- **GDPR** (General Data Protection Regulation)
- **HIPAA** (Health Insurance Portability and Accountability Act)
- **PCI DSS** (Payment Card Industry Data Security Standard)
- **ISO 27001** (Information Security Management)

Additional standards can be added programmatically:

```typescript
import { StandardsLibrary } from '@/agents/compliance/standards/StandardsLibrary';

const library = new StandardsLibrary();
await library.addStandard({
  name: 'CCPA',
  version: '2020',
  category: 'privacy',
  description: 'California Consumer Privacy Act',
  requirements: [...]
});
```

## 🎨 Frontend Integration

### Compliance Agent Panel

```tsx
import { ComplianceAgentPanel } from '@/components/agents/ComplianceAgentPanel';

function CompliancePage() {
  const handleAnalyze = async (documentId: string, standardIds: string[]) => {
    // Implement analysis logic
  };

  const handleViewReport = (analysisId: string) => {
    // Implement report viewing logic
  };

  return (
    <ComplianceAgentPanel
      documents={documents}
      onAnalyze={handleAnalyze}
      onViewReport={handleViewReport}
    />
  );
}
```

### Report Viewer

```tsx
import { ComplianceReportViewer } from '@/components/agents/ComplianceReportViewer';

function ReportPage() {
  const handleExport = (format: 'pdf' | 'docx' | 'json') => {
    // Implement export logic
  };

  return (
    <ComplianceReportViewer
      report={report}
      onExport={handleExport}
      onClose={() => setShowReport(false)}
    />
  );
}
```

## 🧪 Testing

Run the agent system tests:

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests
npm run test
```

The test suite includes:
- Model provider validation
- Standards library functionality
- Compliance analysis workflows
- Report generation
- Error handling scenarios

## 📊 Performance & Monitoring

### System Health

Check system health via API:

```typescript
GET /api/v1/health
```

Or programmatically:

```typescript
import { AgentService } from '@/services/agentService';

const health = await AgentService.getInstance().getSystemHealth();
```

### Metrics

- **Active Agents**: Number of active agent instances
- **Total Analyses**: Total compliance analyses performed
- **Average Score**: Average compliance score across analyses
- **Response Time**: Average analysis response time
- **Token Usage**: AI model token consumption

### Cost Management

#### Mistral Free Tier Limits
- **Daily Requests**: 1,000 requests per day
- **Monthly Requests**: 20,000 requests per month
- **Rate Limiting**: 1 request per second
- **Context Window**: 8,192 tokens

#### Optimization Strategies
1. **Caching**: Cache analysis results for similar documents
2. **Batching**: Process multiple requirements in single requests
3. **Preprocessing**: Extract relevant sections before analysis
4. **Rate Limiting**: Respect API rate limits

## 🔒 Security

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

## 🚧 Extending the System

### Adding New Agent Types

1. Create agent interface:
```typescript
interface CustomAgent extends BaseAgent {
  customCapability(): Promise<CustomResult>;
}
```

2. Implement agent class:
```typescript
export class CustomAgent implements CustomAgent {
  // Implementation
}
```

3. Register with AgentRegistry:
```typescript
AgentRegistry.registerAgent('custom', CustomAgent);
```

### Adding New Model Providers

1. Implement ModelProvider interface:
```typescript
export class CustomProvider extends ModelProvider {
  // Implementation
}
```

2. Register with factory:
```typescript
ModelProviderFactory.registerProvider('custom', config);
```

### Adding New Compliance Standards

1. Define standard structure:
```typescript
const newStandard: ComplianceStandard = {
  name: 'Custom Standard',
  version: '1.0',
  category: 'custom',
  description: 'Custom compliance standard',
  requirements: [...]
};
```

2. Add to standards library:
```typescript
await standardsLibrary.addStandard(newStandard);
```

## 📚 API Reference

### Agent Management

- `POST /api/v1/agents/compliance` - Create compliance agent
- `GET /api/v1/agents` - List agents
- `GET /api/v1/agents/{id}` - Get agent details
- `PUT /api/v1/agents/{id}` - Update agent
- `DELETE /api/v1/agents/{id}` - Delete agent

### Compliance Analysis

- `POST /api/v1/agents/{id}/analyze` - Analyze document
- `GET /api/v1/agents/{id}/analyses` - Get analysis history
- `POST /api/v1/agents/{id}/report` - Generate report

### Standards Management

- `GET /api/v1/agents/compliance/standards` - List standards
- `GET /api/v1/agents/compliance/standards?category={category}` - Filter by category
- `GET /api/v1/agents/compliance/standards?search={query}` - Search standards

## 🐛 Troubleshooting

### Common Issues

1. **Agent initialization fails**
   - Check API keys are configured
   - Verify database connectivity
   - Ensure standards library is initialized

2. **Analysis requests timeout**
   - Check document size limits
   - Verify model provider connectivity
   - Review rate limiting settings

3. **Report generation fails**
   - Check analysis completion status
   - Verify report format support
   - Review file permissions

### Debug Mode

Enable debug logging:

```bash
DEBUG=smartwiki:agents npm run dev
```

### Health Checks

Monitor system health:

```bash
curl http://localhost:3001/health
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Document new features
- Maintain backwards compatibility
- Use semantic versioning

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🙏 Acknowledgments

- **Mistral AI** for providing cost-effective AI inference
- **AWS Bedrock** for RAG capabilities
- **Prisma** for database management
- **React** for frontend components

---

For more information, see the [main project documentation](../../README.md) or contact the development team.