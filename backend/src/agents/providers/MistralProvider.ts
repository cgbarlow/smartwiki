import { ModelProvider } from './ModelProvider';
import { 
  ChatMessage, 
  ChatOptions, 
  ChatResponse, 
  AnalysisResponse, 
  ModelFeature 
} from '../types';
import { logger } from '../../utils/logger';

/**
 * Mistral AI provider implementation
 * Uses the free tier for cost-effective AI inference
 */
export class MistralProvider extends ModelProvider {
  name = 'mistral';
  version = 'mistral-7b-instruct';
  maxTokens = 8192;
  supportedFeatures: ModelFeature[] = ['chat', 'completion', 'structured_output'];

  private apiKey: string;
  private baseUrl = 'https://api.mistral.ai/v1';

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  /**
   * Chat completion using Mistral API
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const validatedOptions = this.validateChatOptions(options);
    const formattedMessages = this.formatMessages(messages);

    logger.info(`🤖 Mistral chat request: ${formattedMessages.length} messages`);

    return this.retryApiCall(async () => {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.version,
          messages: formattedMessages,
          temperature: validatedOptions.temperature,
          max_tokens: validatedOptions.maxTokens,
          top_p: validatedOptions.topP,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Mistral API error (${response.status}): ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      const chatResponse: ChatResponse = {
        message: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        },
        model: this.version,
      };

      logger.info(`✅ Mistral chat response: ${chatResponse.usage.totalTokens} tokens used`);
      return chatResponse;
    });
  }

  /**
   * Document analysis using structured prompts
   */
  async analyze(document: string, prompt: string): Promise<AnalysisResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: this.buildSystemPrompt(),
      },
      {
        role: 'user',
        content: this.buildAnalysisPrompt(document, prompt),
      },
    ];

    logger.info(`🔍 Mistral analysis request: ${document.length} chars document`);

    const response = await this.chat(messages, { 
      temperature: 0.1, // Lower temperature for more consistent analysis
      maxTokens: 2048,
    });

    const analysisResponse: AnalysisResponse = {
      analysis: response.message,
      confidence: this.calculateConfidence(response),
      usage: response.usage,
    };

    logger.info(`✅ Mistral analysis complete: confidence ${analysisResponse.confidence.toFixed(2)}`);
    return analysisResponse;
  }

  /**
   * Build system prompt for compliance analysis
   */
  private buildSystemPrompt(): string {
    return `You are a compliance analysis expert AI assistant. Your role is to:

1. Analyze documents against regulatory and compliance standards
2. Identify gaps and non-compliance issues
3. Provide structured, actionable recommendations
4. Assess risk levels and confidence scores

Guidelines:
- Be thorough and precise in your analysis
- Use clear, professional language
- Provide specific evidence for your findings
- Structure responses in JSON format when requested
- Consider the context and criticality of requirements
- Highlight both compliance strengths and gaps

You have expertise in:
- SOX (Sarbanes-Oxley Act)
- GDPR (General Data Protection Regulation)
- HIPAA (Health Insurance Portability and Accountability Act)
- PCI DSS (Payment Card Industry Data Security Standard)
- ISO 27001 (Information Security Management)
- NIST Cybersecurity Framework
- And other regulatory frameworks

Always maintain objectivity and provide balanced assessments.`;
  }

  /**
   * Build analysis prompt for specific document and requirements
   */
  private buildAnalysisPrompt(document: string, analysisPrompt: string): string {
    // Truncate document if too long for context window
    const maxDocumentLength = 6000; // Leave room for prompts and response
    const truncatedDocument = document.length > maxDocumentLength 
      ? document.substring(0, maxDocumentLength) + "\n\n[Document truncated for analysis...]"
      : document;

    return `${analysisPrompt}

DOCUMENT TO ANALYZE:
"""
${truncatedDocument}
"""

Please provide your analysis in a structured format.`;
  }

  /**
   * Check API key and connectivity
   */
  async validateConnection(): Promise<boolean> {
    try {
      const testMessages: ChatMessage[] = [
        { role: 'user', content: 'Test connection. Please respond with "OK".' }
      ];

      const response = await this.chat(testMessages, { maxTokens: 10 });
      return response.message.toLowerCase().includes('ok');
    } catch (error) {
      logger.error('❌ Mistral connection validation failed:', error);
      return false;
    }
  }

  /**
   * Get usage statistics (if available from API)
   */
  async getUsageStats(): Promise<{
    requestsToday: number;
    requestsThisMonth: number;
    remainingQuota: number;
  } | null> {
    try {
      // Note: Mistral API doesn't provide usage stats endpoint in free tier
      // This would need to be tracked locally or via paid API
      logger.warn('⚠️ Usage stats not available in Mistral free tier');
      return null;
    } catch (error) {
      logger.error('❌ Failed to get Mistral usage stats:', error);
      return null;
    }
  }

  /**
   * Rate limiting for free tier compliance
   */
  private async rateLimitCheck(): Promise<void> {
    // Implement local rate limiting for free tier (1 request per second)
    // This could be enhanced with Redis for distributed rate limiting
    const lastRequestTime = (this as any).lastRequestTime || 0;
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < 1000) {
      const waitTime = 1000 - timeSinceLastRequest;
      logger.info(`⏳ Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    (this as any).lastRequestTime = Date.now();
  }
}