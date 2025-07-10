-- SmartWiki pgvector Schema for Compliance Document Management
-- This schema implements enterprise-grade vector search with multi-tenant support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Optimized documents table for vector search
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    
    -- Vector embeddings (1536 dimensions for OpenAI/Titan compatibility)
    embedding VECTOR(1536) NOT NULL,
    
    -- Multi-tenant support
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Document classification
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'policy', 'procedure', 'regulation', 'standard', 'guideline', 'memo', 'report'
    )),
    
    -- Compliance metadata
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Security classification
    classification VARCHAR(20) NOT NULL DEFAULT 'internal' CHECK (classification IN (
        'public', 'internal', 'confidential', 'restricted', 'top_secret'
    )),
    
    -- Document status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
        'active', 'archived', 'deleted', 'under_review'
    )),
    
    -- File information
    file_path VARCHAR(1000),
    file_size INTEGER,
    file_type VARCHAR(50),
    checksum VARCHAR(64),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    
    -- Version control
    version INTEGER NOT NULL DEFAULT 1,
    previous_version_id UUID REFERENCES documents(id),
    
    -- Compliance tracking
    compliance_score DECIMAL(3,2) DEFAULT 0.00,
    last_compliance_check TIMESTAMP WITH TIME ZONE,
    compliance_status VARCHAR(20) DEFAULT 'pending' CHECK (compliance_status IN (
        'pending', 'compliant', 'non_compliant', 'review_required'
    ))
);

-- High-performance indexes for vector search
CREATE INDEX idx_documents_embedding_hnsw ON documents 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Alternative IVFFlat index for different use cases
-- CREATE INDEX idx_documents_embedding_ivfflat ON documents 
-- USING ivfflat (embedding vector_cosine_ops) 
-- WITH (lists = 100);

-- Tenant-based partitioning support indexes
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX idx_documents_tenant_type ON documents(tenant_id, document_type);
CREATE INDEX idx_documents_tenant_status ON documents(tenant_id, status) WHERE status = 'active';

-- Compliance-specific indexes
CREATE INDEX idx_documents_compliance ON documents USING GIN(metadata);
CREATE INDEX idx_documents_classification ON documents(classification, tenant_id);
CREATE INDEX idx_documents_compliance_status ON documents(compliance_status, tenant_id);

-- Full-text search support
CREATE INDEX idx_documents_content_fts ON documents USING gin(to_tsvector('english', title || ' ' || content));

-- Temporal indexes for audit and compliance
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_updated_at ON documents(updated_at);
CREATE INDEX idx_documents_compliance_check ON documents(last_compliance_check);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY tenant_isolation ON documents
    FOR ALL TO authenticated
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Department-based access control
CREATE POLICY department_access ON documents
    FOR SELECT TO authenticated
    USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND (
            metadata->>'department' = current_setting('app.current_department')
            OR current_setting('app.user_role') = 'admin'
            OR classification = 'public'
        )
    );

-- Classification-based security
CREATE POLICY classification_access ON documents
    FOR SELECT TO authenticated
    USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND (
            CASE 
                WHEN classification = 'public' THEN true
                WHEN classification = 'internal' THEN current_setting('app.user_clearance')::integer >= 1
                WHEN classification = 'confidential' THEN current_setting('app.user_clearance')::integer >= 2
                WHEN classification = 'restricted' THEN current_setting('app.user_clearance')::integer >= 3
                WHEN classification = 'top_secret' THEN current_setting('app.user_clearance')::integer >= 4
                ELSE false
            END
        )
    );

-- Compliance officer access
CREATE POLICY compliance_officer_access ON documents
    FOR ALL TO compliance_officer
    USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND (
            metadata ? 'compliance_tags'
            OR compliance_status != 'compliant'
        )
    );

-- Document chunks table for hierarchical chunking
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_embedding VECTOR(1536) NOT NULL,
    chunk_metadata JSONB DEFAULT '{}',
    
    -- Hierarchical chunking support
    parent_chunk_id UUID REFERENCES document_chunks(id),
    chunk_level INTEGER NOT NULL DEFAULT 1,
    
    -- Tenant isolation
    tenant_id UUID NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(document_id, chunk_index)
);

-- Indexes for chunk-based search
CREATE INDEX idx_chunks_embedding ON document_chunks 
USING hnsw (chunk_embedding vector_cosine_ops);

CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_tenant ON document_chunks(tenant_id);
CREATE INDEX idx_chunks_hierarchy ON document_chunks(parent_chunk_id, chunk_level);

-- Compliance standards table
CREATE TABLE compliance_standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    requirements JSONB NOT NULL DEFAULT '[]',
    
    -- Tenant support
    tenant_id UUID NOT NULL,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(name, version, tenant_id)
);

CREATE INDEX idx_compliance_standards_tenant ON compliance_standards(tenant_id);
CREATE INDEX idx_compliance_standards_category ON compliance_standards(category, tenant_id);

-- Document compliance mapping
CREATE TABLE document_compliance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    standard_id UUID NOT NULL REFERENCES compliance_standards(id) ON DELETE CASCADE,
    
    compliance_score DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    gap_analysis JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    
    -- Audit trail
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assessed_by UUID NOT NULL,
    
    -- Tenant isolation
    tenant_id UUID NOT NULL,
    
    UNIQUE(document_id, standard_id)
);

CREATE INDEX idx_document_compliance_document ON document_compliance(document_id);
CREATE INDEX idx_document_compliance_standard ON document_compliance(standard_id);
CREATE INDEX idx_document_compliance_tenant ON document_compliance(tenant_id);
CREATE INDEX idx_document_compliance_score ON document_compliance(compliance_score);

-- Optimized vector search functions
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INTEGER DEFAULT 10,
    tenant_filter UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(500),
    content TEXT,
    similarity FLOAT,
    metadata JSONB,
    document_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.content,
        1 - (d.embedding <=> query_embedding) AS similarity,
        d.metadata,
        d.document_type,
        d.created_at
    FROM documents d
    WHERE 
        (tenant_filter IS NULL OR d.tenant_id = tenant_filter)
        AND d.status = 'active'
        AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function for semantic search with filters
CREATE OR REPLACE FUNCTION semantic_search(
    query_embedding VECTOR(1536),
    tenant_filter UUID,
    document_types TEXT[] DEFAULT NULL,
    classification_filter VARCHAR(20) DEFAULT NULL,
    compliance_filter TEXT[] DEFAULT NULL,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(500),
    content TEXT,
    similarity FLOAT,
    metadata JSONB,
    document_type VARCHAR(50),
    classification VARCHAR(20),
    compliance_score DECIMAL(3,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.content,
        1 - (d.embedding <=> query_embedding) AS similarity,
        d.metadata,
        d.document_type,
        d.classification,
        d.compliance_score
    FROM documents d
    WHERE 
        d.tenant_id = tenant_filter
        AND d.status = 'active'
        AND (document_types IS NULL OR d.document_type = ANY(document_types))
        AND (classification_filter IS NULL OR d.classification = classification_filter)
        AND (compliance_filter IS NULL OR d.metadata->>'compliance_tags' ?| compliance_filter)
        AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function for hybrid search (vector + full-text)
CREATE OR REPLACE FUNCTION hybrid_search(
    query_text TEXT,
    query_embedding VECTOR(1536),
    tenant_filter UUID,
    match_count INTEGER DEFAULT 10,
    vector_weight FLOAT DEFAULT 0.7,
    text_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(500),
    content TEXT,
    combined_score FLOAT,
    vector_similarity FLOAT,
    text_rank FLOAT,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.content,
        (vector_weight * (1 - (d.embedding <=> query_embedding))) + 
        (text_weight * ts_rank(to_tsvector('english', d.title || ' ' || d.content), plainto_tsquery(query_text))) AS combined_score,
        1 - (d.embedding <=> query_embedding) AS vector_similarity,
        ts_rank(to_tsvector('english', d.title || ' ' || d.content), plainto_tsquery(query_text)) AS text_rank,
        d.metadata
    FROM documents d
    WHERE 
        d.tenant_id = tenant_filter
        AND d.status = 'active'
        AND (
            to_tsvector('english', d.title || ' ' || d.content) @@ plainto_tsquery(query_text)
            OR 1 - (d.embedding <=> query_embedding) > 0.5
        )
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$;

-- Compliance gap analysis function
CREATE OR REPLACE FUNCTION analyze_compliance_gaps(
    doc_id UUID,
    standard_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    doc_embedding VECTOR(1536);
    standard_requirements JSONB;
    gap_analysis JSONB;
    requirement JSONB;
    similarity FLOAT;
BEGIN
    -- Get document embedding
    SELECT embedding INTO doc_embedding FROM documents WHERE id = doc_id;
    
    -- Get standard requirements
    SELECT requirements INTO standard_requirements FROM compliance_standards WHERE id = standard_id;
    
    -- Initialize gap analysis
    gap_analysis := '[]'::JSONB;
    
    -- Analyze each requirement
    FOR requirement IN SELECT * FROM jsonb_array_elements(standard_requirements)
    LOOP
        -- Calculate similarity between document and requirement
        -- Note: This is simplified - in practice, you'd embed the requirement text
        similarity := 0.5; -- Placeholder
        
        -- Add to gap analysis
        gap_analysis := gap_analysis || jsonb_build_object(
            'requirement_id', requirement->>'id',
            'requirement_text', requirement->>'text',
            'similarity', similarity,
            'status', CASE 
                WHEN similarity > 0.8 THEN 'compliant'
                WHEN similarity > 0.6 THEN 'partial'
                ELSE 'non_compliant'
            END
        );
    END LOOP;
    
    RETURN gap_analysis;
END;
$$;

-- Trigger to update document timestamp
CREATE OR REPLACE FUNCTION update_document_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_timestamp
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_timestamp();

-- Trigger to maintain version history
CREATE OR REPLACE FUNCTION maintain_document_version()
RETURNS TRIGGER AS $$
BEGIN
    -- If content or title changed, increment version
    IF OLD.content != NEW.content OR OLD.title != NEW.title THEN
        NEW.version = OLD.version + 1;
        NEW.previous_version_id = OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintain_document_versions
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION maintain_document_version();

-- Vacuum and analyze commands for maintenance
-- These should be run periodically to maintain performance
/*
VACUUM ANALYZE documents;
VACUUM ANALYZE document_chunks;
VACUUM ANALYZE document_compliance;

-- Reindex vector indexes periodically
REINDEX INDEX idx_documents_embedding_hnsw;
REINDEX INDEX idx_chunks_embedding;
*/

-- Performance monitoring views
CREATE OR REPLACE VIEW document_statistics AS
SELECT 
    tenant_id,
    document_type,
    classification,
    COUNT(*) as document_count,
    AVG(compliance_score) as avg_compliance_score,
    COUNT(CASE WHEN compliance_status = 'compliant' THEN 1 END) as compliant_count,
    COUNT(CASE WHEN compliance_status = 'non_compliant' THEN 1 END) as non_compliant_count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_age_seconds
FROM documents
WHERE status = 'active'
GROUP BY tenant_id, document_type, classification;

CREATE OR REPLACE VIEW compliance_dashboard AS
SELECT 
    d.tenant_id,
    cs.name as standard_name,
    cs.category,
    COUNT(dc.id) as assessed_documents,
    AVG(dc.compliance_score) as avg_compliance_score,
    COUNT(CASE WHEN dc.compliance_score >= 0.8 THEN 1 END) as compliant_count,
    COUNT(CASE WHEN dc.compliance_score < 0.6 THEN 1 END) as non_compliant_count
FROM documents d
JOIN document_compliance dc ON d.id = dc.document_id
JOIN compliance_standards cs ON dc.standard_id = cs.id
WHERE d.status = 'active'
GROUP BY d.tenant_id, cs.name, cs.category;

-- Indexes for the views
CREATE INDEX idx_documents_stats ON documents(tenant_id, document_type, classification, status);
CREATE INDEX idx_compliance_stats ON document_compliance(tenant_id, compliance_score);

-- Comments for documentation
COMMENT ON TABLE documents IS 'Main table for storing compliance documents with vector embeddings';
COMMENT ON COLUMN documents.embedding IS 'Vector embedding for semantic search (1536 dimensions)';
COMMENT ON COLUMN documents.metadata IS 'Flexible JSON metadata including compliance tags, department, etc.';
COMMENT ON COLUMN documents.classification IS 'Security classification level for access control';
COMMENT ON FUNCTION match_documents IS 'Optimized vector similarity search function';
COMMENT ON FUNCTION semantic_search IS 'Advanced semantic search with multiple filters';
COMMENT ON FUNCTION hybrid_search IS 'Combines vector similarity with full-text search';