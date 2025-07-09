import { ModelProvider } from './ModelProvider';
import { MistralProvider } from './MistralProvider';
import { logger } from '../../utils/logger';

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  [key: string]: any;
}

/**
 * Factory for creating and managing model providers
 */
export class ModelProviderFactory {
  private static providers: Map<string, ModelProvider> = new Map();
  private static configurations: Map<string, ProviderConfig> = new Map();

  /**
   * Register a provider configuration
   */
  static registerProvider(name: string, config: ProviderConfig): void {
    this.configurations.set(name, config);
    logger.info(`📝 Registered model provider: ${name}`);
  }

  /**
   * Create a provider instance
   */
  static create(name: string, config?: ProviderConfig): ModelProvider {
    const providerConfig = config || this.configurations.get(name);
    
    if (!providerConfig) {
      throw new Error(`No configuration found for provider: ${name}`);
    }

    switch (name.toLowerCase()) {
      case 'mistral':
        return new MistralProvider(providerConfig.apiKey);
      
      case 'openai':
        // Future implementation
        throw new Error('OpenAI provider not implemented yet');
      
      case 'anthropic':
        // Future implementation
        throw new Error('Anthropic provider not implemented yet');
      
      case 'custom':
        // Future implementation for custom models
        throw new Error('Custom provider not implemented yet');
      
      default:
        throw new Error(`Unknown model provider: ${name}`);
    }
  }

  /**
   * Get or create a cached provider instance
   */
  static getProvider(name: string, config?: ProviderConfig): ModelProvider {
    const cacheKey = `${name}-${JSON.stringify(config || {})}`;
    
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey)!;
    }

    const provider = this.create(name, config);
    this.providers.set(cacheKey, provider);
    
    logger.info(`🏭 Created and cached provider: ${name}`);
    return provider;
  }

  /**
   * Get list of available providers
   */
  static getAvailable(): string[] {
    return ['mistral', 'openai', 'anthropic', 'custom'];
  }

  /**
   * Get list of registered providers
   */
  static getRegistered(): string[] {
    return Array.from(this.configurations.keys());
  }

  /**
   * Validate provider configuration
   */
  static validateConfig(name: string, config: ProviderConfig): boolean {
    try {
      switch (name.toLowerCase()) {
        case 'mistral':
          return this.validateMistralConfig(config);
        
        case 'openai':
          return this.validateOpenAIConfig(config);
        
        case 'anthropic':
          return this.validateAnthropicConfig(config);
        
        default:
          return false;
      }
    } catch (error) {
      logger.error(`❌ Provider config validation failed for ${name}:`, error);
      return false;
    }
  }

  /**
   * Validate Mistral configuration
   */
  private static validateMistralConfig(config: ProviderConfig): boolean {
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new Error('Mistral provider requires a valid apiKey');
    }

    if (config.baseUrl && typeof config.baseUrl !== 'string') {
      throw new Error('Mistral baseUrl must be a string');
    }

    return true;
  }

  /**
   * Validate OpenAI configuration
   */
  private static validateOpenAIConfig(config: ProviderConfig): boolean {
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new Error('OpenAI provider requires a valid apiKey');
    }

    return true;
  }

  /**
   * Validate Anthropic configuration
   */
  private static validateAnthropicConfig(config: ProviderConfig): boolean {
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new Error('Anthropic provider requires a valid apiKey');
    }

    return true;
  }

  /**
   * Test provider connectivity
   */
  static async testProvider(name: string, config?: ProviderConfig): Promise<boolean> {
    try {
      const provider = this.create(name, config);
      
      // Test with a simple chat message
      const testResult = await provider.chat([
        { role: 'user', content: 'Test connection. Please respond with "OK".' }
      ], { maxTokens: 10 });

      const isValid = testResult.message.toLowerCase().includes('ok');
      
      if (isValid) {
        logger.info(`✅ Provider test successful: ${name}`);
      } else {
        logger.warn(`⚠️ Provider test unclear response: ${name}`);
      }

      return isValid;
    } catch (error) {
      logger.error(`❌ Provider test failed for ${name}:`, error);
      return false;
    }
  }

  /**
   * Get provider capabilities
   */
  static getCapabilities(name: string): string[] {
    switch (name.toLowerCase()) {
      case 'mistral':
        return ['chat', 'completion', 'structured_output'];
      
      case 'openai':
        return ['chat', 'completion', 'structured_output', 'embedding'];
      
      case 'anthropic':
        return ['chat', 'completion', 'structured_output'];
      
      default:
        return [];
    }
  }

  /**
   * Clear provider cache
   */
  static clearCache(): void {
    this.providers.clear();
    logger.info('🧹 Provider cache cleared');
  }

  /**
   * Initialize providers from environment
   */
  static initializeFromEnv(): void {
    // Mistral provider
    if (process.env.MISTRAL_API_KEY) {
      this.registerProvider('mistral', {
        apiKey: process.env.MISTRAL_API_KEY,
        baseUrl: process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1',
        model: process.env.MISTRAL_MODEL || 'mistral-7b-instruct',
      });
    }

    // OpenAI provider (for future use)
    if (process.env.OPENAI_API_KEY) {
      this.registerProvider('openai', {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL,
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      });
    }

    // Anthropic provider (for future use)
    if (process.env.ANTHROPIC_API_KEY) {
      this.registerProvider('anthropic', {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      });
    }

    logger.info(`🔧 Initialized ${this.getRegistered().length} providers from environment`);
  }

  /**
   * Get default provider based on availability
   */
  static getDefaultProvider(): string {
    const registered = this.getRegistered();
    
    // Prefer Mistral for cost-effectiveness
    if (registered.includes('mistral')) {
      return 'mistral';
    }
    
    // Fallback to other providers
    if (registered.includes('openai')) {
      return 'openai';
    }
    
    if (registered.includes('anthropic')) {
      return 'anthropic';
    }

    throw new Error('No model providers available. Please configure at least one provider.');
  }
}