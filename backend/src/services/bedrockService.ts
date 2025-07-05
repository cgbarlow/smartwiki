import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  RetrieveAndGenerateCommand,
  RetrieveAndGenerateCommandInput,
  RetrieveCommandInput,
} from '@aws-sdk/client-bedrock-agent-runtime';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { config } from '@/config/config';
import { logger } from '@/utils/logger';
import { CacheService } from './cacheService';
import { z } from 'zod';

// Validation schemas
const QueryInputSchema = z.object({
  query: z.string().min(1).max(4000),
  sessionId: z.string().optional(),
  knowledgeBaseId: z.string().optional(),
  maxResults: z.number().int().min(1).max(100).default(10),
  filters: z.record(z.any()).optional(),
  modelId: z.string().optional(),
});

const RetrievalConfigSchema = z.object({
  searchType: z.enum(['HYBRID', 'SEMANTIC', 'KEYWORD']).default('HYBRID'),
  numberOfResults: z.number().int().min(1).max(100).default(10),
  includeMetadata: z.boolean().default(true),
  scoreThreshold: z.number().min(0).max(1).optional(),
});

export interface QueryInput {
  query: string;
  sessionId?: string;
  knowledgeBaseId?: string;
  maxResults?: number;
  filters?: Record<string, any>;
  modelId?: string;
}

export interface RetrievalConfig {
  searchType?: 'HYBRID' | 'SEMANTIC' | 'KEYWORD';
  numberOfResults?: number;
  includeMetadata?: boolean;
  scoreThreshold?: number;
}

export interface QueryResult {
  answer: string;
  citations: Citation[];
  sessionId?: string;
  metadata: {
    responseTime: number;
    tokenUsage?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    modelUsed: string;
    retrievalCount: number;
    confidenceScore?: number;
  };
}

export interface Citation {
  content: string;
  source: {
    type: string;
    location?: {
      s3Location?: {
        uri: string;
      };
      webLocation?: {
        url: string;
      };
    };
  };
  metadata?: Record<string, any>;
  confidenceScore?: number;
}

export interface RetrievalResult {
  documents: RetrievedDocument[];
  metadata: {
    responseTime: number;
    totalResults: number;
    searchType: string;
  };
}

export interface RetrievedDocument {
  content: string;
  location: {
    type: string;
    s3Location?: {
      uri: string;
    };
    webLocation?: {
      url: string;
    };
  };
  metadata?: Record<string, any>;
  score?: number;
}

/**
 * AWS Bedrock Knowledge Base Service
 * Provides RAG capabilities using AWS Bedrock Knowledge Bases
 */
export class BedrockService {
  private bedrockAgentRuntime: BedrockAgentRuntimeClient;
  private bedrockRuntime: BedrockRuntimeClient;
  private cacheService: CacheService;
  private defaultKnowledgeBaseId: string;
  private defaultModelId: string;

  constructor() {
    // Initialize AWS clients
    const awsConfig = {
      region: config.aws.region,
      ...(config.aws.accessKeyId && config.aws.secretAccessKey && {
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        },
      }),
    };

    this.bedrockAgentRuntime = new BedrockAgentRuntimeClient(awsConfig);
    this.bedrockRuntime = new BedrockRuntimeClient(awsConfig);
    this.cacheService = new CacheService();
    
    this.defaultKnowledgeBaseId = config.bedrock.knowledgeBaseId || '';
    this.defaultModelId = config.bedrock.modelId;

    logger.info('🤖 Bedrock Service initialized');
  }

  /**
   * Query the knowledge base with RAG (Retrieve and Generate)
   */
  public async query(input: QueryInput): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedInput = QueryInputSchema.parse(input);
      
      // Check cache first
      const cacheKey = this.generateCacheKey('query', validatedInput);
      const cachedResult = await this.cacheService.get<QueryResult>(cacheKey);
      
      if (cachedResult) {
        logger.debug('🚀 Cache hit for query');
        return cachedResult;
      }

      const knowledgeBaseId = validatedInput.knowledgeBaseId || this.defaultKnowledgeBaseId;
      const modelId = validatedInput.modelId || this.defaultModelId;

      if (!knowledgeBaseId) {
        throw new Error('Knowledge Base ID is required');
      }

      // Build the command input
      const commandInput: RetrieveAndGenerateCommandInput = {
        input: {
          text: validatedInput.query,
        },
        retrieveAndGenerateConfiguration: {
          type: 'KNOWLEDGE_BASE',
          knowledgeBaseConfiguration: {
            knowledgeBaseId,
            modelArn: `arn:aws:bedrock:${config.aws.region}::foundation-model/${modelId}`,
            retrievalConfiguration: {
              vectorSearchConfiguration: {
                numberOfResults: validatedInput.maxResults,
                overrideSearchType: 'HYBRID',
                ...(validatedInput.filters && {
                  filter: validatedInput.filters,
                }),
              },
            },
          },
        },
        ...(validatedInput.sessionId && {
          sessionId: validatedInput.sessionId,
        }),
      };

      // Execute the query
      const command = new RetrieveAndGenerateCommand(commandInput);
      const response = await this.bedrockAgentRuntime.send(command);

      // Process the response
      const result = this.processQueryResponse(response, startTime, modelId);

      // Cache the result
      await this.cacheService.set(cacheKey, result, config.performance.cacheTtl);

      logger.info(`✨ Query completed in ${result.metadata.responseTime}ms`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Query failed after ${duration}ms:`, error);
      throw new BedrockServiceError(
        'Failed to execute query',
        'QUERY_FAILED',
        error
      );
    }
  }

  /**
   * Retrieve documents without generation (retrieval only)
   */
  public async retrieve(
    query: string,
    config: RetrievalConfig = {},
    knowledgeBaseId?: string
  ): Promise<RetrievalResult> {
    const startTime = Date.now();
    
    try {
      // Validate config
      const validatedConfig = RetrievalConfigSchema.parse(config);
      
      const kbId = knowledgeBaseId || this.defaultKnowledgeBaseId;
      
      if (!kbId) {
        throw new Error('Knowledge Base ID is required');
      }

      // Check cache first
      const cacheKey = this.generateCacheKey('retrieve', { query, config: validatedConfig, knowledgeBaseId: kbId });
      const cachedResult = await this.cacheService.get<RetrievalResult>(cacheKey);
      
      if (cachedResult) {
        logger.debug('🚀 Cache hit for retrieval');
        return cachedResult;
      }

      // Build the command input
      const commandInput: RetrieveCommandInput = {
        knowledgeBaseId: kbId,
        retrievalQuery: {
          text: query,
        },
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: validatedConfig.numberOfResults,
            overrideSearchType: validatedConfig.searchType,
            ...(validatedConfig.scoreThreshold && {
              filter: {
                greaterThan: {
                  key: '_score',
                  value: validatedConfig.scoreThreshold,
                },
              },
            }),
          },
        },
      };

      // Execute the retrieval
      const command = new RetrieveCommand(commandInput);
      const response = await this.bedrockAgentRuntime.send(command);

      // Process the response
      const result = this.processRetrievalResponse(response, startTime, validatedConfig.searchType);

      // Cache the result
      await this.cacheService.set(cacheKey, result, config.performance.cacheTtl);

      logger.info(`🔍 Retrieval completed in ${result.metadata.responseTime}ms`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Retrieval failed after ${duration}ms:`, error);
      throw new BedrockServiceError(
        'Failed to execute retrieval',
        'RETRIEVAL_FAILED',
        error
      );
    }
  }

  /**
   * Direct model invocation (without knowledge base)
   */
  public async invokeModel(
    prompt: string,
    modelId: string = this.defaultModelId,
    parameters: Record<string, any> = {}
  ): Promise<{
    response: string;
    metadata: {
      responseTime: number;
      tokenUsage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
      };
      modelUsed: string;
    };
  }> {
    const startTime = Date.now();
    
    try {
      // Build the request body based on model type
      let body: any;
      
      if (modelId.includes('claude')) {
        body = {
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: parameters.maxTokens || 4000,
          temperature: parameters.temperature || 0.7,
          messages: [{
            role: 'user',
            content: prompt,
          }],
          ...parameters,
        };
      } else if (modelId.includes('titan')) {
        body = {
          inputText: prompt,
          textGenerationConfig: {
            maxTokenCount: parameters.maxTokens || 4000,
            temperature: parameters.temperature || 0.7,
            ...parameters,
          },
        };
      } else {
        // Generic format
        body = {
          prompt,
          max_tokens: parameters.maxTokens || 4000,
          temperature: parameters.temperature || 0.7,
          ...parameters,
        };
      }

      const commandInput: InvokeModelCommandInput = {
        modelId,
        body: JSON.stringify(body),
        contentType: 'application/json',
      };

      const command = new InvokeModelCommand(commandInput);
      const response = await this.bedrockRuntime.send(command);

      // Parse response
      const responseBody = JSON.parse(response.body?.transformToString() || '{}');
      
      let responseText: string;
      let tokenUsage: any;
      
      if (modelId.includes('claude')) {
        responseText = responseBody.content?.[0]?.text || '';
        tokenUsage = {
          inputTokens: responseBody.usage?.input_tokens || 0,
          outputTokens: responseBody.usage?.output_tokens || 0,
          totalTokens: (responseBody.usage?.input_tokens || 0) + (responseBody.usage?.output_tokens || 0),
        };
      } else if (modelId.includes('titan')) {
        responseText = responseBody.results?.[0]?.outputText || '';
        tokenUsage = {
          inputTokens: responseBody.inputTextTokenCount || 0,
          outputTokens: responseBody.results?.[0]?.tokenCount || 0,
          totalTokens: (responseBody.inputTextTokenCount || 0) + (responseBody.results?.[0]?.tokenCount || 0),
        };
      } else {
        responseText = responseBody.generation || responseBody.text || '';
      }

      const duration = Date.now() - startTime;
      
      logger.info(`🤖 Model invocation completed in ${duration}ms`);
      
      return {
        response: responseText,
        metadata: {
          responseTime: duration,
          tokenUsage,
          modelUsed: modelId,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Model invocation failed after ${duration}ms:`, error);
      throw new BedrockServiceError(
        'Failed to invoke model',
        'MODEL_INVOCATION_FAILED',
        error
      );
    }
  }

  /**
   * Health check for Bedrock service
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      bedrockAgentRuntime: boolean;
      bedrockRuntime: boolean;
      knowledgeBaseAccess: boolean;
      latency?: number;
    };
  }> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      const testPrompt = 'Hello, this is a health check.';
      
      // Test model invocation
      await this.invokeModel(testPrompt, this.defaultModelId, { maxTokens: 10 });
      
      // Test knowledge base access if available
      let knowledgeBaseAccess = true;
      if (this.defaultKnowledgeBaseId) {
        try {
          await this.retrieve('test', { numberOfResults: 1 });
        } catch {
          knowledgeBaseAccess = false;
        }
      }
      
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        details: {
          bedrockAgentRuntime: true,
          bedrockRuntime: true,
          knowledgeBaseAccess,
          latency,
        },
      };
    } catch (error) {
      logger.error('❌ Bedrock health check failed:', error);
      
      return {
        status: 'unhealthy',
        details: {
          bedrockAgentRuntime: false,
          bedrockRuntime: false,
          knowledgeBaseAccess: false,
        },
      };
    }
  }

  private processQueryResponse(response: any, startTime: number, modelId: string): QueryResult {
    const responseTime = Date.now() - startTime;
    
    const citations: Citation[] = [];
    
    if (response.citations) {
      for (const citation of response.citations) {
        for (const reference of citation.retrievedReferences || []) {
          citations.push({
            content: reference.content?.text || '',
            source: {
              type: reference.location?.type || 'unknown',
              location: reference.location,
            },
            metadata: reference.metadata,
            confidenceScore: reference.score,
          });
        }
      }
    }

    return {
      answer: response.output?.text || '',
      citations,
      sessionId: response.sessionId,
      metadata: {
        responseTime,
        modelUsed: modelId,
        retrievalCount: citations.length,
        // Token usage would be available in some responses
        tokenUsage: response.usage ? {
          inputTokens: response.usage.inputTokens || 0,
          outputTokens: response.usage.outputTokens || 0,
          totalTokens: (response.usage.inputTokens || 0) + (response.usage.outputTokens || 0),
        } : undefined,
      },
    };
  }

  private processRetrievalResponse(response: any, startTime: number, searchType: string): RetrievalResult {
    const responseTime = Date.now() - startTime;
    
    const documents: RetrievedDocument[] = [];
    
    if (response.retrievalResults) {
      for (const result of response.retrievalResults) {
        documents.push({
          content: result.content?.text || '',
          location: {
            type: result.location?.type || 'unknown',
            s3Location: result.location?.s3Location,
            webLocation: result.location?.webLocation,
          },
          metadata: result.metadata,
          score: result.score,
        });
      }
    }

    return {
      documents,
      metadata: {
        responseTime,
        totalResults: documents.length,
        searchType,
      },
    };
  }

  private generateCacheKey(operation: string, input: any): string {
    const hash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify({ operation, input }))
      .digest('hex');
    return `bedrock:${operation}:${hash}`;
  }
}

/**
 * Custom error class for Bedrock service errors
 */
export class BedrockServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'BedrockServiceError';
  }
}

// Export singleton instance
export const bedrockService = new BedrockService();