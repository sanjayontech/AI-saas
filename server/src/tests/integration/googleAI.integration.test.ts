import { GoogleAIService } from '../../services/GoogleAIService';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

describe('Google AI Integration Tests', () => {
  let googleAIService: GoogleAIService;

  beforeAll(() => {
    googleAIService = new GoogleAIService();
  });

  describe('Real API Integration', () => {
    // Skip these tests if no API key is provided
    const skipIfNoApiKey = process.env.GOOGLE_AI_API_KEY ? describe : describe.skip;

    skipIfNoApiKey('with real Google AI API', () => {
      test('should generate response for simple message', async () => {
        const response = await googleAIService.generateResponse(
          'Hello, how are you?',
          'You are a helpful assistant.',
          []
        );

        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
      }, 10000);

      test('should handle conversation context', async () => {
        const context = [
          { role: 'user' as const, content: 'My name is John' },
          { role: 'assistant' as const, content: 'Nice to meet you, John!' }
        ];

        const response = await googleAIService.generateResponse(
          'What is my name?',
          'You are a helpful assistant with good memory.',
          context
        );

        expect(response).toBeDefined();
        expect(response.toLowerCase()).toContain('john');
      }, 10000);

      test('should respect personality settings', async () => {
        const formalResponse = await googleAIService.generateResponse(
          'How are you?',
          'You are a formal, professional assistant. Always use formal language.',
          []
        );

        const casualResponse = await googleAIService.generateResponse(
          'How are you?',
          'You are a casual, friendly assistant. Use informal language and emojis.',
          []
        );

        expect(formalResponse).toBeDefined();
        expect(casualResponse).toBeDefined();
        // Responses should be different due to different personalities
        expect(formalResponse).not.toBe(casualResponse);
      }, 15000);

      test('should handle rate limiting gracefully', async () => {
        // Make multiple rapid requests to test rate limiting
        const promises = Array(5).fill(0).map(() =>
          googleAIService.generateResponse(
            'Test message',
            'You are a test assistant.',
            []
          )
        );

        const results = await Promise.allSettled(promises);
        
        // At least some should succeed
        const successful = results.filter(r => r.status === 'fulfilled');
        expect(successful.length).toBeGreaterThan(0);
      }, 20000);

      test('should handle long messages', async () => {
        const longMessage = 'Tell me about '.repeat(100) + 'artificial intelligence.';
        
        const response = await googleAIService.generateResponse(
          longMessage,
          'You are a knowledgeable assistant.',
          []
        );

        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
      }, 15000);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle invalid API key', async () => {
      const invalidService = new GoogleAIService('invalid-api-key');
      
      await expect(
        invalidService.generateResponse('Test', 'Test personality', [])
      ).rejects.toThrow();
    });

    test('should handle network errors', async () => {
      // Mock network failure
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        googleAIService.generateResponse('Test', 'Test personality', [])
      ).rejects.toThrow();

      global.fetch = originalFetch;
    });

    test('should handle malformed responses', async () => {
      // Mock malformed response
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      });

      await expect(
        googleAIService.generateResponse('Test', 'Test personality', [])
      ).rejects.toThrow();

      global.fetch = originalFetch;
    });
  });

  describe('Performance Integration', () => {
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await googleAIService.generateResponse(
        'Quick test message',
        'You are a fast assistant.',
        []
      );
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 10 seconds for simple messages
      expect(responseTime).toBeLessThan(10000);
    });

    test('should handle concurrent requests', async () => {
      const concurrentRequests = Array(3).fill(0).map((_, index) =>
        googleAIService.generateResponse(
          `Concurrent message ${index}`,
          'You are a concurrent assistant.',
          []
        )
      );

      const results = await Promise.all(concurrentRequests);
      
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    }, 20000);
  });
});