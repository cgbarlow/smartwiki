# AWS Bedrock Knowledge Base Research Summary

## Executive Summary

This research analyzes AWS Bedrock Knowledge Base integration options, database coupling constraints, and alternative RAG architectures for cost-effective SmartWiki implementation.

## Key Findings

### 1. Database Coupling Analysis

**AWS Bedrock Knowledge Base is NOT hard-wired to OpenSearch Serverless:**
- Multiple vector database options supported:
  - Amazon OpenSearch Serverless (primary option)
  - Amazon Aurora PostgreSQL with pgvector ✅
  - Amazon Neptune Analytics
  - Pinecone
  - MongoDB Atlas
  - Redis Enterprise Cloud

**Critical Constraint:**
- **Standard PostgreSQL (including Supabase) is NOT supported**
- Only Aurora PostgreSQL with pgvector is supported for PostgreSQL-based vector storage
- Specific data sources (Confluence, SharePoint, Salesforce) require OpenSearch Serverless exclusively

### 2. Integration Architecture Options

#### Option A: Native (Managed)
- **Stack:** Bedrock Knowledge Base + OpenSearch Serverless
- **Cost:** $350-976/month (minimum 4 OCUs)
- **Pros:** Fully managed, integrated features
- **Cons:** High cost, limited flexibility

#### Option B: Aurora PostgreSQL (Semi-managed)
- **Stack:** Bedrock Knowledge Base + Aurora PostgreSQL with pgvector
- **Cost:** Significantly lower with Aurora Serverless v2 (scales to 0 ACUs)
- **Pros:** Cost-effective, ACID compliance, familiar PostgreSQL
- **Cons:** Still requires Aurora (not standard PostgreSQL)

#### Option C: Custom RAG (Flexible)
- **Stack:** Bedrock Models API + External Vector DB (Supabase pgvector)
- **Cost:** Model API calls only + vector storage costs
- **Pros:** Full control, cost-effective, use any vector database
- **Cons:** Custom implementation required

### 3. Technical Constraints

#### Data Source Requirements
- **S3 Integration:** Primary data source, supports up to 50MB files
- **Direct Database:** Limited to structured data via Amazon Redshift query engine
- **Multi-source:** Up to 5 data sources per Knowledge Base
- **Direct Ingestion:** API-based document ingestion (up to 25 documents via API)

#### Vector Database Limitations
- **pgvector Version:** Must use 0.5.0+ with HNSW indexing
- **Binary Vectors:** Only OpenSearch Serverless and Aurora PostgreSQL support binary embeddings
- **Regional Constraints:** Vector database must be in same region as Knowledge Base

### 4. Alternative RAG Approaches

#### Custom RAG Pipeline with Bedrock Models
```
Document → Chunking → Embedding (Titan) → Vector Store (Supabase) → Retrieval → Generation (Claude)
```

**Benefits:**
- **Cost-effective:** Titan Embeddings at $0.00011 per 1,000 tokens
- **Flexible:** Use any vector database (Supabase pgvector)
- **Scalable:** Custom chunking and retrieval strategies

#### Bedrock Agents with Lambda Functions
- Use Action Groups with Lambda functions for custom retrieval
- Connect to any external data source or API
- Maintain conversational context and complex workflows

### 5. Cost Analysis

#### Embedding Costs
- **Titan Embeddings V2:** $0.00011 per 1,000 tokens (most cost-effective)
- **Claude 3.7 Sonnet:** $0.003 per 1,000 input tokens + $0.015 per 1,000 output tokens
- **Knowledge Base Service:** $0.002 per GenerateQuery API call

#### Storage Costs
- **OpenSearch Serverless:** $260+ monthly (minimum 4 OCUs)
- **Aurora PostgreSQL:** Variable, scales to 0 ACUs with Serverless v2
- **Supabase pgvector:** External pricing, significantly lower for small-medium workloads

### 6. Recommended "Best of Both Worlds" Architecture

#### Hybrid Approach: Custom RAG with Bedrock Models
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Documents     │───→│  Custom Pipeline │───→│ Supabase Vector │
│   (S3, DB)      │    │  (Lambda/ECS)    │    │   (pgvector)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                  │
                                  ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Query    │───→│  Retrieval +     │───→│  Bedrock Models │
│                 │    │  Augmentation    │    │  (Claude/Titan) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Implementation Steps:**
1. **Document Processing:** Custom pipeline for chunking and embedding
2. **Vector Storage:** Supabase pgvector for cost-effective storage
3. **Retrieval:** Custom similarity search with filtering
4. **Generation:** Direct Bedrock API calls (Claude for generation, Titan for embeddings)

#### Cost Benefits
- **Embeddings:** ~90% cost reduction vs Claude models
- **Storage:** ~80% cost reduction vs OpenSearch Serverless
- **Flexibility:** Full control over retrieval logic and data sources

### 7. Multi-tenant Data Isolation

#### Supabase Advantages
- **Row Level Security (RLS):** Fine-grained access control
- **User-scoped queries:** Filter vectors by user permissions
- **ACID compliance:** Consistent data operations

#### Implementation
```sql
-- Enable RLS on vector table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policy for user-scoped access
CREATE POLICY documents_policy ON documents
  FOR ALL TO authenticated
  USING (user_id = auth.uid());
```

## Recommendations

### For SmartWiki Implementation

1. **Start with Custom RAG Pipeline:**
   - Use Supabase pgvector for vector storage
   - Implement custom document processing pipeline
   - Use Bedrock Titan for embeddings, Claude for generation

2. **Gradual Migration Path:**
   - Phase 1: Proof of concept with custom pipeline
   - Phase 2: Scale with optimized chunking strategies
   - Phase 3: Consider Aurora PostgreSQL if AWS-native features needed

3. **Cost Optimization Strategy:**
   - Use Titan embeddings for cost-effective vector generation
   - Implement smart caching for frequently accessed documents
   - Batch processing for document ingestion

### Technical Implementation

#### Document Processing Pipeline
```python
# Example processing flow
def process_document(document):
    chunks = custom_chunker(document)
    embeddings = bedrock_titan_embed(chunks)
    supabase_store(embeddings, metadata)
    
def query_rag(user_query, user_id):
    query_vector = bedrock_titan_embed(user_query)
    results = supabase_search(query_vector, user_id)
    response = bedrock_claude_generate(user_query, results)
    return response
```

#### Vector Storage Schema
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    content TEXT,
    embedding VECTOR(1536),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);
```

## Conclusion

**AWS Bedrock Knowledge Base provides excellent managed features but comes with significant cost and flexibility constraints.** For SmartWiki, a custom RAG implementation using Supabase pgvector for storage and Bedrock models for AI capabilities offers the optimal balance of cost, flexibility, and performance.

**Key Success Factors:**
- Implement robust document processing pipeline
- Use Titan embeddings for cost optimization
- Leverage Supabase RLS for multi-tenant security
- Design for gradual scaling and feature expansion

This approach achieves the "best of both worlds" by combining cost-effective vector storage with powerful AI generation capabilities.