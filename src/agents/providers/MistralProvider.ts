/**
 * Mistral AI provider implementation for SmartWiki compliance agent
 * 
 * Features:
 * - Free tier: 1,000 requests/day, 20,000/month
 * - Rate limiting: 1 request per second
 * - Context window: 8,192 tokens
 * - Output tokens: 1,024 tokens per request
 */
import { 
  ChatMessage, 
  ChatOptions, 
  ChatResponse, 
  EmbeddingResponse, 
  AnalysisResponse,
  TokenUsage,
  ModelFeature,
  AgentError 
} from '../types/index.js';
import { BaseModelProvider } from './ModelProvider.js';

export interface MistralConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export class MistralProvider extends BaseModelProvider {
  public readonly name = 'mistral';
  public readonly version: string;
  public readonly maxTokens = 8192;
  public readonly supportedFeatures: ModelFeature[] = [
    'chat', 
    'completion', 
    'structured_output'
  ];

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  // Rate limiting for free tier (1 request per second)
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 1000; // 1 second

  // Usage tracking for free tier limits
  private dailyRequestCount: number = 0;
  private monthlyRequestCount: number = 0;
  private lastResetDate: Date = new Date();

  constructor(config: MistralConfig) {
    super();
    
    if (!config.apiKey) {
      throw new Error('Mistral API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.mistral.ai/v1';
    this.version = config.model || 'mistral-7b-instruct';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;

    this.validateApiKey(this.apiKey);
  }

  protected validateApiKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      throw new Error('Invalid Mistral API key format');
    }
    return true;
  }

  protected buildHeaders(apiKey: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'SmartWiki-Agent/1.0'
    };
  }

  protected buildChatPayload(messages: ChatMessage[], options?: ChatOptions): Record<string, any> {
    return {
      model: this.version,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: options?.temperature ?? 0.1,
      max_tokens: Math.min(options?.maxTokens ?? 2048, 1024), // Respect free tier limit
      top_p: options?.topP ?? 0.9,
      stream: false,
      safe_prompt: true // Enable safety filtering
    };
  }

  protected parseChatResponse(response: any): ChatResponse {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No choices in response');
    }

    const choice = response.choices[0];
    const usage = response.usage || {};

    return {
      message: choice.message?.content || choice.text || '',
      usage: this.createTokenUsage(
        usage.prompt_tokens || 0,
        usage.completion_tokens || 0
      ),
      model: this.version,
      timestamp: new Date()
    };
  }

  protected calculateConfidence(response: ChatResponse): number {
    const text = response.message.toLowerCase();
    
    // Keywords that indicate high confidence
    const certaintyKeywords = [
      'clearly', 'definitely', 'certainly', 'obviously', 'undoubtedly',
      'confirmed', 'established', 'verified', 'documented', 'specified'
    ];
    
    // Keywords that indicate uncertainty
    const uncertaintyKeywords = [
      'might', 'possibly', 'potentially', 'unclear', 'ambiguous',
      'may', 'could', 'perhaps', 'seems', 'appears', 'suggests'
    ];

    const certaintyCount = certaintyKeywords.filter(word => text.includes(word)).length;
    const uncertaintyCount = uncertaintyKeywords.filter(word => text.includes(word)).length;

    // Base confidence on response length and structure
    const baseConfidence = Math.min(response.message.length / 1000, 1.0);
    
    // Adjust based on certainty indicators
    const confidenceAdjustment = (certaintyCount - uncertaintyCount) * 0.1;
    
    // Consider token usage as quality indicator
    const tokenQuality = Math.min(response.usage.completionTokens / 500, 1.0);
    
    const finalConfidence = baseConfidence + confidenceAdjustment + (tokenQuality * 0.1);
    
    return Math.max(0.1, Math.min(0.95, finalConfidence));
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  private checkUsageLimits(): void {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    
    // Reset daily counter
    if (currentDay !== this.lastResetDate.getDate()) {
      this.dailyRequestCount = 0;
    }
    
    // Reset monthly counter
    if (currentMonth !== this.lastResetDate.getMonth()) {
      this.monthlyRequestCount = 0;
    }
    
    this.lastResetDate = now;
    
    // Check limits
    if (this.dailyRequestCount >= 1000) {
      throw new Error('Daily request limit exceeded (1,000 requests)');
    }
    
    if (this.monthlyRequestCount >= 20000) {
      throw new Error('Monthly request limit exceeded (20,000 requests)');
    }
  }

  private incrementUsageCounters(): void {
    this.dailyRequestCount++;
    this.monthlyRequestCount++;
  }

  private async makeRequestWithRetry(
    url: string, 
    options: RequestInit, 
    retryCount: number = 0
  ): Promise<any> {
    try {
      await this.enforceRateLimit();
      this.checkUsageLimits();
      
      const response = await this.makeRequest(url, options, this.timeout);
      this.incrementUsageCounters();
      
      return response;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        const isRetryableError = error.message.includes('rate limit') || 
                               error.message.includes('timeout') ||
                               error.message.includes('503') ||
                               error.message.includes('502');
        
        if (isRetryableError) {
          const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequestWithRetry(url, options, retryCount + 1);
        }
      }
      
      throw this.handleError(error, 'mistral_request');
    }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    this.validateMessages(messages);
    this.validateOptions(options);

    try {
      const url = `${this.baseUrl}/chat/completions`;
      const payload = this.buildChatPayload(messages, options);
      
      const response = await this.makeRequestWithRetry(url, {
        method: 'POST',
        headers: this.buildHeaders(this.apiKey),
        body: JSON.stringify(payload)
      });

      return this.parseChatResponse(response);
    } catch (error) {
      throw this.handleError(error, 'chat');
    }
  }

  async embed(text: string): Promise<EmbeddingResponse> {
    // Note: Mistral free tier may not support embeddings
    // This is a placeholder implementation
    throw new Error('Embedding not supported in Mistral free tier');
  }

  async analyze(document: string, prompt: string): Promise<AnalysisResponse> {
    if (!document || !prompt) {
      throw new Error('Document and prompt are required for analysis');
    }

    // Truncate document if too long for context window
    const maxDocumentLength = this.maxTokens - 1000; // Reserve tokens for prompt and response
    const truncatedDocument = document.length > maxDocumentLength ? 
      document.substring(0, maxDocumentLength) + '...[truncated]' : document;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: prompt
      },
      {
        role: 'user',
        content: truncatedDocument
      }
    ];

    try {
      const chatResponse = await this.chat(messages, { temperature: 0.1 });
      
      return {
        analysis: chatResponse.message,
        confidence: this.calculateConfidence(chatResponse),
        usage: chatResponse.usage,
        metadata: {
          model: this.version,
          documentLength: document.length,
          truncated: document.length > maxDocumentLength,
          timestamp: new Date()
        }
      };
    } catch (error) {
      throw this.handleError(error, 'analyze');
    }
  }

  // Utility methods for monitoring usage
  public getUsageStats(): {
    dailyRequests: number;
    monthlyRequests: number;
    dailyLimit: number;
    monthlyLimit: number;
    remainingDaily: number;
    remainingMonthly: number;
  } {
    return {
      dailyRequests: this.dailyRequestCount,
      monthlyRequests: this.monthlyRequestCount,
      dailyLimit: 1000,
      monthlyLimit: 20000,
      remainingDaily: 1000 - this.dailyRequestCount,
      remainingMonthly: 20000 - this.monthlyRequestCount
    };
  }

  public resetUsageStats(): void {
    this.dailyRequestCount = 0;
    this.monthlyRequestCount = 0;
    this.lastResetDate = new Date();
  }

  // Health check method
  public async healthCheck(): Promise<boolean> {
    try {
      const testMessages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Test message for health check'
        }
      ];

      await this.chat(testMessages, { maxTokens: 10 });
      return true;
    } catch (error) {
      return false;
    }
  }
}