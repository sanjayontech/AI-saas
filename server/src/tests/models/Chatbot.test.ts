import { Chatbot } from '../../models/Chatbot';
import { User } from '../../models/User';
import { setupTestDatabase, cleanupTestDatabase } from '../setup';

describe('Chatbot Model', () => {
  let testUser: User;

  beforeAll(async () => {
    await setupTestDatabase();
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

  describe('create', () => {
    it('should create a chatbot with valid data', async () => {
      const chatbotData = {
        userId: testUser.id!,
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

      const chatbot = await Chatbot.create(chatbotData);

      expect(chatbot).toBeDefined();
      expect(chatbot.id).toBeDefined();
      expect(chatbot.name).toBe(chatbotData.name);
      expect(chatbot.description).toBe(chatbotData.description);
      expect(chatbot.personality).toBe(chatbotData.personality);
      expect(chatbot.knowledgeBase).toEqual(chatbotData.knowledgeBase);
      expect(chatbot.appearance).toEqual(chatbotData.appearance);
      expect(chatbot.settings).toEqual(chatbotData.settings);
      expect(chatbot.isActive).toBe(true);
      expect(chatbot.createdAt).toBeDefined();
      expect(chatbot.updatedAt).toBeDefined();
    });

    it('should create a chatbot with default values', async () => {
      const chatbotData = {
        userId: testUser.id!,
        name: 'Minimal Chatbot',
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

      const chatbot = await Chatbot.create(chatbotData);

      expect(chatbot).toBeDefined();
      expect(chatbot.isActive).toBe(true);
      expect(chatbot.knowledgeBase).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should find a chatbot by ID', async () => {
      const chatbotData = {
        userId: testUser.id!,
        name: 'Findable Chatbot',
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

      const createdChatbot = await Chatbot.create(chatbotData);
      const foundChatbot = await Chatbot.findById(createdChatbot.id!);

      expect(foundChatbot).toBeDefined();
      expect(foundChatbot!.id).toBe(createdChatbot.id);
      expect(foundChatbot!.name).toBe(chatbotData.name);
    });

    it('should return null for non-existent ID', async () => {
      const chatbot = await Chatbot.findById('non-existent-id');
      expect(chatbot).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find all chatbots for a user', async () => {
      const chatbotData1 = {
        userId: testUser.id!,
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

      const chatbotData2 = {
        userId: testUser.id!,
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

      await Chatbot.create(chatbotData1);
      await Chatbot.create(chatbotData2);

      const chatbots = await Chatbot.findByUserId(testUser.id!);

      expect(chatbots).toHaveLength(2);
      expect(chatbots[0].name).toBe('Chatbot 2'); // Should be ordered by created_at desc
      expect(chatbots[1].name).toBe('Chatbot 1');
    });

    it('should return empty array for user with no chatbots', async () => {
      const anotherUser = await User.create({
        email: 'another@example.com',
        password: 'TestPassword123!',
        firstName: 'Another',
        lastName: 'User'
      });

      const chatbots = await Chatbot.findByUserId(anotherUser.id!);
      expect(chatbots).toHaveLength(0);
    });
  });

  describe('save', () => {
    it('should update a chatbot', async () => {
      const chatbotData = {
        userId: testUser.id!,
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

      const chatbot = await Chatbot.create(chatbotData);
      chatbot.name = 'Updated Name';
      chatbot.description = 'Updated description';

      const updatedChatbot = await chatbot.save();

      expect(updatedChatbot.name).toBe('Updated Name');
      expect(updatedChatbot.description).toBe('Updated description');
      expect(updatedChatbot.updatedAt).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should validate chatbot creation data', () => {
      const schema = Chatbot.getValidationSchema().create;
      
      const validData = {
        name: 'Test Chatbot',
        personality: 'helpful',
        knowledgeBase: ['test'],
        appearance: {
          primaryColor: '#3B82F6',
          secondaryColor: '#F3F4F6',
          fontFamily: 'Inter, sans-serif',
          borderRadius: 8,
          position: 'bottom-right',
        },
        settings: {
          maxTokens: 1000,
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'Sorry, I could not understand that.',
          collectUserInfo: false,
        },
      };

      const { error } = schema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid chatbot data', () => {
      const schema = Chatbot.getValidationSchema().create;
      
      const invalidData = {
        name: '', // Empty name should be invalid
        personality: 'helpful',
      };

      const { error } = schema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });
});