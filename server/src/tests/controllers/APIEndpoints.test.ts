import request from 'supertest';
import { app } from '../testApp';
import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { TestCleanup, TestAssertions } from '../utils/testHelpers';
import { mockEmailService } from '../mocks/email';
import { mockGoogleAIService } from '../mocks/googleAI';

describe('API Endpoints - Comprehensive Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmailService.clearSentEmails();
  });

  afterEach(async () => {
    await TestCleanup.cleanupAll();
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/v1/auth/register', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user).toBeDefined();
        expect(response.body.data.user.email).toBe(userData.email);
        expect(response.body.data.tokens).toBeDefined();
        TestAssertions.expectValidTokens(response.body.data.tokens);
      });

      it('should return 400 for invalid email', async () => {
        const userData = {
          email: 'invalid-email',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });

      it('should return 400 for weak password', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });

      it('should return 409 for duplicate email', async () => {
        const userData = {
          email: 'duplicate@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User'
        };

        // Register first user
        await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(201);

        // Try to register with same email
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('POST /api/v1/auth/login', () => {
      it('should login user successfully', async () => {
        const testUser = await User.create({
          email: 'login@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
          emailVerified: true
        });

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'login@example.com',
            password: 'TestPassword123!'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user).toBeDefined();
        expect(response.body.data.user.email).toBe('login@example.com');
        TestAssertions.expectValidTokens(response.body.data.tokens);
      });

      it('should return 401 for invalid email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'TestPassword123!'
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });

      it('should return 401 for invalid password', async () => {
        await User.create({
          email: 'wrongpass@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
          emailVerified: true
        });

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'wrongpass@example.com',
            password: 'wrongpassword'
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });

      it('should return 400 for missing fields', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com'
            // missing password
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('POST /api/v1/auth/refresh-token', () => {
      it('should refresh token successfully', async () => {
        const testUser = await User.create({
          email: 'refresh@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
          emailVerified: true
        });
        
        // Login to get refresh token
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testUser.email,
            password: 'TestPassword123!'
          });

        const refreshToken = loginResponse.body.data.tokens.refreshToken;

        const response = await request(app)
          .post('/api/v1/auth/refresh-token')
          .send({ refreshToken })
          .expect(200);

        expect(response.body.success).toBe(true);
        TestAssertions.expectValidTokens(response.body.data);
      });

      it('should return 401 for invalid refresh token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/refresh-token')
          .send({ refreshToken: 'invalid-token' })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });

      it('should return 400 for missing refresh token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/refresh-token')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('POST /api/v1/auth/request-password-reset', () => {
      it('should request password reset successfully', async () => {
        await User.create({
          email: 'reset@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
          emailVerified: true
        });

        const response = await request(app)
          .post('/api/v1/auth/request-password-reset')
          .send({ email: 'reset@example.com' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBeDefined();
      });

      it('should return success even for non-existent email (security)', async () => {
        const response = await request(app)
          .post('/api/v1/auth/request-password-reset')
          .send({ email: 'nonexistent@example.com' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBeDefined();
      });

      it('should return 400 for invalid email format', async () => {
        const response = await request(app)
          .post('/api/v1/auth/request-password-reset')
          .send({ email: 'invalid-email' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe('Chatbot Endpoints', () => {
    let testUser: User;
    let authToken: string;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'chatbot@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true
      });
      
      const tokens = testUser.generateTokens();
      authToken = tokens.accessToken;
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
        expect(response.body.data).toBeDefined();
        TestAssertions.expectValidChatbot(response.body.data);
        expect(response.body.data.name).toBe(chatbotData.name);
        expect(response.body.data.userId).toBe(testUser.id);
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

      it('should return 401 when not authenticated', async () => {
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
      it('should return user chatbots', async () => {
        // Create test chatbots
        await Chatbot.create({
          userId: testUser.id!,
          name: 'Bot 1',
          description: 'First bot',
          personality: 'Helpful',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        });

        await Chatbot.create({
          userId: testUser.id!,
          name: 'Bot 2',
          description: 'Second bot',
          personality: 'Friendly',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        });

        const response = await request(app)
          .get('/api/v1/chatbots')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data.map((c: any) => c.name)).toContain('Bot 1');
        expect(response.body.data.map((c: any) => c.name)).toContain('Bot 2');
      });

      it('should return empty array for user with no chatbots', async () => {
        const response = await request(app)
          .get('/api/v1/chatbots')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(0);
      });

      it('should return 401 when not authenticated', async () => {
        const response = await request(app)
          .get('/api/v1/chatbots')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('GET /api/v1/chatbots/:id', () => {
      it('should return chatbot for owner', async () => {
        const chatbot = await Chatbot.create({
          userId: testUser.id!,
          name: 'Test Bot',
          description: 'A test chatbot',
          personality: 'Helpful',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        });

        const response = await request(app)
          .get(`/api/v1/chatbots/${chatbot.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        TestAssertions.expectValidChatbot(response.body.data);
        expect(response.body.data.id).toBe(chatbot.id);
        expect(response.body.data.name).toBe(chatbot.name);
      });

      it('should return 404 for non-existent chatbot', async () => {
        const response = await request(app)
          .get('/api/v1/chatbots/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });

      it('should return 401 when not authenticated', async () => {
        const response = await request(app)
          .get('/api/v1/chatbots/some-id')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('POST /api/v1/chatbots/:id/message', () => {
      it('should process message and return AI response', async () => {
        const chatbot = await Chatbot.create({
          userId: testUser.id!,
          name: 'Test Bot',
          description: 'A test chatbot',
          personality: 'Helpful',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        });

        const messageData = {
          message: 'Hello, how are you?',
          sessionId: 'test-session-123',
          userInfo: {}
        };

        const response = await request(app)
          .post(`/api/v1/chatbots/${chatbot.id}/message`)
          .send(messageData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.response).toBe('This is a mock AI response for testing purposes.');
        expect(response.body.data.conversationId).toBeDefined();
        expect(response.body.data.messageId).toBeDefined();
        
        // Verify Google AI service was called
        expect(mockGoogleAIService.generateResponse).toHaveBeenCalledTimes(1);
      });

      it('should return 404 for non-existent chatbot', async () => {
        const messageData = {
          message: 'Hello',
          sessionId: 'session-123',
          userInfo: {}
        };

        const response = await request(app)
          .post('/api/v1/chatbots/non-existent-id/message')
          .send(messageData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });

      it('should return 400 for missing message', async () => {
        const chatbot = await Chatbot.create({
          userId: testUser.id!,
          name: 'Test Bot',
          description: 'A test chatbot',
          personality: 'Helpful',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        });

        const messageData = {
          sessionId: 'session-123',
          userInfo: {}
          // missing message
        };

        const response = await request(app)
          .post(`/api/v1/chatbots/${chatbot.id}/message`)
          .send(messageData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe('User Management Endpoints', () => {
    let testUser: User;
    let authToken: string;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'usermgmt@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true
      });
      
      const tokens = testUser.generateTokens();
      authToken = tokens.accessToken;
    });

    describe('GET /api/v1/users/profile', () => {
      it('should return user profile', async () => {
        const response = await request(app)
          .get('/api/v1/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.userId).toBe(testUser.id);
        expect(response.body.data.preferences).toBeDefined();
      });

      it('should return 401 when not authenticated', async () => {
        const response = await request(app)
          .get('/api/v1/users/profile')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('PUT /api/v1/users/profile', () => {
      it('should update user profile', async () => {
        const updateData = {
          preferences: {
            theme: 'dark',
            notifications: false,
            language: 'es',
            timezone: 'America/New_York'
          }
        };

        const response = await request(app)
          .put('/api/v1/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.preferences.theme).toBe('dark');
        expect(response.body.data.preferences.notifications).toBe(false);
        expect(response.body.data.preferences.language).toBe('es');
      });

      it('should return 401 when not authenticated', async () => {
        const updateData = {
          preferences: {
            theme: 'dark'
          }
        };

        const response = await request(app)
          .put('/api/v1/users/profile')
          .send(updateData)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('GET /api/v1/users/usage-stats', () => {
      it('should return usage statistics', async () => {
        const response = await request(app)
          .get('/api/v1/users/usage-stats')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        TestAssertions.expectValidUsageStats(response.body.data);
        expect(response.body.data.userId).toBe(testUser.id);
      });

      it('should return 401 when not authenticated', async () => {
        const response = await request(app)
          .get('/api/v1/users/usage-stats')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('GET /api/v1/users/export', () => {
      it('should export user data', async () => {
        const response = await request(app)
          .get('/api/v1/users/export')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.user).toBeDefined();
        expect(response.body.data.user.email).toBe(testUser.email);
        expect(response.body.data.profile).toBeDefined();
        expect(response.body.data.usageStats).toBeDefined();
        expect(response.body.data.chatbots).toBeDefined();
        expect(response.body.data.exportedAt).toBeDefined();
      });

      it('should return 401 when not authenticated', async () => {
        const response = await request(app)
          .get('/api/v1/users/export')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('DELETE /api/v1/users/account', () => {
      it('should delete user account', async () => {
        const response = await request(app)
          .delete('/api/v1/users/account')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBeDefined();
      });

      it('should return 401 when not authenticated', async () => {
        const response = await request(app)
          .delete('/api/v1/users/account')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe('Analytics Endpoints', () => {
    let testUser: User;
    let testChatbot: Chatbot;
    let authToken: string;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'analytics@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true
      });

      testChatbot = await Chatbot.create({
        userId: testUser.id!,
        name: 'Analytics Bot',
        description: 'A test chatbot for analytics',
        personality: 'Helpful',
        knowledgeBase: ['Test'],
        appearance: {},
        settings: {},
        isActive: true
      });
      
      const tokens = testUser.generateTokens();
      authToken = tokens.accessToken;
    });

    describe('GET /api/v1/analytics/summary', () => {
      it('should return analytics summary', async () => {
        const response = await request(app)
          .get('/api/v1/analytics/summary')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(typeof response.body.data.totalConversations).toBe('number');
        expect(typeof response.body.data.totalMessages).toBe('number');
        expect(typeof response.body.data.averageResponseTime).toBe('number');
        expect(typeof response.body.data.userSatisfactionScore).toBe('number');
      });

      it('should return 401 when not authenticated', async () => {
        const response = await request(app)
          .get('/api/v1/analytics/summary')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('GET /api/v1/analytics/chatbots/:id', () => {
      it('should return chatbot analytics for owner', async () => {
        const response = await request(app)
          .get(`/api/v1/analytics/chatbots/${testChatbot.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(typeof response.body.data.totalConversations).toBe('number');
        expect(typeof response.body.data.totalMessages).toBe('number');
        expect(typeof response.body.data.averageResponseTime).toBe('number');
        expect(typeof response.body.data.userSatisfactionScore).toBe('number');
      });

      it('should return 404 for non-existent chatbot', async () => {
        const response = await request(app)
          .get('/api/v1/analytics/chatbots/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });

      it('should return 401 when not authenticated', async () => {
        const response = await request(app)
          .get(`/api/v1/analytics/chatbots/${testChatbot.id}`)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('GET /api/v1/analytics/conversations', () => {
      it('should return conversation metrics', async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const endDate = new Date();

        const response = await request(app)
          .get('/api/v1/analytics/conversations')
          .query({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should return 401 when not authenticated', async () => {
        const response = await request(app)
          .get('/api/v1/analytics/conversations')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('GET /api/v1/analytics/performance', () => {
      it('should return performance metrics', async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const endDate = new Date();

        const response = await request(app)
          .get('/api/v1/analytics/performance')
          .query({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should return 401 when not authenticated', async () => {
        const response = await request(app)
          .get('/api/v1/analytics/performance')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent-endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send('some data')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting gracefully', async () => {
      // This test would require actual rate limiting implementation
      // For now, we'll just verify the endpoint exists
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password'
        });

      // Should get 401 for invalid credentials, not rate limit error
      expect(response.status).toBe(401);
    });
  });

  describe('CORS Headers', () => {
    it('should include proper CORS headers', async () => {
      const response = await request(app)
        .options('/api/v1/auth/register');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });
});