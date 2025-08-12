import { ChatbotService } from '../../services/ChatbotService';
import { Chatbot } from '../../models/Chatbot';
import { Conversation } from '../../models/Conversation';
import { Message } from '../../models/Message';
import { TestDataFactory, TestCleanup, TestAssertions } from '../utils/testHelpers';
import { ValidationError, NotFoundError, AuthorizationError } from '../../utils/errors';
import { mockGoogleAIService } from '../mocks/googleAI';

describe('ChatbotService - Unit Tests', () => {
  let chatbotService: ChatbotService;
  let testUser: any;

  beforeAll(() => {
    chatbotService = new ChatbotService();
  });

  beforeEach(async () => {
    testUser = await TestDataFactory.createTestUser();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await TestCleanup.cleanupAll();
  });

  describe('createChatbot', () => {
    it('should create a new chatbot successfully', async () => {
      const chatbotData = {
        name: 'Test Bot',
        description: 'A test chatbot',
        personality: 'Helpful and friendly',
        knowledgeBase: ['Test knowledge'],
        appearance: {
          primaryColor: '#3B82F6',
          secondaryColor: '#F3F4F6',
          fontFamily: 'Arial',
          borderRadius: 12,
          position: 'bottom-right' as const
        },
        settings: {
          maxTokens: 150,
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'I apologize, but I cannot help with that.',
          collectUserInfo: false
        }
      };

      const result = await chatbotService.createChatbot(testUser.user.id!, chatbotData);

      TestAssertions.expectValidChatbot(result);
      expect(result.name).toBe(chatbotData.name);
      expect(result.description).toBe(chatbotData.description);
      expect(result.personality).toBe(chatbotData.personality);
      expect(result.userId).toBe(testUser.user.id);
      expect(result.isActive).toBe(true);
    });

    it('should throw ValidationError for invalid data', async () => {
      const invalidData = {
        name: '', // Empty name should fail validation
        description: 'A test chatbot'
      };

      await expect(chatbotService.createChatbot(testUser.user.id!, invalidData as any))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('getChatbotById', () => {
    it('should return chatbot for owner', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);

      const result = await chatbotService.getChatbotById(chatbot.id!, testUser.user.id!);

      TestAssertions.expectValidChatbot(result);
      expect(result!.id).toBe(chatbot.id);
      expect(result!.name).toBe(chatbot.name);
    });

    it('should throw NotFoundError for non-existent chatbot', async () => {
      await expect(chatbotService.getChatbotById('non-existent-id', testUser.user.id!))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should throw AuthorizationError for non-owner', async () => {
      const otherUser = await TestDataFactory.createTestUser();
      const chatbot = await TestDataFactory.createTestChatbot(otherUser.user.id!);

      await expect(chatbotService.getChatbotById(chatbot.id!, testUser.user.id!))
        .rejects
        .toThrow(AuthorizationError);
    });
  });

  describe('updateChatbot', () => {
    it('should update chatbot successfully', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);
      const updateData = {
        name: 'Updated Bot Name',
        description: 'Updated description'
      };

      const result = await chatbotService.updateChatbot(chatbot.id!, testUser.user.id!, updateData);

      TestAssertions.expectValidChatbot(result);
      expect(result.name).toBe(updateData.name);
      expect(result.description).toBe(updateData.description);
    });

    it('should throw NotFoundError for non-existent chatbot', async () => {
      await expect(chatbotService.updateChatbot('non-existent-id', testUser.user.id!, {}))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should throw AuthorizationError for non-owner', async () => {
      const otherUser = await TestDataFactory.createTestUser();
      const chatbot = await TestDataFactory.createTestChatbot(otherUser.user.id!);

      await expect(chatbotService.updateChatbot(chatbot.id!, testUser.user.id!, {}))
        .rejects
        .toThrow(AuthorizationError);
    });
  });

  describe('deleteChatbot', () => {
    it('should delete chatbot successfully', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);

      const result = await chatbotService.deleteChatbot(chatbot.id!, testUser.user.id!);

      expect(result).toBe(true);

      // Verify chatbot is deleted
      await expect(chatbotService.getChatbotById(chatbot.id!, testUser.user.id!))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should throw NotFoundError for non-existent chatbot', async () => {
      await expect(chatbotService.deleteChatbot('non-existent-id', testUser.user.id!))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('processMessage', () => {
    it('should process message and return AI response', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);
      const sessionId = 'test-session-123';
      const message = 'Hello, how are you?';

      const result = await chatbotService.processMessage(
        chatbot.id!,
        sessionId,
        message,
        {}
      );

      expect(result).toBeDefined();
      expect(result.response).toBe('This is a mock AI response for testing purposes.');
      expect(result.conversationId).toBeDefined();
      expect(result.messageId).toBeDefined();
      
      // Verify Google AI service was called
      expect(mockGoogleAIService.generateResponse).toHaveBeenCalledTimes(1);
    });

    it('should create new conversation for new session', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);
      const sessionId = 'new-session-456';
      const message = 'Hello!';

      const result = await chatbotService.processMessage(
        chatbot.id!,
        sessionId,
        message,
        {}
      );

      expect(result.conversationId).toBeDefined();

      // Verify conversation was created
      const conversation = await Conversation.findById(result.conversationId);
      expect(conversation).toBeDefined();
      expect(conversation!.sessionId).toBe(sessionId);
      expect(conversation!.chatbotId).toBe(chatbot.id);
    });

    it('should throw NotFoundError for non-existent chatbot', async () => {
      await expect(chatbotService.processMessage(
        'non-existent-id',
        'session-123',
        'Hello',
        {}
      )).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for inactive chatbot', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!, {
        isActive: false
      });

      await expect(chatbotService.processMessage(
        chatbot.id!,
        'session-123',
        'Hello',
        {}
      )).rejects.toThrow(ValidationError);
    });
  });

  describe('getUserChatbots', () => {
    it('should return all chatbots for user', async () => {
      const chatbot1 = await TestDataFactory.createTestChatbot(testUser.user.id!, {
        name: 'Bot 1'
      });
      const chatbot2 = await TestDataFactory.createTestChatbot(testUser.user.id!, {
        name: 'Bot 2'
      });

      const result = await chatbotService.getUserChatbots(testUser.user.id!);

      expect(result).toHaveLength(2);
      expect(result.map(c => c.name)).toContain('Bot 1');
      expect(result.map(c => c.name)).toContain('Bot 2');
    });

    it('should return empty array for user with no chatbots', async () => {
      const result = await chatbotService.getUserChatbots(testUser.user.id!);
      expect(result).toHaveLength(0);
    });
  });

  describe('trainChatbot', () => {
    it('should update chatbot knowledge base', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);
      const trainingData = [
        { question: 'What is AI?', answer: 'AI stands for Artificial Intelligence' },
        { question: 'How does it work?', answer: 'AI uses machine learning algorithms' }
      ];

      const result = await chatbotService.trainChatbot(
        chatbot.id!,
        testUser.user.id!,
        trainingData
      );

      expect(result).toBe(true);

      // Verify knowledge base was updated
      const updatedChatbot = await Chatbot.findById(chatbot.id!);
      expect(updatedChatbot?.knowledgeBase).toContain('What is AI?');
      expect(updatedChatbot?.knowledgeBase).toContain('AI stands for Artificial Intelligence');
    });

    it('should throw NotFoundError for non-existent chatbot', async () => {
      await expect(chatbotService.trainChatbot(
        'non-existent-id',
        testUser.user.id!,
        []
      )).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError for non-owner', async () => {
      const otherUser = await TestDataFactory.createTestUser();
      const chatbot = await TestDataFactory.createTestChatbot(otherUser.user.id!);

      await expect(chatbotService.trainChatbot(
        chatbot.id!,
        testUser.user.id!,
        []
      )).rejects.toThrow(AuthorizationError);
    });
  });
});