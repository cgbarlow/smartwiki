/**
 * Factory for creating model providers with support for easy switching
 */
import { ModelProvider } from '../types/index.js';
import { MistralProvider, MistralConfig } from './MistralProvider.js';

export interface ProviderConfig {
  type: 'mistral' | 'openai' | 'anthropic' | 'custom';
  config: Record<string, any>;
}

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  organization?: string;
  timeout?: number;
}

export interface AnthropicConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
}

export class ModelProviderFactory {
  private static registeredProviders: Map<string, typeof BaseModelProvider> = new Map();
  private static instances: Map<string, ModelProvider> = new Map();

  /**
   * Register a custom provider class
   */
  static registerProvider(name: string, providerClass: typeof BaseModelProvider): void {
    this.registeredProviders.set(name, providerClass);
  }

  /**
   * Create a model provider instance
   */
  static create(config: ProviderConfig): ModelProvider {
    const cacheKey = `${config.type}-${JSON.stringify(config.config)}`;
    
    // Return cached instance if available
    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    let provider: ModelProvider;

    switch (config.type) {
      case 'mistral':
        provider = new MistralProvider(config.config as MistralConfig);
        break;
        
      case 'openai':
        // Placeholder for OpenAI provider
        throw new Error('OpenAI provider not yet implemented. Use Mistral for now.');
        
      case 'anthropic':
        // Placeholder for Anthropic provider
        throw new Error('Anthropic provider not yet implemented. Use Mistral for now.');
        
      case 'custom':
        const customClass = this.registeredProviders.get(config.config.name);
        if (!customClass) {
          throw new Error(`Custom provider '${config.config.name}' not registered`);
        }
        provider = new customClass(config.config);
        break;
        
      default:
        throw new Error(`Unknown model provider type: ${config.type}`);
    }

    // Cache the instance
    this.instances.set(cacheKey, provider);
    return provider;
  }

  /**
   * Create a Mistral provider with default configuration
   */
  static createMistral(apiKey: string, options?: Partial<MistralConfig>): ModelProvider {
    return this.create({
      type: 'mistral',
      config: {
        apiKey,
        baseUrl: options?.baseUrl || 'https://api.mistral.ai/v1',
        model: options?.model || 'mistral-7b-instruct',
        timeout: options?.timeout || 30000,
        maxRetries: options?.maxRetries || 3,
        retryDelay: options?.retryDelay || 1000,
        ...options
      }
    });
  }

  /**
   * Get available provider types
   */
  static getAvailableProviders(): string[] {
    const builtInProviders = ['mistral']; // Only Mistral is implemented for now
    const customProviders = Array.from(this.registeredProviders.keys());
    return [...builtInProviders, ...customProviders];
  }

  /**
   * Get provider capabilities
   */
  static getProviderCapabilities(type: string): {
    name: string;
    features: string[];
    limits: Record<string, any>;
    cost: Record<string, any>;
  } {
    switch (type) {
      case 'mistral':
        return {
          name: 'Mistral AI',
          features: ['chat', 'completion', 'structured_output'],
          limits: {
            maxTokens: 8192,
            dailyRequests: 1000,
            monthlyRequests: 20000,
            rateLimit: '1 request/second'
          },
          cost: {
            tier: 'free',
            inputCost: 0,
            outputCost: 0,
            paidPlans: '$7/month for 10M tokens'
          }
        };
      
      case 'openai':
        return {
          name: 'OpenAI',
          features: ['chat', 'completion', 'embedding', 'function_calling'],
          limits: {
            maxTokens: 128000, // GPT-4 context
            rateLimit: 'varies by tier'
          },
          cost: {
            tier: 'paid',
            inputCost: '$0.01/1K tokens',
            outputCost: '$0.03/1K tokens'
          }
        };
      
      case 'anthropic':
        return {
          name: 'Anthropic Claude',
          features: ['chat', 'completion', 'structured_output'],
          limits: {
            maxTokens: 200000, // Claude 3 context
            rateLimit: 'varies by tier'
          },
          cost: {
            tier: 'paid',
            inputCost: '$0.008/1K tokens',
            outputCost: '$0.024/1K tokens'
          }
        };
      
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Validate provider configuration
   */
  static validateConfig(config: ProviderConfig): boolean {
    switch (config.type) {
      case 'mistral':
        const mistralConfig = config.config as MistralConfig;
        if (!mistralConfig.apiKey) {
          throw new Error('Mistral API key is required');
        }
        return true;
        
      case 'openai':
        const openaiConfig = config.config as OpenAIConfig;
        if (!openaiConfig.apiKey) {
          throw new Error('OpenAI API key is required');
        }
        return true;
        
      case 'anthropic':
        const anthropicConfig = config.config as AnthropicConfig;
        if (!anthropicConfig.apiKey) {
          throw new Error('Anthropic API key is required');
        }
        return true;
        
      default:
        return true; // Custom providers handle their own validation
    }
  }

  /**
   * Clear cached instances
   */
  static clearCache(): void {
    this.instances.clear();
  }

  /**
   * Get recommended provider based on requirements
   */
  static getRecommendedProvider(requirements: {
    budget: 'free' | 'low' | 'medium' | 'high';
    features: string[];
    volume: 'low' | 'medium' | 'high';
    latency: 'low' | 'medium' | 'high';
  }): string {
    // For MVP/development, recommend Mistral free tier
    if (requirements.budget === 'free') {
      return 'mistral';
    }

    // For production with specific feature requirements
    if (requirements.features.includes('embedding')) {
      return 'openai'; // Once implemented
    }

    if (requirements.features.includes('function_calling')) {
      return 'openai'; // Once implemented
    }

    // For high-volume, cost-sensitive applications
    if (requirements.volume === 'high' && requirements.budget === 'low') {
      return 'mistral'; // Upgrade to paid tier
    }

    // For high-quality analysis with larger context
    if (requirements.features.includes('large_context')) {
      return 'anthropic'; // Once implemented
    }

    // Default recommendation
    return 'mistral';
  }
}

// Re-export for convenience
export { MistralProvider } from './MistralProvider.js';

// Base class import helper (for custom providers)
export { BaseModelProvider } from './ModelProvider.js';