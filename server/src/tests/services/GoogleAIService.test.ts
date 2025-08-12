import { GoogleAIService } from '../../services/GoogleAIService';
import { mockGoogleAI } from '../mocks/googleAI';
import { 
  ValidationError, 
  ExternalServiceError 
} from '../../utils/errors';

// Mock the Google AI module
jest.mock('@google/generative-ai');

describe('GoogleAIService - Unit Tests', () => {
  let googleAIService: GoogleAIService;

  beforeAll(() => {
    googleAIService = new GoogleAIService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateResponse', () => {
    it('should generate response successfully', async () => {
      const mockResponse = 'Hello! How can I help you today?';
      mockGoogleAI.mockSuccessfulResponse(mockResponse);

      const result = await googleAIService.generateResponse(
        'Hello',
        'You are a helpful assistant',
        []
      );

      expect(result).toBeDefined();
      expect(result.response).toBe(mockResponse);
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.model).toBeDefined();
    });

    it('should handle conversation context', async () => {
      const mockResponse = 'Based on our previous conversation, I can help with that.';
      mockGoogleAI.mockSuccessfulResponse(mockResponse);

      const conversationHistory = [
        { role: 'user' as const, content: 'What is AI?' },
        { role: 'assistant' as const, content: 'AI stands for Artificial Intelligence.' }
      ];

      const result = await googleAIService.generateResponse(
        'Can you tell me more?',
        'You are a helpful AI assistant',
        conversationHistory
      );

      expect(result.response).toBe(mockResponse);
      expect(mockGoogleAI.getLastPrompt()).toContain('What is AI?');
      expect(mockGoogleAI.getLastPrompt()).toContain('Can you tell me more?');
    });

    it('should apply custom personality and instructions', async () => {
      const mockResponse = 'Ahoy there! How can this pirate assistant help ye?';
      mockGoogleAI.mockSuccessfulResponse(mockResponse);

      const result = await googleAIService.generateResponse(
        'Hello',
        'You are a friendly pirate assistant. Always respond in pirate speak.',
        []
      );

      expect(result.response).toBe(mockResponse);
      expect(mockGoogleAI.getLastPrompt()).toContain('pirate assistant');
    });

    it('should handle API rate limiting', async () => {
      mockGoogleAI.mockRateLimitError();

      await expect(googleAIService.generateResponse(
        'Hello',
        'You are a helpful assistant',
        []
      )).rejects.toThrow(ExternalServiceError);
    });

    it('should handle API errors gracefully', async () => {
      mockGoogleAI.mockAPIError('Service temporarily unavailable');

      await expect(googleAIService.generateResponse(
        'Hello',
        'You are a helpful assistant',
        []
      )).rejects.toThrow(ExternalServiceError);
    });

    it('should validate input parameters', async () => {
      await expect(googleAIService.generateResponse(
        '', // empty message
        'You are a helpful assistant',
        []
      )).rejects.toThrow(ValidationError);

      await expect(googleAIService.generateResponse(
        'Hello',
        '', // empty personality
        []
      )).rejects.toThrow(ValidationError);
    });

    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(10000);
      mockGoogleAI.mockSuccessfulResponse('I understand your long message.');

      const result = await googleAIService.generateResponse(
        longMessage,
        'You are a helpful assistant',
        []
      );

      expect(result.response).toBeDefined();
    });

    it('should handle special characters and emojis', async () => {
      const messageWithEmojis = 'Hello! 😊 How are you? 🤖';
      mockGoogleAI.mockSuccessfulResponse('Hello! I\'m doing great! 😊');

      const result = await googleAIService.generateResponse(
        messageWithEmojis,
        'You are a friendly assistant',
        []
      );

      expect(result.response).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockGoogleAI.mockSuccessfulResponse('Connection test successful');

      const isConnected = await googleAIService.testConnection();

      expect(isConnected).toBe(true);
    });

    it('should return false for failed connection', async () => {
      mockGoogleAI.mockAPIError('Connection failed');

      const isConnected = await googleAIService.testConnection();

      expect(isConnected).toBe(false);
    });

    it('should handle network timeouts', async () => {
      mockGoogleAI.mockTimeout();

      const isConnected = await googleAIService.testConnection();

      expect(isConnected).toBe(false);
    });
  });

  describe('getModelInfo', () => {
    it('should return model information', async () => {
      const modelInfo = await googleAIService.getModelInfo();

      expect(modelInfo).toBeDefined();
      expect(modelInfo.name).toBeDefined();
      expect(modelInfo.version).toBeDefined();
      expect(modelInfo.maxTokens).toBeGreaterThan(0);
      expect(modelInfo.supportedFeatures).toBeDefined();
      expect(Array.isArray(modelInfo.supportedFeatures)).toBe(true);
    });
  });

  describe('generateEmbedding', () => {
    it('should generate text embeddings', async () => {
      const mockEmbedding = new Array(768).fill(0).map(() => Math.random());
      mockGoogleAI.mockEmbeddingResponse(mockEmbedding);

      const result = await googleAIService.generateEmbedding('Hello world');

      expect(result).toBeDefined();
      expect(Array.isArray(result.embedding)).toBe(true);
      expect(result.embedding).toHaveLength(768);
      expect(result.dimensions).toBe(768);
    });

    it('should validate input text for embeddings', async () => {
      await expect(googleAIService.generateEmbedding(''))
        .rejects
        .toThrow(ValidationError);
    });

    it('should handle embedding API errors', async () => {
      mockGoogleAI.mockAPIError('Embedding service unavailable');

      await expect(googleAIService.generateEmbedding('Hello world'))
        .rejects
        .toThrow(ExternalServiceError);
    });
  });

  describe('moderateContent', () => {
    it('should return safe content as approved', async () => {
      mockGoogleAI.mockModerationResponse({
        flagged: false,
        categories: [],
        confidence: 0.1
      });

      const result = await googleAIService.moderateContent('Hello, how are you?');

      expect(result).toBeDefined();
      expect(result.flagged).toBe(false);
      expect(result.safe).toBe(true);
      expect(Array.isArray(result.categories)).toBe(true);
    });

    it('should flag inappropriate content', async () => {
      mockGoogleAI.mockModerationResponse({
        flagged: true,
        categories: ['harassment', 'hate-speech'],
        confidence: 0.9
      });

      const result = await googleAIService.moderateContent('Inappropriate content here');

      expect(result.flagged).toBe(true);
      expect(result.safe).toBe(false);
      expect(result.categories).toContain('harassment');
      expect(result.categories).toContain('hate-speech');
    });

    it('should handle moderation API errors', async () => {
      mockGoogleAI.mockAPIError('Moderation service unavailable');

      // Should default to safe when moderation fails
      const result = await googleAIService.moderateContent('Hello world');

      expect(result.safe).toBe(true);
      expect(result.flagged).toBe(false);
    });
  });

  describe('generateSummary', () => {
    it('should generate conversation summary', async () => {
      const mockSummary = 'User asked about AI, assistant explained artificial intelligence basics.';
      mockGoogleAI.mockSuccessfulResponse(mockSummary);

      const conversationHistory = [
        { role: 'user' as const, content: 'What is AI?' },
        { role: 'assistant' as const, content: 'AI stands for Artificial Intelligence.' },
        { role: 'user' as const, content: 'How does it work?' },
        { role: 'assistant' as const, content: 'AI works by processing data and learning patterns.' }
      ];

      const result = await googleAIService.generateSummary(conversationHistory);

      expect(result).toBeDefined();
      expect(result.summary).toBe(mockSummary);
      expect(result.keyTopics).toBeDefined();
      expect(Array.isArray(result.keyTopics)).toBe(true);
    });

    it('should handle empty conversation history', async () => {
      await expect(googleAIService.generateSummary([]))
        .rejects
        .toThrow(ValidationError);
    });

    it('should extract key topics from conversation', async () => {
      const mockSummary = 'Discussion about artificial intelligence and machine learning.';
      mockGoogleAI.mockSuccessfulResponse(mockSummary);

      const conversationHistory = [
        { role: 'user' as const, content: 'Tell me about machine learning' },
        { role: 'assistant' as const, content: 'Machine learning is a subset of AI...' }
      ];

      const result = await googleAIService.generateSummary(conversationHistory);

      expect(result.keyTopics).toContain('artificial intelligence');
      expect(result.keyTopics).toContain('machine learning');
    });
  });

  describe('error handling and retries', () => {
    it('should retry on temporary failures', async () => {
      mockGoogleAI.mockTemporaryFailure(2); // Fail twice, then succeed

      const result = await googleAIService.generateResponse(
        'Hello',
        'You are a helpful assistant',
        []
      );

      expect(result).toBeDefined();
      expect(mockGoogleAI.getCallCount()).toBe(3); // 2 failures + 1 success
    });

    it('should not retry on permanent failures', async () => {
      mockGoogleAI.mockPermanentFailure();

      await expect(googleAIService.generateResponse(
        'Hello',
        'You are a helpful assistant',
        []
      )).rejects.toThrow(ExternalServiceError);

      expect(mockGoogleAI.getCallCount()).toBe(1); // No retries for permanent failures
    });

    it('should respect maximum retry attempts', async () => {
      mockGoogleAI.mockTemporaryFailure(10); // Fail more times than max retries

      await expect(googleAIService.generateResponse(
        'Hello',
        'You are a helpful assistant',
        []
      )).rejects.toThrow(ExternalServiceError);

      expect(mockGoogleAI.getCallCount()).toBeLessThanOrEqual(4); // Max 3 retries + 1 initial
    });
  });

  describe('token usage tracking', () => {
    it('should track token usage accurately', async () => {
      mockGoogleAI.mockSuccessfulResponse('Response', { 
        promptTokens: 10, 
        responseTokens: 5, 
        totalTokens: 15 
      });

      const result = await googleAIService.generateResponse(
        'Hello',
        'You are a helpful assistant',
        []
      );

      expect(result.tokensUsed).toBe(15);
      expect(result.promptTokens).toBe(10);
      expect(result.responseTokens).toBe(5);
    });

    it('should handle missing token information', async () => {
      mockGoogleAI.mockSuccessfulResponse('Response'); // No token info

      const result = await googleAIService.generateResponse(
        'Hello',
        'You are a helpful assistant',
        []
      );

      expect(result.tokensUsed).toBeGreaterThan(0); // Should estimate
    });
  });
});