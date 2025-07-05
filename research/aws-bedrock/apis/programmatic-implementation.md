# AWS Bedrock Knowledge Base: Programmatic APIs & Implementation

## 🎯 API Integration Analyst Research
*Detailed programmatic implementation guide for AWS Bedrock Knowledge Base*

## 🔧 Core API Structure

### Bedrock Service Clients

AWS Bedrock Knowledge Base requires multiple boto3 clients for different operations:

```python
import boto3
from botocore.exceptions import ClientError
import json

# Core Bedrock clients
bedrock_client = boto3.client('bedrock')                    # Management operations
bedrock_agent_client = boto3.client('bedrock-agent')        # Knowledge base operations
bedrock_runtime_client = boto3.client('bedrock-runtime')    # Model invocation
bedrock_agent_runtime = boto3.client('bedrock-agent-runtime') # KB queries
```

## 📚 Knowledge Base Management APIs

### 1. Create Knowledge Base

```python
def create_knowledge_base(
    name: str,
    role_arn: str,
    embedding_model_arn: str,
    vector_store_config: dict,
    description: str = None
):
    """
    Create a new knowledge base with vector store configuration
    """
    knowledge_base_config = {
        "type": "VECTOR",
        "vectorKnowledgeBaseConfiguration": {
            "embeddingModelArn": embedding_model_arn,
            "embeddingModelConfiguration": {
                "embeddingModelType": "FLOAT32"  # or "BINARY"
            }
        }
    }
    
    try:
        response = bedrock_agent_client.create_knowledge_base(
            name=name,
            description=description,
            roleArn=role_arn,
            knowledgeBaseConfiguration=knowledge_base_config,
            storageConfiguration=vector_store_config
        )
        return response
    except ClientError as e:
        print(f"Error creating knowledge base: {e}")
        raise

# Example vector store configurations
opensearch_config = {
    "type": "OPENSEARCH_SERVERLESS",
    "opensearchServerlessConfiguration": {
        "collectionArn": "arn:aws:aoss:region:account:collection/collection-name",
        "vectorIndexName": "my-index",
        "fieldMapping": {
            "vectorField": "vector",
            "textField": "text",
            "metadataField": "metadata"
        }
    }
}

aurora_config = {
    "type": "RDS",
    "rdsConfiguration": {
        "resourceArn": "arn:aws:rds:region:account:cluster:cluster-name",
        "credentialsSecretArn": "arn:aws:secretsmanager:region:account:secret:secret-name",
        "databaseName": "vector_db",
        "tableName": "embeddings",
        "fieldMapping": {
            "vectorField": "embedding",
            "textField": "content",
            "metadataField": "metadata",
            "primaryKeyField": "id"
        }
    }
}

pinecone_config = {
    "type": "PINECONE",
    "pineconeConfiguration": {
        "connectionString": "https://your-index.svc.environment.pinecone.io",
        "credentialsSecretArn": "arn:aws:secretsmanager:region:account:secret:pinecone-api-key",
        "namespace": "my-namespace",
        "fieldMapping": {
            "textField": "text",
            "metadataField": "metadata"
        }
    }
}
```

### 2. Data Source Management

```python
def create_data_source(
    knowledge_base_id: str,
    name: str,
    s3_config: dict,
    chunking_config: dict = None
):
    """
    Create a data source for the knowledge base
    """
    data_source_config = {
        "type": "S3",
        "s3Configuration": s3_config
    }
    
    # Advanced chunking configuration
    if chunking_config:
        data_source_config["chunkingConfiguration"] = chunking_config
    
    try:
        response = bedrock_agent_client.create_data_source(
            knowledgeBaseId=knowledge_base_id,
            name=name,
            dataSourceConfiguration=data_source_config
        )
        return response
    except ClientError as e:
        print(f"Error creating data source: {e}")
        raise

# S3 configuration example
s3_config = {
    "bucketArn": "arn:aws:s3:::my-knowledge-bucket",
    "inclusionPrefixes": ["documents/", "manuals/"],
    "exclusionPrefixes": ["temp/", "archive/"]
}

# Chunking configurations
semantic_chunking = {
    "chunkingStrategy": "SEMANTIC",
    "semanticChunkingConfiguration": {
        "maxTokens": 300,
        "bufferSize": 0,
        "breakpointPercentileThreshold": 95
    }
}

hierarchical_chunking = {
    "chunkingStrategy": "HIERARCHICAL",
    "hierarchicalChunkingConfiguration": {
        "levelConfigurations": [
            {
                "maxTokens": 1500
            },
            {
                "maxTokens": 300
            }
        ],
        "overlapTokens": 60
    }
}

custom_chunking = {
    "chunkingStrategy": "NONE"  # Use for custom Lambda chunking
}
```

### 3. Knowledge Base Operations

```python
def sync_data_source(knowledge_base_id: str, data_source_id: str):
    """
    Trigger data source synchronization
    """
    try:
        response = bedrock_agent_client.start_ingestion_job(
            knowledgeBaseId=knowledge_base_id,
            dataSourceId=data_source_id
        )
        return response
    except ClientError as e:
        print(f"Error starting ingestion: {e}")
        raise

def get_knowledge_base(knowledge_base_id: str):
    """
    Retrieve knowledge base details
    """
    try:
        response = bedrock_agent_client.get_knowledge_base(
            knowledgeBaseId=knowledge_base_id
        )
        return response
    except ClientError as e:
        print(f"Error getting knowledge base: {e}")
        raise

def list_knowledge_bases():
    """
    List all knowledge bases
    """
    try:
        response = bedrock_agent_client.list_knowledge_bases()
        return response
    except ClientError as e:
        print(f"Error listing knowledge bases: {e}")
        raise

def delete_knowledge_base(knowledge_base_id: str):
    """
    Delete a knowledge base
    """
    try:
        response = bedrock_agent_client.delete_knowledge_base(
            knowledgeBaseId=knowledge_base_id
        )
        return response
    except ClientError as e:
        print(f"Error deleting knowledge base: {e}")
        raise
```

## 🔍 Query & Retrieval APIs

### 1. Retrieve API (Document Retrieval Only)

```python
def retrieve_documents(
    knowledge_base_id: str,
    query: str,
    max_results: int = 10,
    metadata_filters: dict = None
):
    """
    Retrieve relevant documents without generation
    """
    retrieval_config = {
        "vectorSearchConfiguration": {
            "numberOfResults": max_results
        }
    }
    
    # Add metadata filtering if provided
    if metadata_filters:
        retrieval_config["vectorSearchConfiguration"]["filter"] = metadata_filters
    
    try:
        response = bedrock_agent_runtime.retrieve(
            knowledgeBaseId=knowledge_base_id,
            retrievalQuery={"text": query},
            retrievalConfiguration=retrieval_config
        )
        return response
    except ClientError as e:
        print(f"Error retrieving documents: {e}")
        raise

# Metadata filter examples
metadata_filters = {
    "andAll": [
        {
            "equals": {
                "key": "department",
                "value": "engineering"
            }
        },
        {
            "in": {
                "key": "document_type",
                "value": ["manual", "specification"]
            }
        }
    ]
}
```

### 2. RetrieveAndGenerate API (RAG Complete)

```python
def retrieve_and_generate(
    knowledge_base_id: str,
    query: str,
    model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0",
    max_results: int = 10,
    session_id: str = None,
    metadata_filters: dict = None
):
    """
    Perform RAG: retrieve documents and generate response
    """
    retrieval_config = {
        "type": "KNOWLEDGE_BASE",
        "knowledgeBaseConfiguration": {
            "knowledgeBaseId": knowledge_base_id,
            "modelArn": f"arn:aws:bedrock:us-east-1::foundation-model/{model_id}",
            "retrievalConfiguration": {
                "vectorSearchConfiguration": {
                    "numberOfResults": max_results
                }
            }
        }
    }
    
    # Add metadata filtering
    if metadata_filters:
        retrieval_config["knowledgeBaseConfiguration"]["retrievalConfiguration"]["vectorSearchConfiguration"]["filter"] = metadata_filters
    
    request_params = {
        "input": {"text": query},
        "retrieveAndGenerateConfiguration": retrieval_config
    }
    
    # Add session management for multi-turn conversations
    if session_id:
        request_params["sessionId"] = session_id
    
    try:
        response = bedrock_agent_runtime.retrieve_and_generate(**request_params)
        return response
    except ClientError as e:
        print(f"Error in retrieve and generate: {e}")
        raise

def extract_response_data(response):
    """
    Extract key information from RAG response
    """
    result = {
        "answer": response["output"]["text"],
        "session_id": response.get("sessionId"),
        "citations": []
    }
    
    # Extract citations with source attribution
    for citation in response.get("citations", []):
        for reference in citation.get("retrievedReferences", []):
            result["citations"].append({
                "content": reference["content"]["text"],
                "location": reference["location"],
                "metadata": reference.get("metadata", {})
            })
    
    return result
```

### 3. Advanced Query Patterns

```python
def structured_data_query(
    knowledge_base_id: str,
    sql_query: str,
    model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"
):
    """
    Query structured data sources (requires structured data configuration)
    """
    retrieval_config = {
        "type": "KNOWLEDGE_BASE",
        "knowledgeBaseConfiguration": {
            "knowledgeBaseId": knowledge_base_id,
            "modelArn": f"arn:aws:bedrock:us-east-1::foundation-model/{model_id}",
            "retrievalConfiguration": {
                "structuredSearchConfiguration": {
                    "queryString": sql_query
                }
            }
        }
    }
    
    try:
        response = bedrock_agent_runtime.retrieve_and_generate(
            input={"text": f"Execute this query: {sql_query}"},
            retrieveAndGenerateConfiguration=retrieval_config
        )
        return response
    except ClientError as e:
        print(f"Error in structured query: {e}")
        raise

def multimodal_query(
    knowledge_base_id: str,
    text_query: str,
    image_base64: str = None,
    model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"
):
    """
    Query with both text and image inputs
    """
    input_content = [{"text": text_query}]
    
    if image_base64:
        input_content.append({
            "image": {
                "format": "jpeg",  # or "png"
                "source": {"bytes": image_base64}
            }
        })
    
    retrieval_config = {
        "type": "KNOWLEDGE_BASE",
        "knowledgeBaseConfiguration": {
            "knowledgeBaseId": knowledge_base_id,
            "modelArn": f"arn:aws:bedrock:us-east-1::foundation-model/{model_id}"
        }
    }
    
    try:
        response = bedrock_agent_runtime.retrieve_and_generate(
            input={"text": text_query},  # Main text query
            retrieveAndGenerateConfiguration=retrieval_config
        )
        return response
    except ClientError as e:
        print(f"Error in multimodal query: {e}")
        raise
```

## 🛠️ Utility Functions & Error Handling

### 1. Authentication & Permissions

```python
def verify_bedrock_access():
    """
    Verify Bedrock service access and permissions
    """
    try:
        # Test basic Bedrock access
        models = bedrock_client.list_foundation_models()
        print(f"Found {len(models['modelSummaries'])} foundation models")
        
        # Test Knowledge Base access
        kbs = bedrock_agent_client.list_knowledge_bases()
        print(f"Found {len(kbs['knowledgeBaseSummaries'])} knowledge bases")
        
        return True
    except ClientError as e:
        print(f"Access verification failed: {e}")
        return False

def create_bedrock_role(role_name: str):
    """
    Create IAM role with necessary Bedrock permissions
    """
    iam = boto3.client('iam')
    
    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "bedrock.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }
    
    # Create role
    try:
        response = iam.create_role(
            RoleName=role_name,
            AssumeRolePolicyDocument=json.dumps(trust_policy),
            Description="Role for Amazon Bedrock Knowledge Base operations"
        )
        
        # Attach required policies
        policies = [
            "arn:aws:iam::aws:policy/AmazonBedrockFullAccess",
            "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
        ]
        
        for policy_arn in policies:
            iam.attach_role_policy(
                RoleName=role_name,
                PolicyArn=policy_arn
            )
        
        return response["Role"]["Arn"]
    except ClientError as e:
        print(f"Error creating role: {e}")
        raise
```

### 2. Monitoring & Logging

```python
import logging
from datetime import datetime

def setup_logging():
    """
    Configure logging for Bedrock operations
    """
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('bedrock_operations.log'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger('bedrock_kb')

def monitor_ingestion_job(knowledge_base_id: str, data_source_id: str, job_id: str):
    """
    Monitor data source ingestion progress
    """
    logger = setup_logging()
    
    while True:
        try:
            response = bedrock_agent_client.get_ingestion_job(
                knowledgeBaseId=knowledge_base_id,
                dataSourceId=data_source_id,
                ingestionJobId=job_id
            )
            
            status = response["ingestionJob"]["status"]
            logger.info(f"Ingestion job {job_id} status: {status}")
            
            if status in ["COMPLETE", "FAILED"]:
                break
                
            time.sleep(30)  # Wait 30 seconds before checking again
            
        except ClientError as e:
            logger.error(f"Error monitoring ingestion: {e}")
            break
    
    return response
```

### 3. Performance Optimization

```python
def batch_query_knowledge_base(
    knowledge_base_id: str,
    queries: List[str],
    model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0",
    session_id: str = None
):
    """
    Efficiently process multiple queries
    """
    results = []
    
    for i, query in enumerate(queries):
        try:
            # Use consistent session ID for related queries
            current_session = f"{session_id}_{i}" if session_id else None
            
            response = retrieve_and_generate(
                knowledge_base_id=knowledge_base_id,
                query=query,
                model_id=model_id,
                session_id=current_session
            )
            
            results.append({
                "query": query,
                "response": extract_response_data(response),
                "timestamp": datetime.now().isoformat()
            })
            
        except ClientError as e:
            results.append({
                "query": query,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
    
    return results

def optimize_chunking_strategy(
    content_type: str,
    average_document_length: int
) -> dict:
    """
    Recommend optimal chunking strategy based on content characteristics
    """
    if content_type in ["technical_docs", "legal", "research"]:
        if average_document_length > 2000:
            return hierarchical_chunking
        else:
            return semantic_chunking
    elif content_type in ["faq", "support", "chat"]:
        return {
            "chunkingStrategy": "FIXED_SIZE",
            "fixedSizeChunkingConfiguration": {
                "maxTokens": 200,
                "overlapPercentage": 10
            }
        }
    else:
        return semantic_chunking
```

## 🔄 Integration Patterns

### 1. Web Application Integration

```python
from flask import Flask, request, jsonify
import uuid

app = Flask(__name__)

class BedrockKBService:
    def __init__(self, knowledge_base_id: str):
        self.knowledge_base_id = knowledge_base_id
        self.bedrock_agent_runtime = boto3.client('bedrock-agent-runtime')
    
    def chat(self, message: str, session_id: str = None):
        """
        Handle chat interface with knowledge base
        """
        if not session_id:
            session_id = str(uuid.uuid4())
        
        response = retrieve_and_generate(
            knowledge_base_id=self.knowledge_base_id,
            query=message,
            session_id=session_id
        )
        
        return extract_response_data(response)

kb_service = BedrockKBService(knowledge_base_id="YOUR_KB_ID")

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message')
    session_id = data.get('session_id')
    
    try:
        result = kb_service.chat(message, session_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

### 2. Streaming Response Integration

```python
def stream_rag_response(
    knowledge_base_id: str,
    query: str,
    model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"
):
    """
    Stream responses for better user experience
    """
    # First, retrieve documents
    retrieval_response = retrieve_documents(
        knowledge_base_id=knowledge_base_id,
        query=query,
        max_results=5
    )
    
    # Extract context from retrieved documents
    context = "\n\n".join([
        result["content"]["text"] 
        for result in retrieval_response["retrievalResults"]
    ])
    
    # Create augmented prompt
    augmented_prompt = f"""
    Based on the following context, answer the user's question:
    
    Context:
    {context}
    
    Question: {query}
    
    Answer:
    """
    
    # Stream response using invoke_model_with_response_stream
    request_body = {
        "inputText": augmented_prompt,
        "textGenerationConfig": {
            "maxTokenCount": 1000,
            "temperature": 0.7,
            "topP": 0.9
        }
    }
    
    try:
        response = bedrock_runtime_client.invoke_model_with_response_stream(
            modelId="amazon.titan-text-express-v1",
            body=json.dumps(request_body)
        )
        
        # Process streaming response
        for event in response["body"]:
            chunk = json.loads(event["chunk"]["bytes"])
            if "outputText" in chunk:
                yield chunk["outputText"]
                
    except ClientError as e:
        yield f"Error: {e}"
```

## 📊 Best Practices Summary

### Performance Optimization
1. **Batch Operations**: Group multiple queries when possible
2. **Session Management**: Reuse sessions for related conversations
3. **Caching**: Implement response caching for repeated queries
4. **Metadata Filtering**: Use filters to reduce search space

### Security Best Practices
1. **IAM Roles**: Use least-privilege IAM roles
2. **Encryption**: Enable encryption at rest and in transit
3. **VPC Endpoints**: Use VPC endpoints for private communication
4. **Audit Logging**: Enable CloudTrail logging for all operations

### Cost Optimization
1. **Right-size Models**: Choose appropriate foundation models
2. **Binary Embeddings**: Use binary vectors when precision allows
3. **Efficient Chunking**: Optimize chunk size for your use case
4. **Query Optimization**: Use specific queries to reduce processing

---

This comprehensive API guide provides the foundation for programmatic implementation of AWS Bedrock Knowledge Base. The next phase will focus on RAG implementation patterns and architectural best practices.