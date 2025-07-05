/**
 * Abstract base class for model providers
 */
import { 
  ModelProvider, 
  ChatMessage, 
  ChatOptions, 
  ChatResponse, 
  EmbeddingResponse, 
  AnalysisResponse, 
  TokenUsage,
  ModelFeature,
  AgentError 
} from '../types/index.js';

export abstract class BaseModelProvider implements ModelProvider {
  public abstract readonly name: string;
  public abstract readonly version: string;
  public abstract readonly maxTokens: number;
  public abstract readonly supportedFeatures: ModelFeature[];

  protected abstract validateApiKey(apiKey: string): boolean;
  protected abstract buildHeaders(apiKey: string): Record<string, string>;
  protected abstract buildChatPayload(messages: ChatMessage[], options?: ChatOptions): Record<string, any>;
  protected abstract parseChatResponse(response: any): ChatResponse;
  protected abstract calculateConfidence(response: ChatResponse): number;

  abstract chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  abstract embed(text: string): Promise<EmbeddingResponse>;
  abstract analyze(document: string, prompt: string): Promise<AnalysisResponse>;

  protected handleError(error: any, operation: string): AgentError {
    const agentError: AgentError = {
      code: error.status || 'UNKNOWN_ERROR',
      message: error.message || `Failed to ${operation}`,
      details: {
        operation,
        originalError: error,
        timestamp: new Date()
      },
      timestamp: new Date()
    };

    if (error.response) {
      agentError.details.response = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
    }

    return agentError;
  }

  protected validateMessages(messages: ChatMessage[]): void {
    if (!messages || messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }

    for (const message of messages) {
      if (!message.role || !message.content) {
        throw new Error('Each message must have role and content');
      }
      
      if (!['system', 'user', 'assistant'].includes(message.role)) {
        throw new Error('Invalid message role');
      }
    }
  }

  protected validateOptions(options?: ChatOptions): void {
    if (!options) return;

    if (options.temperature !== undefined) {
      if (options.temperature < 0 || options.temperature > 2) {
        throw new Error('Temperature must be between 0 and 2');
      }
    }

    if (options.maxTokens !== undefined) {
      if (options.maxTokens < 1 || options.maxTokens > this.maxTokens) {
        throw new Error(`Max tokens must be between 1 and ${this.maxTokens}`);
      }
    }

    if (options.topP !== undefined) {
      if (options.topP < 0 || options.topP > 1) {
        throw new Error('Top P must be between 0 and 1');
      }
    }
  }

  protected createTokenUsage(promptTokens: number, completionTokens: number): TokenUsage {
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens
    };
  }

  protected async makeRequest(
    url: string, 
    options: RequestInit, 
    timeout: number = 30000
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}