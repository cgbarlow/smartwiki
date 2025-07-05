import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockService } from './bedrockService';
import { createMockBedrockResponse, measureExecutionTime, expectPerformanceThreshold } from '@/test/test-utils';

// Mock AWS SDK
vi.mock('@aws-sdk/client-bedrock-runtime');

const mockBedrockClient = {
  send: vi.fn(),
};

describe('BedrockService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (BedrockRuntimeClient as any).mockImplementation(() => mockBedrockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateResponse', () => {
    it('generates response from prompt successfully', async () => {
      const mockResponse = createMockBedrockResponse('This is a test AI response');
      mockBedrockClient.send.mockResolvedValue(mockResponse);

      const result = await bedrockService.generateResponse('Test prompt');

      expect(result).toBe('This is a test AI response');
      expect(mockBedrockClient.send).toHaveBeenCalledWith(
        expect.any(InvokeModelCommand)
      );
    });

    it('handles different model parameters', async () => {
      const mockResponse = createMockBedrockResponse('Custom response');
      mockBedrockClient.send.mockResolvedValue(mockResponse);

      const result = await bedrockService.generateResponse(
        'Test prompt',
        {
          maxTokens: 500,
          temperature: 0.8,
          topP: 0.9,
        }
      );

      expect(result).toBe('Custom response');
      
      const sentCommand = mockBedrockClient.send.mock.calls[0][0];
      const body = JSON.parse(sentCommand.input.body);
      
      expect(body.max_tokens).toBe(500);
      expect(body.temperature).toBe(0.8);
      expect(body.top_p).toBe(0.9);
    });

    it('throws error when Bedrock call fails', async () => {
      const error = new Error('Bedrock service unavailable');
      mockBedrockClient.send.mockRejectedValue(error);

      await expect(
        bedrockService.generateResponse('Test prompt')
      ).rejects.toThrow('Bedrock service unavailable');
    });

    it('handles malformed response gracefully', async () => {
      const malformedResponse = {
        body: {
          transformToString: () => 'invalid json',
        },
      };
      mockBedrockClient.send.mockResolvedValue(malformedResponse);

      await expect(
        bedrockService.generateResponse('Test prompt')
      ).rejects.toThrow();
    });
  });

  describe('summarizeText', () => {
    it('summarizes long text content', async () => {
      const mockResponse = createMockBedrockResponse('This is a summary of the text');
      mockBedrockClient.send.mockResolvedValue(mockResponse);

      const longText = 'This is a very long text that needs to be summarized...'.repeat(100);
      const result = await bedrockService.summarizeText(longText);

      expect(result).toBe('This is a summary of the text');
      expect(mockBedrockClient.send).toHaveBeenCalled();
    });

    it('handles empty text input', async () => {
      await expect(
        bedrockService.summarizeText('')
      ).rejects.toThrow('Text content is required');
    });

    it('respects maximum input length', async () => {
      const veryLongText = 'A'.repeat(100000); // Very long text
      
      await expect(
        bedrockService.summarizeText(veryLongText)
      ).rejects.toThrow('Text content exceeds maximum length');
    });
  });

  describe('generateTags', () => {
    it('generates relevant tags for content', async () => {
      const mockResponse = createMockBedrockResponse('["technology", "ai", "development"]');
      mockBedrockClient.send.mockResolvedValue(mockResponse);

      const content = 'This is an article about AI development and technology trends';
      const result = await bedrockService.generateTags(content);

      expect(result).toEqual(['technology', 'ai', 'development']);
    });

    it('handles invalid JSON response for tags', async () => {
      const mockResponse = createMockBedrockResponse('invalid json array');
      mockBedrockClient.send.mockResolvedValue(mockResponse);

      const content = 'Test content';
      const result = await bedrockService.generateTags(content);

      // Should return empty array on invalid JSON
      expect(result).toEqual([]);
    });

    it('limits number of generated tags', async () => {
      const mockResponse = createMockBedrockResponse(
        JSON.stringify(['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8'])
      );
      mockBedrockClient.send.mockResolvedValue(mockResponse);

      const content = 'Content with many possible tags';
      const result = await bedrockService.generateTags(content, { maxTags: 5 });

      expect(result).toHaveLength(5);
    });
  });

  describe('Performance Tests', () => {
    it('generates response within acceptable time limit', async () => {
      const mockResponse = createMockBedrockResponse('Fast response');
      mockBedrockClient.send.mockResolvedValue(mockResponse);

      const { executionTime } = await measureExecutionTime(async () => {
        return await bedrockService.generateResponse('Test prompt');
      });

      // Should complete within 2 seconds (mock should be much faster)
      expectPerformanceThreshold(executionTime, 2000);
    });

    it('handles concurrent requests efficiently', async () => {
      const mockResponse = createMockBedrockResponse('Concurrent response');
      mockBedrockClient.send.mockResolvedValue(mockResponse);

      const promises = Array(5).fill(null).map(() => 
        bedrockService.generateResponse('Concurrent test')
      );

      const { executionTime } = await measureExecutionTime(async () => {
        return await Promise.all(promises);
      });

      // Should handle 5 concurrent requests reasonably fast
      expectPerformanceThreshold(executionTime, 3000);
      expect(mockBedrockClient.send).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Recovery', () => {
    it('retries on transient failures', async () => {
      // First call fails, second succeeds
      mockBedrockClient.send
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce(createMockBedrockResponse('Success after retry'));

      const result = await bedrockService.generateResponse('Test prompt', { retries: 1 });

      expect(result).toBe('Success after retry');
      expect(mockBedrockClient.send).toHaveBeenCalledTimes(2);
    });

    it('fails after maximum retries', async () => {
      mockBedrockClient.send.mockRejectedValue(new Error('Persistent error'));

      await expect(
        bedrockService.generateResponse('Test prompt', { retries: 2 })
      ).rejects.toThrow('Persistent error');

      expect(mockBedrockClient.send).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Input Validation', () => {
    it('validates prompt is not empty', async () => {
      await expect(
        bedrockService.generateResponse('')
      ).rejects.toThrow('Prompt is required');
    });

    it('validates prompt does not exceed maximum length', async () => {
      const veryLongPrompt = 'A'.repeat(50000);
      
      await expect(
        bedrockService.generateResponse(veryLongPrompt)
      ).rejects.toThrow('Prompt exceeds maximum length');
    });

    it('validates temperature parameter range', async () => {
      await expect(
        bedrockService.generateResponse('Test', { temperature: 2.0 })
      ).rejects.toThrow('Temperature must be between 0 and 1');
    });
  });
});