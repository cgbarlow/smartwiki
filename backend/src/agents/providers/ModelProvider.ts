import { 
  ModelProvider as IModelProvider, 
  ChatMessage, 
  ChatOptions, 
  ChatResponse, 
  AnalysisResponse, 
  EmbeddingResponse, 
  ModelFeature 
} from '../types';

/**
 * Abstract base class for model providers
 */
export abstract class ModelProvider implements IModelProvider {
  abstract name: string;
  abstract version: string;
  abstract maxTokens: number;
  abstract supportedFeatures: ModelFeature[];

  abstract chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  abstract analyze(document: string, prompt: string): Promise<AnalysisResponse>;

  // Optional embedding support
  embed?(text: string): Promise<EmbeddingResponse>;

  /**
   * Calculate confidence score based on response characteristics
   */
  protected calculateConfidence(response: ChatResponse): number {
    const certaintyKeywords = ['clearly', 'definitely', 'certainly', 'obviously', 'undoubtedly'];
    const uncertaintyKeywords = ['might', 'possibly', 'potentially', 'unclear', 'uncertain', 'maybe'];
    
    const text = response.message.toLowerCase();
    const certaintyCount = certaintyKeywords.filter(word => text.includes(word)).length;
    const uncertaintyCount = uncertaintyKeywords.filter(word => text.includes(word)).length;
    
    // Base confidence based on response length (normalized)
    const baseConfidence = Math.min(response.message.length / 1000, 1.0);
    
    // Adjust based on certainty indicators
    const confidenceAdjustment = (certaintyCount - uncertaintyCount) * 0.1;
    
    // Ensure confidence is between 0.1 and 0.95
    return Math.max(0.1, Math.min(0.95, baseConfidence + confidenceAdjustment));
  }

  /**
   * Validate chat options
   */
  protected validateChatOptions(options?: ChatOptions): ChatOptions {
    const defaults: ChatOptions = {
      temperature: 0.1,
      maxTokens: 2048,
      topP: 0.9,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
    };

    if (!options) return defaults;

    return {
      temperature: Math.max(0, Math.min(2, options.temperature ?? defaults.temperature)),
      maxTokens: Math.max(1, Math.min(this.maxTokens, options.maxTokens ?? defaults.maxTokens)),
      topP: Math.max(0, Math.min(1, options.topP ?? defaults.topP)),
      frequencyPenalty: Math.max(-2, Math.min(2, options.frequencyPenalty ?? defaults.frequencyPenalty)),
      presencePenalty: Math.max(-2, Math.min(2, options.presencePenalty ?? defaults.presencePenalty)),
    };
  }

  /**
   * Format messages for API consumption
   */
  protected formatMessages(messages: ChatMessage[]): ChatMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content.trim(),
    }));
  }

  /**
   * Handle API errors consistently
   */
  protected handleApiError(error: any, provider: string): never {
    const message = error.response?.data?.error?.message || error.message || 'Unknown error';
    const status = error.response?.status || 500;
    
    throw new Error(`${provider} API error (${status}): ${message}`);
  }

  /**
   * Retry logic for API calls
   */
  protected async retryApiCall<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }

    throw lastError!;
  }
}