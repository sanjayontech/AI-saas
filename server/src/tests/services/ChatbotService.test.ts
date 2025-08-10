import { ChatbotService } from '../../services/ChatbotService';
import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { setupTestDatabase, cleanupTestDatabase } from '../setup';
import { ValidationError, NotFoundError } from '../../utils/errors';

// Mock the Google AI Service
jest.mock('../../services/GoogleAIService', () => {
  return {
    GoogleAIService: jest.fn().mockImplementation(() => ({
      generateResponse: jest.fn().mockResolvedValue({
        content: 'Test AI response',
        metadata: { model: 'gemini-pro' }
      }),
      testConnection: jest.fn().mockResolvedValue({ success: true })
    }))
  };
});

describe('ChatbotService', () => {
  let chatbotService: ChatbotService;
  let testUser: User;

  beforeAll(async () => {
    await setupTestDatabase();
    chatbotService = new ChatbotService();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Create a test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    });
  });

  describe('createChatbot', () => {
    it('should create a chatbot with valid configuration', async () => {
      const config = {
        name: 'Test Chatbot',
        description: 'A test chatbot',
        personality: 'friendly and helpful',
        knowledgeBase: ['Test knowledge'],
        appearance: {
          primaryColor: '#3B82F6',
          secondaryColor: '#F3F4F6',
          fontFamily: 'Inter, sans-serif',
          borderRadius: 8,
          position: 'bottom-right' as const,
        },
        settings: {
          maxTokens: 1000,
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'Sorry, I could not understand that.',
          collectUserInfo: false,
        },
      };

      const chatbot = await chatbotService.createChatbot(testUser.id!, config);

      expect(chatbot).toBeDefined();
      expect(chatbot.name).toBe(config.name);
      expect(chatbot.description).toBe(config.description);
      expect(chatbot.personality).toBe(config.personality);
      expect(chatbot.isActive).toBe(true);
    });

    it('should throw ValidationError for invalid configuration', async () => {
      const invalidConfig = {
        name: '', // Empty name should be invalid
        personality: 'helpful',
        knowledgeBase: [],
        appearance: {
          primaryColor: '#3B82F6',
          secondaryColor: '#F3F4F6',
          fontFamily: 'Inter, sans-serif',
          borderRadius: 8,
          position: 'bottom-right' as const,
        },
        settings: {
          maxTokens: 50, // Too low, should be invalid
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'Sorry, I could not understand that.',
          collectUserInfo: false,
        },
      };

      await expect(
        chatbotService.createChatbot(testUser.id!, invalidConfig)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getChatbotById', () => {
    it('should return chatbot for valid ID and user', async () => {
      const config = {
        name: 'Test Chatbot',
        personality: 'helpful',
        knowledgeBase: [],
        appearance: {
          primaryColor: '#3B82F6',
          secondaryColor: '#F3F4F6',
          fontFamily: 'Inter, sans-serif',
          borderRadius: 8,
          position: 'bottom-right' as const,
        },
        settings: {
          maxTokens: 1000,
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'Sorry, I could not understand that.',
          collectUserInfo: false,
        },
      };

      const createdChatbot = await chatbotService.createChatbot(testUser.id!, config);
      const foundChatbot = await chatbotService.getChatbotById(createdChatbot.id!, testUser.id!);

      expect(foundChatbot).toBeDefined();
      expect(foundChatbot.id).toBe(createdChatbot.id);
      expect(foundChatbot.name).toBe(config.name);
    });

    it('should throw NotFoundError for non-existent chatbot', async () => {
      await expect(
        chatbotService.getChatbotById('non-existent-id', testUser.id!)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for chatbot belonging to different user', async () => {
      const anotherUser = await User.create({
        email: 'another@example.com',
        password: 'TestPassword123!',
        firstName: 'Another',
        lastName: 'User'
      });

      const config = {
        name: 'Test Chatbot',
        personality: 'helpful',
        knowledgeBase: [],
        appearance: {
          primaryColor: '#3B82F6',
          secondaryColor: '#F3F4F6',
          fontFamily: 'Inter, sans-serif',
          borderRadius: 8,
          position: 'bottom-right' as const,
        },
        settings: {
          maxTokens: 1000,
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'Sorry, I could not understand that.',
          collectUserInfo: false,
        },
      };

      const chatbot = await chatbotService.createChatbot(testUser.id!, config);

      await expect(
        chatbotService.getChatbotById(chatbot.id!, anotherUser.id!)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateChatbot', () => {
    it('should update chatbot with valid data', async () => {
      const config = {
        name: 'Original Name',
        personality: 'helpful',
        knowledgeBase: [],
        appearance: {
          primaryColor: '#3B82F6',
          secondaryColor: '#F3F4F6',
          fontFamily: 'Inter, sans-serif',
          borderRadius: 8,
          position: 'bottom-right' as const,
        },
        settings: {
          maxTokens: 1000,
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'Sorry, I could not understand that.',
          collectUserInfo: false,
        },
      };

      const chatbot = await chatbotService.createChatbot(testUser.id!, config);
      
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description'
      };

      const updatedChatbot = await chatbotService.updateChatbot(
        chatbot.id!,
        testUser.id!,
        updateData
      );

      expect(updatedChatbot.name).toBe('Updated Name');
      expect(updatedChatbot.description).toBe('Updated description');
    });

    it('should throw ValidationError for invalid update data', async () => {
      const config = {
        name: 'Test Chatbot',
        personality: 'helpful',
        knowledgeBase: [],
        appearance: {
          primaryColor: '#3B82F6',
          secondaryColor: '#F3F4F6',
          fontFamily: 'Inter, sans-serif',
          borderRadius: 8,
          position: 'bottom-right' as const,
        },
        settings: {
          maxTokens: 1000,
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'Sorry, I could not understand that.',
          collectUserInfo: false,
        },
      };

      const chatbot = await chatbotService.createChatbot(testUser.id!, config);
      
      const invalidUpdateData = {
        settings: {
          maxTokens: 50, // Too low
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'Sorry, I could not understand that.',
          collectUserInfo: false,
        }
      };

      await expect(
        chatbotService.updateChatbot(chatbot.id!, testUser.id!, invalidUpdateData)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getUserChatbots', () => {
    it('should return all chatbots for a user', async () => {
      const config1 = {
        name: 'Chatbot 1',
        personality: 'helpful',
        knowledgeBase: [],
        appearance: {
          primaryColor: '#3B82F6',
          secondaryColor: '#F3F4F6',
          fontFamily: 'Inter, sans-serif',
          borderRadius: 8,
          position: 'bottom-right' as const,
        },
        settings: {
          maxTokens: 1000,
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'Sorry, I could not understand that.',
          collectUserInfo: false,
        },
      };

      const config2 = {
        name: 'Chatbot 2',
        personality: 'friendly',
        knowledgeBase: [],
        appearance: {
          primaryColor: '#3B82F6',
          secondaryColor: '#F3F4F6',
          fontFamily: 'Inter, sans-serif',
          borderRadius: 8,
          position: 'bottom-right' as const,
        },
        settings: {
          maxTokens: 1000,
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'Sorry, I could not understand that.',
          collectUserInfo: false,
        },
      };

      await chatbotService.createChatbot(testUser.id!, config1);
      await chatbotService.createChatbot(testUser.id!, config2);

      const chatbots = await chatbotService.getUserChatbots(testUser.id!);

      expect(chatbots).toHaveLength(2);
      expect(chatbots.some(c => c.name === 'Chatbot 1')).toBe(true);
      expect(chatbots.some(c => c.name === 'Chatbot 2')).toBe(true);
    });

    it('should return empty array for user with no chatbots', async () => {
      const anotherUser = await User.create({
        email: 'another@example.com',
        password: 'TestPassword123!',
        firstName: 'Another',
        lastName: 'User'
      });

      const chatbots = await chatbotService.getUserChatbots(anotherUser.id!);
      expect(chatbots).toHaveLength(0);
    });
  });

  describe('deleteChatbot', () => {
    it('should delete a chatbot', async () => {
      const config = {
        name: 'To Delete',
        personality: 'helpful',
        knowledgeBase: [],
        appearance: {
          primaryColor: '#3B82F6',
          secondaryColor: '#F3F4F6',
          fontFamily: 'Inter, sans-serif',
          borderRadius: 8,
          position: 'bottom-right' as const,
        },
        settings: {
          maxTokens: 1000,
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'Sorry, I could not understand that.',
          collectUserInfo: false,
        },
      };

      const chatbot = await chatbotService.createChatbot(testUser.id!, config);
      
      await chatbotService.deleteChatbot(chatbot.id!, testUser.id!);

      const deletedChatbot = await Chatbot.findById(chatbot.id!);
      expect(deletedChatbot).toBeNull();
    });

    it('should throw NotFoundError for non-existent chatbot', async () => {
      await expect(
        chatbotService.deleteChatbot('non-existent-id', testUser.id!)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('testAIConnection', () => {
    it('should test AI service connection', async () => {
      const result = await chatbotService.testAIConnection();
      expect(result.success).toBe(true);
    });
  });
});