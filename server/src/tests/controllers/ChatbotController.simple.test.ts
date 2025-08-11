import request from 'supertest';
import { app } from '../testApp';
import { TestDataFactory, TestCleanup } from '../utils/testHelpers';

// Mock Google AI Service
jest.mock('../../services/GoogleAIService', () => {
  return {
    GoogleAIService: jest.fn().mockImplementation(() => ({
      generateResponse: jest.fn().mockResolvedValue({
        content: 'This is a test AI response',
        usage: { promptTokens: 10, completionTokens: 15, totalTokens: 25 }
      }),
      testConnection: jest.fn().mockResolvedValue(true)
    }))
  };
});

describe('ChatbotController - Integration Tests', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    testUser = await TestDataFactory.createTestUser();
    authToken = testUser.token;
  });

  afterEach(async () => {
    await TestCleanup.cleanupAll();
  });

  describe('POST /api/v1/chatbots', () => {
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
          position: 'bottom-right'
        },
        settings: {
          maxTokens: 150,
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'I apologize, but I cannot help with that.',
          collectUserInfo: false
        }
      };

      const response = await request(app)
        .post('/api/v1/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .send(chatbotData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chatbot).toBeDefined();
      expect(response.body.data.chatbot.name).toBe(chatbotData.name);
      expect(response.body.data.chatbot.description).toBe(chatbotData.description);
      expect(response.body.data.chatbot.isActive).toBe(true);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        name: '', // Empty name should fail validation
        description: 'A test chatbot'
      };

      const response = await request(app)
        .post('/api/v1/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const chatbotData = {
        name: 'Test Bot',
        description: 'A test chatbot'
      };

      const response = await request(app)
        .post('/api/v1/chatbots')
        .send(chatbotData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/v1/chatbots', () => {
    it('should return all chatbots for authenticated user', async () => {
      // Create test chatbots
      await TestDataFactory.createTestChatbot(testUser.user.id!, { name: 'Bot 1' });
      await TestDataFactory.createTestChatbot(testUser.user.id!, { name: 'Bot 2' });

      const response = await request(app)
        .get('/api/v1/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chatbots).toBeDefined();
      expect(response.body.data.chatbots).toHaveLength(2);
      expect(response.body.data.chatbots.map((c: any) => c.name)).toContain('Bot 1');
      expect(response.body.data.chatbots.map((c: any) => c.name)).toContain('Bot 2');
    });

    it('should return empty array when user has no chatbots', async () => {
      const response = await request(app)
        .get('/api/v1/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chatbots).toHaveLength(0);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/chatbots')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/v1/chatbots/:chatbotId', () => {
    it('should return specific chatbot by ID', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!, {
        name: 'Specific Bot'
      });

      const response = await request(app)
        .get(`/api/v1/chatbots/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chatbot).toBeDefined();
      expect(response.body.data.chatbot.id).toBe(chatbot.id);
      expect(response.body.data.chatbot.name).toBe('Specific Bot');
    });

    it('should return 404 for non-existent chatbot', async () => {
      const response = await request(app)
        .get('/api/v1/chatbots/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 403 for chatbot owned by another user', async () => {
      const otherUser = await TestDataFactory.createTestUser();
      const chatbot = await TestDataFactory.createTestChatbot(otherUser.user.id!);

      const response = await request(app)
        .get(`/api/v1/chatbots/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);

      const response = await request(app)
        .get(`/api/v1/chatbots/${chatbot.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/v1/chatbots/:chatbotId', () => {
    it('should update chatbot successfully', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);
      const updateData = {
        name: 'Updated Bot Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/v1/chatbots/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chatbot).toBeDefined();
      expect(response.body.data.chatbot.name).toBe(updateData.name);
      expect(response.body.data.chatbot.description).toBe(updateData.description);
    });

    it('should return 404 for non-existent chatbot', async () => {
      const response = await request(app)
        .put('/api/v1/chatbots/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid update data', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);

      const response = await request(app)
        .put(`/api/v1/chatbots/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' }) // Empty name should fail validation
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/v1/chatbots/:chatbotId', () => {
    it('should delete chatbot successfully', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);

      const response = await request(app)
        .delete(`/api/v1/chatbots/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();

      // Verify chatbot is deleted
      const getResponse = await request(app)
        .get(`/api/v1/chatbots/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent chatbot', async () => {
      const response = await request(app)
        .delete('/api/v1/chatbots/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/chatbots/:chatbotId/message', () => {
    it('should process message and return AI response', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);
      const messageData = {
        message: 'Hello, how are you?',
        sessionId: 'test-session-123'
      };

      const response = await request(app)
        .post(`/api/v1/chatbots/${chatbot.id}/message`)
        .send(messageData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.response).toBe('This is a test AI response');
      expect(response.body.data.conversationId).toBeDefined();
      expect(response.body.data.messageId).toBeDefined();
    });

    it('should return 400 for missing message', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);

      const response = await request(app)
        .post(`/api/v1/chatbots/${chatbot.id}/message`)
        .send({ sessionId: 'test-session' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing sessionId', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);

      const response = await request(app)
        .post(`/api/v1/chatbots/${chatbot.id}/message`)
        .send({ message: 'Hello' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent chatbot', async () => {
      const response = await request(app)
        .post('/api/v1/chatbots/non-existent-id/message')
        .send({ message: 'Hello', sessionId: 'test-session' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/chatbots/:chatbotId/train', () => {
    it('should train chatbot with new knowledge', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);
      const trainingData = [
        { question: 'What is AI?', answer: 'AI stands for Artificial Intelligence' },
        { question: 'How does it work?', answer: 'AI uses machine learning algorithms' }
      ];

      const response = await request(app)
        .post(`/api/v1/chatbots/${chatbot.id}/train`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ trainingData })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
    });

    it('should return 400 for invalid training data', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);

      const response = await request(app)
        .post(`/api/v1/chatbots/${chatbot.id}/train`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ trainingData: 'invalid-data' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);

      const response = await request(app)
        .post(`/api/v1/chatbots/${chatbot.id}/train`)
        .send({ trainingData: [] })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/v1/chatbots/test/ai-connection', () => {
    it('should test AI service connection', async () => {
      const response = await request(app)
        .get('/api/v1/chatbots/test/ai-connection')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.connected).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/chatbots/test/ai-connection')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});