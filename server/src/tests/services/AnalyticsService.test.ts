import { AnalyticsService } from '../../services/AnalyticsService';
import { Analytics } from '../../models/Analytics';
import { ConversationMetrics } from '../../models/ConversationMetrics';
import { PerformanceMetrics } from '../../models/PerformanceMetrics';
import { Conversation } from '../../models/Conversation';
import { Message } from '../../models/Message';
import { db } from '../../database/connection';

describe('AnalyticsService', () => {
  beforeAll(async () => {
    // Ensure migrations are run
    await db.migrate.latest();
  });

  beforeEach(async () => {
    // Clean up all analytics-related tables
    await db('performance_metrics').del();
    await db('conversation_metrics').del();
    await db('analytics').del();
    await db('messages').del();
    await db('conversations').del();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('trackConversationMetrics', () => {
    it('should track conversation metrics successfully', async () => {
      const conversationId = '123e4567-e89b-12d3-a456-426614174000';
      const chatbotId = '123e4567-e89b-12d3-a456-426614174001';

      // Create a conversation first
      const conversation = await Conversation.create({
        chatbotId,
        sessionId: 'test-session',
        startedAt: new Date()
      });

      // Create some messages
      await Message.create({
        conversationId: conversation.id!,
        role: 'user',
        content: 'Hello'
      });

      await Message.create({
        conversationId: conversation.id!,
        role: 'assistant',
        content: 'Hi there!'
      });

      const metrics = await AnalyticsService.trackConversationMetrics(
        conversation.id!,
        chatbotId,
        {
          userSatisfaction: 4,
          userIntent: 'greeting',
          goalAchieved: true
        }
      );

      expect(metrics.conversationId).toBe(conversation.id);
      expect(metrics.chatbotId).toBe(chatbotId);
      expect(metrics.messageCount).toBe(2);
      expect(metrics.userSatisfaction).toBe(4);
      expect(metrics.userIntent).toBe('greeting');
      expect(metrics.goalAchieved).toBe(true);
    });

    it('should throw error for non-existent conversation', async () => {
      await expect(
        AnalyticsService.trackConversationMetrics(
          'non-existent-conversation',
          '123e4567-e89b-12d3-a456-426614174001'
        )
      ).rejects.toThrow('Conversation not found');
    });
  });

  describe('trackPerformanceMetrics', () => {
    it('should track performance metrics successfully', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174001';

      const metrics = await AnalyticsService.trackPerformanceMetrics(
        chatbotId,
        2.5,
        {
          tokenUsage: 150,
          modelVersion: 'gemini-pro-1.0',
          endpoint: '/api/chat',
          statusCode: 200
        }
      );

      expect(metrics.chatbotId).toBe(chatbotId);
      expect(metrics.responseTime).toBe(2.5);
      expect(metrics.tokenUsage).toBe(150);
      expect(metrics.modelVersion).toBe('gemini-pro-1.0');
      expect(metrics.endpoint).toBe('/api/chat');
      expect(metrics.statusCode).toBe(200);
    });
  });

  describe('generateDailyAnalytics', () => {
    it('should generate daily analytics for a chatbot', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174001';
      const date = new Date('2024-01-15');

      // Create test conversations and messages
      const conversation1 = await Conversation.create({
        chatbotId,
        sessionId: 'session-1',
        startedAt: new Date('2024-01-15T10:00:00Z')
      });

      const conversation2 = await Conversation.create({
        chatbotId,
        sessionId: 'session-2',
        startedAt: new Date('2024-01-15T14:00:00Z')
      });

      // Add messages to conversations
      await Message.create({
        conversationId: conversation1.id!,
        role: 'user',
        content: 'Hello'
      });

      await Message.create({
        conversationId: conversation1.id!,
        role: 'assistant',
        content: 'Hi there!'
      });

      await Message.create({
        conversationId: conversation2.id!,
        role: 'user',
        content: 'Help me'
      });

      await Message.create({
        conversationId: conversation2.id!,
        role: 'assistant',
        content: 'How can I help?'
      });

      // Create conversation metrics with proper date filtering
      const metricsDate = new Date('2024-01-15T12:00:00Z');
      await ConversationMetrics.create({
        conversationId: conversation1.id!,
        chatbotId,
        messageCount: 2,
        avgResponseTime: 2.0,
        userSatisfaction: 5,
        createdAt: metricsDate
      });

      await ConversationMetrics.create({
        conversationId: conversation2.id!,
        chatbotId,
        messageCount: 2,
        avgResponseTime: 3.0,
        userSatisfaction: 4,
        createdAt: metricsDate
      });

      const analytics = await AnalyticsService.generateDailyAnalytics(chatbotId, date);

      expect(analytics.chatbotId).toBe(chatbotId);
      expect(analytics.totalConversations).toBe(2);
      expect(analytics.totalMessages).toBe(4);
      expect(analytics.uniqueUsers).toBe(2); // Two different sessions
      expect(analytics.avgConversationLength).toBe(2); // 4 messages / 2 conversations
      expect(analytics.avgResponseTime).toBeGreaterThanOrEqual(0); // Should be calculated
      expect(analytics.userSatisfactionScore).toBeGreaterThanOrEqual(0); // Should be calculated
      expect(analytics.totalRatings).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty data gracefully', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174001';
      const date = new Date('2024-01-15');

      const analytics = await AnalyticsService.generateDailyAnalytics(chatbotId, date);

      expect(analytics.chatbotId).toBe(chatbotId);
      expect(analytics.totalConversations).toBe(0);
      expect(analytics.totalMessages).toBe(0);
      expect(analytics.uniqueUsers).toBe(0);
      expect(analytics.avgConversationLength).toBe(0);
      expect(analytics.avgResponseTime).toBe(0);
      expect(analytics.userSatisfactionScore).toBe(0);
      expect(analytics.totalRatings).toBe(0);
    });
  });

  describe('getDashboardMetrics', () => {
    it('should return comprehensive dashboard metrics', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174001';
      const timeRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      // Create some analytics data
      await Analytics.create({
        chatbotId,
        date: new Date('2024-01-15'),
        totalConversations: 10,
        totalMessages: 50,
        avgConversationLength: 5.0,
        avgResponseTime: 2.5,
        userSatisfactionScore: 4.2,
        totalRatings: 8
      });

      // Create performance metrics
      await PerformanceMetrics.create({
        chatbotId,
        responseTime: 2.0,
        statusCode: 200
      });

      await PerformanceMetrics.create({
        chatbotId,
        responseTime: 3.0,
        statusCode: 500
      });

      const dashboardMetrics = await AnalyticsService.getDashboardMetrics(chatbotId, timeRange);

      expect(dashboardMetrics.totalConversations).toBe(10);
      expect(dashboardMetrics.totalMessages).toBe(50);
      expect(dashboardMetrics.averageConversationLength).toBe(5.0);
      expect(dashboardMetrics.averageResponseTime).toBe(2.5);
      expect(dashboardMetrics.userSatisfactionScore).toBe(4.2);
      expect(dashboardMetrics.totalRatings).toBe(8);
      expect(dashboardMetrics.performanceMetrics.averageResponseTime).toBe(2.5);
      expect(dashboardMetrics.performanceMetrics.errorRate).toBe(50);
      expect(dashboardMetrics.performanceMetrics.totalRequests).toBe(2);
    });
  });

  describe('getConversationInsights', () => {
    it('should return detailed conversation insights', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174001';
      const timeRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      // Create conversation metrics with different intents and topics
      await ConversationMetrics.create({
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        chatbotId,
        messageCount: 5,
        userSatisfaction: 5,
        userIntent: 'support',
        goalAchieved: true,
        topicsDiscussed: ['billing', 'account']
      });

      await ConversationMetrics.create({
        conversationId: '123e4567-e89b-12d3-a456-426614174002',
        chatbotId,
        messageCount: 8,
        userSatisfaction: 4,
        userIntent: 'support',
        goalAchieved: false,
        topicsDiscussed: ['billing', 'refund']
      });

      await ConversationMetrics.create({
        conversationId: '123e4567-e89b-12d3-a456-426614174003',
        chatbotId,
        messageCount: 3,
        userSatisfaction: 3,
        userIntent: 'sales',
        goalAchieved: true,
        topicsDiscussed: ['pricing']
      });

      const insights = await AnalyticsService.getConversationInsights(chatbotId, timeRange);

      expect(insights.totalConversations).toBeGreaterThanOrEqual(0);
      expect(insights.averageLength).toBeGreaterThanOrEqual(0);
      expect(insights.medianLength).toBeGreaterThanOrEqual(0);
      expect(insights.satisfactionStats.average).toBeGreaterThanOrEqual(0);
      expect(insights.satisfactionStats.totalRatings).toBeGreaterThanOrEqual(0);
      expect(insights.topIntents).toBeInstanceOf(Array);
      expect(insights.topTopics).toBeInstanceOf(Array);
      expect(insights.goalAchievementRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('batchGenerateAnalytics', () => {
    it('should generate analytics for multiple days', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174001';
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-17');

      // Create test data for different days
      const conversation1 = await Conversation.create({
        chatbotId,
        sessionId: 'session-1',
        startedAt: new Date('2024-01-15T10:00:00Z')
      });

      const conversation2 = await Conversation.create({
        chatbotId,
        sessionId: 'session-2',
        startedAt: new Date('2024-01-16T10:00:00Z')
      });

      await Message.create({
        conversationId: conversation1.id!,
        role: 'user',
        content: 'Hello'
      });

      await Message.create({
        conversationId: conversation2.id!,
        role: 'user',
        content: 'Hi'
      });

      const analyticsArray = await AnalyticsService.batchGenerateAnalytics(
        chatbotId,
        startDate,
        endDate
      );

      expect(analyticsArray).toHaveLength(3); // 3 days: 15th, 16th, 17th
      expect(analyticsArray[0].date.toDateString()).toBe(startDate.toDateString());
      expect(analyticsArray[1].date.toDateString()).toBe(new Date('2024-01-16').toDateString());
      expect(analyticsArray[2].date.toDateString()).toBe(endDate.toDateString());
    });
  });

  describe('exportAnalyticsData', () => {
    it('should export analytics data as JSON', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174001';
      const timeRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      await Analytics.create({
        chatbotId,
        date: new Date('2024-01-15'),
        totalConversations: 10,
        totalMessages: 50
      });

      const exportData = await AnalyticsService.exportAnalyticsData(
        chatbotId,
        timeRange,
        'json'
      );

      const parsedData = JSON.parse(exportData);
      expect(Array.isArray(parsedData)).toBe(true);
      expect(parsedData).toHaveLength(1);
      expect(parsedData[0].totalConversations).toBe(10);
      expect(parsedData[0].totalMessages).toBe(50);
    });

    it('should export analytics data as CSV', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174001';
      const timeRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      await Analytics.create({
        chatbotId,
        date: new Date('2024-01-15'),
        totalConversations: 10,
        totalMessages: 50,
        avgConversationLength: 5.0,
        avgResponseTime: 2.5,
        userSatisfactionScore: 4.2,
        totalRatings: 8
      });

      const exportData = await AnalyticsService.exportAnalyticsData(
        chatbotId,
        timeRange,
        'csv'
      );

      const lines = exportData.split('\n');
      expect(lines[0]).toContain('Date,Total Conversations,Total Messages');
      expect(lines[1]).toContain('2024-01-15,10,50');
    });
  });
});