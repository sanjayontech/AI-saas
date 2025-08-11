// Mock Google AI Service for testing
export const mockGoogleAIService = {
  generateResponse: jest.fn().mockResolvedValue({
    response: 'This is a mock AI response for testing purposes.',
    usage: {
      promptTokens: 10,
      completionTokens: 15,
      totalTokens: 25
    }
  }),

  generateStreamResponse: jest.fn().mockImplementation(async function* () {
    yield { content: 'This is a ' };
    yield { content: 'mock streaming ' };
    yield { content: 'response.' };
  }),

  validateApiKey: jest.fn().mockResolvedValue(true),

  getModelInfo: jest.fn().mockResolvedValue({
    name: 'gemini-pro',
    version: '1.0',
    maxTokens: 2048
  })
};

// Mock the entire GoogleAIService module
jest.mock('../../services/GoogleAIService', () => ({
  GoogleAIService: mockGoogleAIService
}));