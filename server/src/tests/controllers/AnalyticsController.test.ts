import request from 'supertest';
import { app } from '../testServer';
import { db } from '../../database/connection';
import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { Conversation } from '../../models/Conversation';
import { Message } from '../../models/Message';
import { Analytics } from '../../models/Analytics';
import { ConversationMetrics } from '../../models/ConversationMetrics';
import { PerformanceMetrics } from '../../models/PerformanceMetrics';
import { JWTUtils } from '../../utils/jwt';

describe('AnalyticsController', () => {
  let user: User;
  let chatbot: Chatbot;
  let conversation: Conversation;
  let authToken: string;

  beforeEach(async () => {
    // Create test user
    user = await User.create({
      email: 'analytics@test.com',
      password: 'password123',
      firstName: 'Analytics',
      lastName: 'User'
    });

    // Generate auth token
    authToken = JWTUtils.generateAccessToken(user);

    // Create test chatbot
    chatbot = await Chatbot.create({
      userId: user.id!,
      name: 'Analytics Test Bot',
      description: 'Test chatbot for analytics',
      personality: 'helpful',
      knowledgeBase: ['Test knowledge'],
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
        fallbackMessage: 'I need more information',
        collectUserInfo: false
      }
    });

    // Create test conversation
    conversation = await Conversation.create({
      chatbotId: chatbot.id!,
      sessionId: 'test-session-123',
      userInfo: { name: 'Test User' }
    });

    // Create test messages
    await Message.create({
      conversationId: conversation.id!,
      role: 'user',
      content: 'Hello, I need help with my order'
    });

    await Message.create({
      conversationId: conversation.id!,
      role: 'assistant',
      content: 'I can help you with your order. What specific information do you need?'
    });

    // Create test analytics data
    await Analytics.create({
      chatbotId: chatbot.id!,
      date: new Date(),
      totalConversations: 5,
      totalMessages: 15,
      uniqueUsers: 3,
      avgConversationLength: 3.0,
      avgResponseTime: 2.5,
      userSatisfactionScore: 4.2,
      totalRatings: 8,
      popularQueries: [
        { query: 'order', count: 5 },
        { query: 'help', count: 3 }
      ],
      responseCategories: [
        { category: 'Support', count: 8, percentage: 53.3 },
        { category: 'Informational', count: 7, percentage: 46.7 }
      ]
    });

    // Create test conversation metrics
    await ConversationMetrics.create({
      conversationId: conversation.id!,
      chatbotId: chatbot.id!,
      messageCount: 4,
      durationSeconds: 120,
      avgResponseTime: 2.3,
      userSatisfaction: 4,
      userIntent: 'support',
      topicsDiscussed: ['order', 'help'],
      goalAchieved: true
    });

    // Create test performance metrics
    await PerformanceMetrics.create({
      chatbotId: chatbot.id!,
      responseTime: 2.1,
      tokenUsage: 45,
      modelVersion: 'gemini-pro',
      endpoint: '/chat',
      statusCode: 200
    });
  });

  describe('GET /api/v1/analytics/summary', () => {
    it('should get user analytics summary', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toHaveProperty('totalChatbots');
      expect(response.body.data.summary).toHaveProperty('totalConversations');
      expect(response.body.data.summary).toHaveProperty('totalMessages');
      expect(response.body.data.summary).toHaveProperty('avgSatisfactionScore');
      expect(response.body.data.chatbotSummaries).toBeInstanceOf(Array);
      expect(response.body.data.chatbotSummaries.length).toBeGreaterThan(0);
    });

    it('should filter by time period', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/summary?period=7d')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.timeRange).toHaveProperty('startDate');
      expect(response.body.data.timeRange).toHaveProperty('endDate');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/analytics/summary')
        .expect(401);
    });
  });

  describe('GET /api/v1/analytics/chatbots/:chatbotId/dashboard', () => {
    it('should get dashboard metrics for chatbot', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chatbotId).toBe(chatbot.id);
      expect(response.body.data.metrics).toHaveProperty('totalConversations');
      expect(response.body.data.metrics).toHaveProperty('totalMessages');
      expect(response.body.data.metrics).toHaveProperty('averageResponseTime');
      expect(response.body.data.metrics).toHaveProperty('userSatisfactionScore');
      expect(response.body.data.metrics).toHaveProperty('conversationTrends');
      expect(response.body.data.metrics).toHaveProperty('performanceMetrics');
    });

    it('should filter by custom date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/dashboard`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.timeRange.startDate).toBeDefined();
      expect(response.body.data.timeRange.endDate).toBeDefined();
    });

    it('should return 404 for non-existent chatbot', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/chatbots/non-existent-id/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CHATBOT_NOT_FOUND');
    });

    it('should deny access to other users chatbots', async () => {
      // Create another user
      const otherUser = await User.create({
        email: 'other@test.com',
        password: 'password123',
        firstName: 'Other',
        lastName: 'User'
      });

      const otherToken = JWTUtils.generateAccessToken(otherUser);

      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/dashboard`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CHATBOT_NOT_FOUND');
    });
  });

  describe('GET /api/v1/analytics/chatbots/:chatbotId/insights', () => {
    it('should get conversation insights', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/insights`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.insights).toHaveProperty('totalConversations');
      expect(response.body.data.insights).toHaveProperty('averageLength');
      expect(response.body.data.insights).toHaveProperty('satisfactionStats');
      expect(response.body.data.insights).toHaveProperty('topIntents');
      expect(response.body.data.insights).toHaveProperty('topTopics');
      expect(response.body.data.insights).toHaveProperty('goalAchievementRate');
    });

    it('should filter by time period', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/insights?period=7d`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.timeRange).toHaveProperty('startDate');
      expect(response.body.data.timeRange).toHaveProperty('endDate');
    });
  });

  describe('GET /api/v1/analytics/chatbots/:chatbotId/conversations', () => {
    it('should get conversation history', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/conversations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversations).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('pages');

      if (response.body.data.conversations.length > 0) {
        const conversation = response.body.data.conversations[0];
        expect(conversation).toHaveProperty('id');
        expect(conversation).toHaveProperty('sessionId');
        expect(conversation).toHaveProperty('messages');
        expect(conversation.messages).toBeInstanceOf(Array);
      }
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/conversations`)
        .query({ page: '1', limit: '5' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/conversations`)
        .query({ search: 'order' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters.search).toBe('order');
    });

    it('should support date filtering', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/conversations`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters.startDate).toBeDefined();
      expect(response.body.data.filters.endDate).toBeDefined();
    });

    it('should support satisfaction filtering', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/conversations`)
        .query({ minSatisfaction: '3', maxSatisfaction: '5' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters.minSatisfaction).toBe('3');
      expect(response.body.data.filters.maxSatisfaction).toBe('5');
    });
  });

  describe('GET /api/v1/analytics/chatbots/:chatbotId/performance', () => {
    it('should get performance insights', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/performance`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.performanceStats).toHaveProperty('averageResponseTime');
      expect(response.body.data.performanceStats).toHaveProperty('p95ResponseTime');
      expect(response.body.data.performanceStats).toHaveProperty('errorRate');
      expect(response.body.data.performanceStats).toHaveProperty('totalRequests');
      expect(response.body.data.performanceTrends).toBeInstanceOf(Array);
    });

    it('should filter by time period', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/performance?period=7d`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.timeRange).toHaveProperty('startDate');
      expect(response.body.data.timeRange).toHaveProperty('endDate');
    });
  });

  describe('GET /api/v1/analytics/chatbots/:chatbotId/export', () => {
    it('should export analytics data as JSON', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/export`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          format: 'json'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      
      // Response should be valid JSON
      const data = JSON.parse(response.text);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should export analytics data as CSV', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/export`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          format: 'csv'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      
      // Response should contain CSV headers
      expect(response.text).toContain('Date,Total Conversations');
    });

    it('should require start and end dates', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/analytics/chatbots/:chatbotId/generate', () => {
    it('should generate analytics for date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 3);
      const endDate = new Date();

      const response = await request(app)
        .post(`/api/v1/analytics/chatbots/${chatbot.id}/generate`)
        .send({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chatbotId).toBe(chatbot.id);
      expect(response.body.data.generatedAnalytics).toBeGreaterThanOrEqual(0);
      expect(response.body.data.analytics).toBeInstanceOf(Array);
    });

    it('should require start and end dates', async () => {
      const response = await request(app)
        .post(`/api/v1/analytics/chatbots/${chatbot.id}/generate`)
        .send({})
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      jest.spyOn(db, 'select').mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/api/v1/analytics/chatbots/${chatbot.id}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should validate chatbot ownership for all endpoints', async () => {
      // Create another user
      const otherUser = await User.create({
        email: 'unauthorized@test.com',
        password: 'password123',
        firstName: 'Unauthorized',
        lastName: 'User'
      });

      const otherToken = JWTUtils.generateAccessToken(otherUser);

      // Test multiple endpoints
      const endpoints = [
        `/api/v1/analytics/chatbots/${chatbot.id}/dashboard`,
        `/api/v1/analytics/chatbots/${chatbot.id}/insights`,
        `/api/v1/analytics/chatbots/${chatbot.id}/conversations`,
        `/api/v1/analytics/chatbots/${chatbot.id}/performance`
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${otherToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CHATBOT_NOT_FOUND');
      }
    });
  });
});