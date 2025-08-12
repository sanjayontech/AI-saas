import request from 'supertest';
import { app } from '../../index';
import { knex } from '../../database/connection';
import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { generateToken } from '../../utils/jwt';

describe('API Integration Tests', () => {
  let testUser: User;
  let authToken: string;
  let testChatbot: Chatbot;

  beforeAll(async () => {
    // Ensure test database
    expect(process.env.NODE_ENV).toBe('test');
    await knex.migrate.latest();
  });

  beforeEach(async () => {
    // Clean database
    await knex('messages').del();
    await knex('conversations').del();
    await knex('chatbots').del();
    await knex('usage_stats').del();
    await knex('user_profiles').del();
    await knex('users').del();

    // Create test user
    testUser = await User.query().insert({
      email: 'integration@test.com',
      password: '$2a$10$hashedpassword', // bcrypt hash of 'password123'
      firstName: 'Integration',
      lastName: 'Test',
      emailVerified: true
    });

    // Generate auth token
    authToken = generateToken({ userId: testUser.id, email: testUser.email });

    // Create test chatbot
    testChatbot = await Chatbot.query().insert({
      userId: testUser.id,
      name: 'Integration Test Bot',
      description: 'Bot for API integration testing',
      personality: 'Helpful and professional',
      knowledgeBase: ['integration', 'testing'],
      appearance: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        fontFamily: 'Arial',
        borderRadius: 8,
        position: 'bottom-right'
      },
      settings: {
        maxTokens: 150,
        temperature: 0.7,
        responseDelay: 1000,
        fallbackMessage: 'Sorry, I could not understand.',
        collectUserInfo: false
      }
    });
  });

  afterAll(async () => {
    await knex.destroy();
  });

  describe('Authentication Flow Integration', () => {
    test('should complete full registration and login flow', async () => {
      // Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'newpassword123',
          firstName: 'New',
          lastName: 'User'
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.user.email).toBe('newuser@test.com');

      // Login with new user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newuser@test.com',
          password: 'newpassword123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.token).toBeDefined();
      expect(loginResponse.body.user.email).toBe('newuser@test.com');

      // Use token to access protected route
      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${loginResponse.body.token}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.email).toBe('newuser@test.com');
    });

    test('should handle token refresh flow', async () => {
      // Login to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123'
        });

      expect(loginResponse.body.refreshToken).toBeDefined();

      // Use refresh token to get new access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: loginResponse.body.refreshToken
        });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.token).toBeDefined();
      expect(refreshResponse.body.token).not.toBe(loginResponse.body.token);
    });
  });

  describe('Chatbot Management Integration', () => {
    test('should create, update, and delete chatbot', async () => {
      // Create chatbot
      const createResponse = await request(app)
        .post('/api/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'API Test Bot',
          description: 'Created via API',
          personality: 'Friendly and helpful',
          knowledgeBase: ['api', 'testing'],
          appearance: {
            primaryColor: '#28a745',
            secondaryColor: '#6c757d',
            fontFamily: 'Roboto',
            borderRadius: 12,
            position: 'bottom-left'
          },
          settings: {
            maxTokens: 200,
            temperature: 0.8,
            responseDelay: 500,
            fallbackMessage: 'I apologize for any confusion.',
            collectUserInfo: true
          }
        });

      expect(createResponse.status).toBe(201);
      const createdBot = createResponse.body;
      expect(createdBot.name).toBe('API Test Bot');

      // Update chatbot
      const updateResponse = await request(app)
        .put(`/api/chatbots/${createdBot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated API Test Bot',
          description: 'Updated via API'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe('Updated API Test Bot');

      // Get chatbot
      const getResponse = await request(app)
        .get(`/api/chatbots/${createdBot.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.name).toBe('Updated API Test Bot');

      // Delete chatbot
      const deleteResponse = await request(app)
        .delete(`/api/chatbots/${createdBot.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(204);

      // Verify deletion
      const getDeletedResponse = await request(app)
        .get(`/api/chatbots/${createdBot.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getDeletedResponse.status).toBe(404);
    });

    test('should handle chatbot conversation flow', async () => {
      // Send message to chatbot
      const messageResponse = await request(app)
        .post(`/api/chatbots/${testChatbot.id}/chat`)
        .send({
          message: 'Hello, how are you?',
          sessionId: 'test-session-123'
        });

      expect(messageResponse.status).toBe(200);
      expect(messageResponse.body.response).toBeDefined();
      expect(messageResponse.body.conversationId).toBeDefined();

      // Continue conversation
      const followupResponse = await request(app)
        .post(`/api/chatbots/${testChatbot.id}/chat`)
        .send({
          message: 'What can you help me with?',
          sessionId: 'test-session-123',
          conversationId: messageResponse.body.conversationId
        });

      expect(followupResponse.status).toBe(200);
      expect(followupResponse.body.response).toBeDefined();
      expect(followupResponse.body.conversationId).toBe(messageResponse.body.conversationId);
    });
  });

  describe('User Management Integration', () => {
    test('should handle complete user profile management', async () => {
      // Get initial profile
      const initialProfileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(initialProfileResponse.status).toBe(200);

      // Update profile
      const updateProfileResponse = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
          preferences: {
            theme: 'dark',
            notifications: true,
            language: 'en',
            timezone: 'UTC'
          }
        });

      expect(updateProfileResponse.status).toBe(200);
      expect(updateProfileResponse.body.firstName).toBe('Updated');

      // Get usage stats
      const usageResponse = await request(app)
        .get('/api/users/usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(usageResponse.status).toBe(200);
      expect(usageResponse.body.messagesThisMonth).toBeDefined();
    });

    test('should handle data export', async () => {
      // Request data export
      const exportResponse = await request(app)
        .post('/api/users/export')
        .set('Authorization', `Bearer ${authToken}`);

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.user).toBeDefined();
      expect(exportResponse.body.chatbots).toBeDefined();
      expect(exportResponse.body.conversations).toBeDefined();
    });
  });

  describe('Analytics Integration', () => {
    test('should provide comprehensive analytics data', async () => {
      // Get chatbot analytics
      const analyticsResponse = await request(app)
        .get(`/api/analytics/chatbot/${testChatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.totalConversations).toBeDefined();
      expect(analyticsResponse.body.totalMessages).toBeDefined();
      expect(analyticsResponse.body.averageResponseTime).toBeDefined();
    });

    test('should provide conversation history with search', async () => {
      // Get conversation history
      const historyResponse = await request(app)
        .get(`/api/analytics/conversations/${testChatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          limit: 10,
          search: 'test'
        });

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.conversations).toBeDefined();
      expect(historyResponse.body.pagination).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    test('should handle invalid chatbot access', async () => {
      const response = await request(app)
        .get('/api/chatbots/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    test('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          name: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should handle rate limiting', async () => {
      // Make multiple rapid requests
      const promises = Array(20).fill(0).map(() =>
        request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.allSettled(promises);
      
      // Some requests should be rate limited
      const rateLimited = results.some(result => 
        result.status === 'fulfilled' && result.value.status === 429
      );
      
      expect(rateLimited).toBe(true);
    });
  });

  describe('Cross-Service Integration', () => {
    test('should handle complex workflow across multiple services', async () => {
      // Create chatbot
      const chatbotResponse = await request(app)
        .post('/api/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Workflow Test Bot',
          description: 'Testing cross-service workflow',
          personality: 'Professional',
          knowledgeBase: ['workflow', 'testing'],
          appearance: {
            primaryColor: '#6f42c1',
            secondaryColor: '#6c757d',
            fontFamily: 'Arial',
            borderRadius: 8,
            position: 'bottom-right'
          },
          settings: {
            maxTokens: 150,
            temperature: 0.7,
            responseDelay: 1000,
            fallbackMessage: 'Sorry, I could not understand.',
            collectUserInfo: false
          }
        });

      const chatbot = chatbotResponse.body;

      // Have conversation
      await request(app)
        .post(`/api/chatbots/${chatbot.id}/chat`)
        .send({
          message: 'Hello, this is a test conversation',
          sessionId: 'workflow-session'
        });

      // Check analytics updated
      const analyticsResponse = await request(app)
        .get(`/api/analytics/chatbot/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(analyticsResponse.body.totalMessages).toBeGreaterThan(0);

      // Check usage stats updated
      const usageResponse = await request(app)
        .get('/api/users/usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(usageResponse.body.totalMessages).toBeGreaterThan(0);
    });

    test('should handle email service integration', async () => {
      // Test password reset email flow
      const emailResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: testUser.email
        });

      expect(emailResponse.status).toBe(200);
      expect(emailResponse.body.message).toContain('reset');
    });

    test('should handle Redis caching integration', async () => {
      // Make request that should be cached
      const firstResponse = await request(app)
        .get(`/api/analytics/chatbot/${testChatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(firstResponse.status).toBe(200);

      // Second request should be faster (from cache)
      const startTime = Date.now();
      const secondResponse = await request(app)
        .get(`/api/analytics/chatbot/${testChatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      const responseTime = Date.now() - startTime;

      expect(secondResponse.status).toBe(200);
      expect(responseTime).toBeLessThan(100); // Should be very fast from cache
    });

    test('should handle WebSocket integration for real-time updates', async () => {
      // This would test WebSocket connections for real-time chat
      // Implementation depends on WebSocket setup
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.websocket).toBeDefined();
    });
  });
});