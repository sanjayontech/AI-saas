import request from 'supertest';
import { app } from '../testServer';
import { db } from '../../database/connection';
import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { Conversation } from '../../models/Conversation';
import { JWTUtils } from '../../utils/jwt';

describe('ChatbotController', () => {
  let testUser: User;
  let authToken: string;
  let testChatbot: Chatbot;

  beforeAll(async () => {
    // Run migrations for test database
    await db.migrate.latest();
  });

  afterAll(async () => {
    // Close database connection
    await db.destroy();
  });

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      emailVerified: true
    });

    // Generate auth token
    authToken = JWTUtils.generateAccessToken(testUser);

    // Create test chatbot
    testChatbot = await Chatbot.create({
      userId: testUser.id!,
      name: 'Test Bot',
      description: 'A test chatbot',
      personality: 'helpful and friendly',
      knowledgeBase: ['Test knowledge'],
      appearance: {
        primaryColor: '#3B82F6',
        secondaryColor: '#F3F4F6',
        fontFamily: 'Inter, sans-serif',
        borderRadius: 8,
        position: 'bottom-right'
      },
      settings: {
        maxTokens: 1000,
        temperature: 0.7,
        responseDelay: 1000,
        fallbackMessage: 'Sorry, I cannot help with that.',
        collectUserInfo: false
      }
    });
  });

  afterEach(async () => {
    // Clean up in proper order to avoid foreign key constraints
    await db('messages').del();
    await db('conversations').del();
    await db('chatbots').del();
    await db('usage_stats').del();
    await db('user_profiles').del();
    await db('users').del();
  });

  describe('POST /api/v1/chatbots', () => {
    it('should create a new chatbot with valid data', async () => {
      const chatbotData = {
        name: 'New Test Bot',
        description: 'A new test chatbot',
        personality: 'professional and helpful',
        knowledgeBase: ['Knowledge item 1', 'Knowledge item 2'],
        appearance: {
          primaryColor: '#FF5722',
          secondaryColor: '#FFF3E0',
          fontFamily: 'Roboto, sans-serif',
          borderRadius: 12,
          position: 'bottom-left'
        },
        settings: {
          maxTokens: 1500,
          temperature: 0.8,
          responseDelay: 500,
          fallbackMessage: 'I apologize for the confusion.',
          collectUserInfo: true
        }
      };

      const response = await request(app)
        .post('/api/v1/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .send(chatbotData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Chatbot created successfully');
      expect(response.body.data.chatbot).toMatchObject({
        name: chatbotData.name,
        description: chatbotData.description,
        personality: chatbotData.personality,
        knowledgeBase: chatbotData.knowledgeBase,
        appearance: chatbotData.appearance,
        settings: chatbotData.settings,
        userId: testUser.id,
        isActive: true
      });
      expect(response.body.data.chatbot.id).toBeDefined();
      expect(response.body.data.chatbot.createdAt).toBeDefined();
    });

    it('should create a chatbot with default values when optional fields are omitted', async () => {
      const chatbotData = {
        name: 'Minimal Bot',
        personality: 'friendly'
      };

      const response = await request(app)
        .post('/api/v1/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .send(chatbotData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chatbot.name).toBe(chatbotData.name);
      expect(response.body.data.chatbot.personality).toBe(chatbotData.personality);
      expect(response.body.data.chatbot.knowledgeBase).toEqual([]);
      expect(response.body.data.chatbot.appearance.primaryColor).toBe('#3B82F6');
      expect(response.body.data.chatbot.settings.maxTokens).toBe(1000);
    });

    it('should return 400 for invalid chatbot data', async () => {
      const invalidData = {
        name: '', // Empty name
        personality: 'friendly'
      };

      const response = await request(app)
        .post('/api/v1/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('is not allowed to be empty');
    });

    it('should return 401 without authentication', async () => {
      const chatbotData = {
        name: 'Test Bot',
        personality: 'friendly'
      };

      await request(app)
        .post('/api/v1/chatbots')
        .send(chatbotData)
        .expect(401);
    });
  });

  describe('GET /api/v1/chatbots', () => {
    it('should return all chatbots for the authenticated user', async () => {
      // Create another chatbot
      await Chatbot.create({
        userId: testUser.id!,
        name: 'Second Bot',
        personality: 'professional',
        knowledgeBase: [],
        appearance: {
          primaryColor: '#4CAF50',
          secondaryColor: '#E8F5E8',
          fontFamily: 'Arial, sans-serif',
          borderRadius: 6,
          position: 'center'
        },
        settings: {
          maxTokens: 800,
          temperature: 0.5,
          responseDelay: 2000,
          fallbackMessage: 'Please try again.',
          collectUserInfo: false
        }
      });

      const response = await request(app)
        .get('/api/v1/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chatbots).toHaveLength(2);
      expect(response.body.data.chatbots[0].userId).toBe(testUser.id);
      expect(response.body.data.chatbots[1].userId).toBe(testUser.id);
    });

    it('should return empty array when user has no chatbots', async () => {
      // Delete the test chatbot
      await Chatbot.delete(testChatbot.id!);

      const response = await request(app)
        .get('/api/v1/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chatbots).toHaveLength(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/chatbots')
        .expect(401);
    });
  });

  describe('GET /api/v1/chatbots/:chatbotId', () => {
    it('should return a specific chatbot by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/chatbots/${testChatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chatbot.id).toBe(testChatbot.id);
      expect(response.body.data.chatbot.name).toBe(testChatbot.name);
      expect(response.body.data.chatbot.userId).toBe(testUser.id);
    });

    it('should return 404 for non-existent chatbot', async () => {
      const response = await request(app)
        .get('/api/v1/chatbots/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Chatbot not found');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/v1/chatbots/${testChatbot.id}`)
        .expect(401);
    });
  });

  describe('PUT /api/v1/chatbots/:chatbotId', () => {
    it('should update a chatbot with valid data', async () => {
      const updateData = {
        name: 'Updated Bot Name',
        description: 'Updated description',
        personality: 'more professional',
        settings: {
          maxTokens: 1200,
          temperature: 0.9,
          responseDelay: 800,
          fallbackMessage: 'Updated fallback message',
          collectUserInfo: true
        }
      };

      const response = await request(app)
        .put(`/api/v1/chatbots/${testChatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Chatbot updated successfully');
      expect(response.body.data.chatbot.name).toBe(updateData.name);
      expect(response.body.data.chatbot.description).toBe(updateData.description);
      expect(response.body.data.chatbot.personality).toBe(updateData.personality);
      expect(response.body.data.chatbot.settings.maxTokens).toBe(updateData.settings.maxTokens);
    });

    it('should return 404 for non-existent chatbot', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put('/api/v1/chatbots/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Chatbot not found');
    });

    it('should return 400 for invalid update data', async () => {
      const invalidData = {
        settings: {
          maxTokens: 50000 // Exceeds maximum
        }
      };

      const response = await request(app)
        .put(`/api/v1/chatbots/${testChatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/chatbots/:chatbotId', () => {
    it('should delete a chatbot', async () => {
      const response = await request(app)
        .delete(`/api/v1/chatbots/${testChatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Chatbot deleted successfully');

      // Verify chatbot is deleted
      const deletedChatbot = await Chatbot.findById(testChatbot.id!);
      expect(deletedChatbot).toBeNull();
    });

    it('should return 404 for non-existent chatbot', async () => {
      const response = await request(app)
        .delete('/api/v1/chatbots/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Chatbot not found');
    });
  });

  describe('POST /api/v1/chatbots/:chatbotId/message', () => {
    it('should process a message and return AI response', async () => {
      const messageData = {
        message: 'Hello, how are you?',
        sessionId: 'test-session-123',
        userInfo: { name: 'Test User' }
      };

      const response = await request(app)
        .post(`/api/v1/chatbots/${testChatbot.id}/message`)
        .send(messageData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.response).toBeDefined();
      expect(response.body.data.conversationId).toBeDefined();
      expect(response.body.data.messageId).toBeDefined();
      expect(typeof response.body.data.response).toBe('string');
    });

    it('should return 400 for missing message', async () => {
      const messageData = {
        sessionId: 'test-session-123'
      };

      const response = await request(app)
        .post(`/api/v1/chatbots/${testChatbot.id}/message`)
        .send(messageData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Message is required');
    });

    it('should return 400 for missing sessionId', async () => {
      const messageData = {
        message: 'Hello'
      };

      const response = await request(app)
        .post(`/api/v1/chatbots/${testChatbot.id}/message`)
        .send(messageData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Session ID is required');
    });

    it('should return 404 for non-existent chatbot', async () => {
      const messageData = {
        message: 'Hello',
        sessionId: 'test-session-123'
      };

      const response = await request(app)
        .post('/api/v1/chatbots/non-existent-id/message')
        .send(messageData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Chatbot not found or inactive');
    });
  });

  describe('POST /api/v1/chatbots/:chatbotId/train', () => {
    it('should train a chatbot with new knowledge', async () => {
      const trainingData = {
        trainingData: [
          'New knowledge item 1',
          'New knowledge item 2',
          'New knowledge item 3'
        ]
      };

      const response = await request(app)
        .post(`/api/v1/chatbots/${testChatbot.id}/train`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(trainingData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Chatbot trained successfully');
      expect(response.body.data.chatbot.knowledgeBase).toContain('New knowledge item 1');
      expect(response.body.data.chatbot.knowledgeBase).toContain('New knowledge item 2');
      expect(response.body.data.chatbot.knowledgeBase).toContain('New knowledge item 3');
    });

    it('should return 400 for invalid training data', async () => {
      const invalidData = {
        trainingData: ['', 'Valid item'] // Empty string not allowed
      };

      const response = await request(app)
        .post(`/api/v1/chatbots/${testChatbot.id}/train`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('non-empty strings');
    });

    it('should return 401 without authentication', async () => {
      const trainingData = {
        trainingData: ['New knowledge']
      };

      await request(app)
        .post(`/api/v1/chatbots/${testChatbot.id}/train`)
        .send(trainingData)
        .expect(401);
    });
  });

  describe('GET /api/v1/chatbots/:chatbotId/conversations', () => {
    beforeEach(async () => {
      // Create test conversations
      const conversation1 = await Conversation.create({
        chatbotId: testChatbot.id!,
        sessionId: 'session-1',
        userInfo: { name: 'User 1' }
      });

      const conversation2 = await Conversation.create({
        chatbotId: testChatbot.id!,
        sessionId: 'session-2',
        userInfo: { name: 'User 2' }
      });

      // Add messages to conversations
      await conversation1.addMessage('user', 'Hello');
      await conversation1.addMessage('assistant', 'Hi there!');
      await conversation2.addMessage('user', 'How are you?');
      await conversation2.addMessage('assistant', 'I am doing well, thank you!');
    });

    it('should return conversation history for a chatbot', async () => {
      const response = await request(app)
        .get(`/api/v1/chatbots/${testChatbot.id}/conversations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversations).toHaveLength(2);
      expect(response.body.data.conversations[0].chatbotId).toBe(testChatbot.id);
      expect(response.body.data.conversations[1].chatbotId).toBe(testChatbot.id);
    });

    it('should support pagination with limit and offset', async () => {
      const response = await request(app)
        .get(`/api/v1/chatbots/${testChatbot.id}/conversations?limit=1&offset=0`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversations).toHaveLength(1);
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app)
        .get(`/api/v1/chatbots/${testChatbot.id}/conversations?limit=invalid`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Limit must be a number');
    });
  });

  describe('GET /api/v1/chatbots/test/ai-connection', () => {
    it('should test AI service connection', async () => {
      const response = await request(app)
        .get('/api/v1/chatbots/test/ai-connection')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('success');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/chatbots/test/ai-connection')
        .expect(401);
    });
  });
});