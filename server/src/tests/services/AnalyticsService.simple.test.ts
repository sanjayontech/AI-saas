import { AnalyticsService } from '../../services/AnalyticsService';
import { Analytics } from '../../models/Analytics';
import { ConversationMetrics } from '../../models/ConversationMetrics';
import { PerformanceMetrics } from '../../models/PerformanceMetrics';
import { TestDataFactory, TestCleanup } from '../utils/testHelpers';
import { NotFoundError, AuthorizationError } from '../../utils/errors';

describe('AnalyticsService - Integration Tests', () => {
  let analyticsService: AnalyticsService;
  let testUser: any;
  let testChatbot: any;

  beforeAll(() => {
    analyticsService = new AnalyticsService();
  });

  beforeEach(async () => {
    testUser = await TestDataFactory.createTestUser();
    testChatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);
  });

  afterEach(async () => {
    await TestCleanup.cleanupAll();
  });

  describe('getUserAnalyticsSummary', () => {
    it('should return analytics summary for user', async () => {
      // Create some test analytics data
      await Analytics.create({
        userId: testUser.user.id!,
        chatbotId: testChatbot.id!,
        totalConversations: 10,
        totalMessages: 50,
        averageResponseTime: 1.5,
        userSatisfactionScore: 4.2,
        date: new Date()
      });

      const result = await analyticsService.getUserAnalyticsSummary(testUser.user.id!);

      expect(result).toBeDefined();
      expect(result.totalConversations).toBeGreaterThan(0);
      expect(result.totalMessages).toBeGreaterThan(0);
      expect(result.averageResponseTime).toBeGreaterThan(0);
      expect(result.userSatisfactionScore).toBeGreaterThan(0);
    });

    it('should return zero values for user with no analytics', async () => {
      const result = await analyticsService.getUserAnalyticsSummary(testUser.user.id!);

      expect(result).toBeDefined();
      expect(result.totalConversations).toBe(0);
      expect(result.totalMessages).toBe(0);
      expect(result.averageResponseTime).toBe(0);
      expect(result.userSatisfactionScore).toBe(0);
    });
  });

  describe('getChatbotAnalytics', () => {
    it('should return analytics for chatbot owner', async () => {
      // Create test analytics
      await Analytics.create({
        userId: testUser.user.id!,
        chatbotId: testChatbot.id!,
        totalConversations: 5,
        totalMessages: 25,
        averageResponseTime: 2.0,
        userSatisfactionScore: 4.5,
        date: new Date()
      });

      const result = await analyticsService.getChatbotAnalytics(
        testChatbot.id!,
        testUser.user.id!
      );

      expect(result).toBeDefined();
      expect(result.totalConversations).toBe(5);
      expect(result.totalMessages).toBe(25);
      expect(result.averageResponseTime).toBe(2.0);
      expect(result.userSatisfactionScore).toBe(4.5);
    });

    it('should throw AuthorizationError for non-owner', async () => {
      const otherUser = await TestDataFactory.createTestUser();

      await expect(analyticsService.getChatbotAnalytics(
        testChatbot.id!,
        otherUser.user.id!
      )).rejects.toThrow(AuthorizationError);
    });

    it('should throw NotFoundError for non-existent chatbot', async () => {
      await expect(analyticsService.getChatbotAnalytics(
        'non-existent-id',
        testUser.user.id!
      )).rejects.toThrow(NotFoundError);
    });
  });

  describe('getConversationMetrics', () => {
    it('should return conversation metrics for time range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      // Create test conversation metrics
      await ConversationMetrics.create({
        userId: testUser.user.id!,
        chatbotId: testChatbot.id!,
        conversationCount: 3,
        messageCount: 15,
        averageConversationLength: 5.0,
        date: new Date()
      });

      const result = await analyticsService.getConversationMetrics(
        testUser.user.id!,
        startDate,
        endDate
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].conversationCount).toBe(3);
      expect(result[0].messageCount).toBe(15);
    });

    it('should return empty array for time range with no data', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 20);

      const result = await analyticsService.getConversationMetrics(
        testUser.user.id!,
        startDate,
        endDate
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics for time range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      // Create test performance metrics
      await PerformanceMetrics.create({
        userId: testUser.user.id!,
        chatbotId: testChatbot.id!,
        averageResponseTime: 1.8,
        successRate: 0.95,
        errorRate: 0.05,
        userSatisfactionScore: 4.3,
        date: new Date()
      });

      const result = await analyticsService.getPerformanceMetrics(
        testUser.user.id!,
        startDate,
        endDate
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].averageResponseTime).toBe(1.8);
      expect(result[0].successRate).toBe(0.95);
      expect(result[0].userSatisfactionScore).toBe(4.3);
    });

    it('should return empty array for time range with no data', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 20);

      const result = await analyticsService.getPerformanceMetrics(
        testUser.user.id!,
        startDate,
        endDate
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('recordConversationMetrics', () => {
    it('should record conversation metrics successfully', async () => {
      const metricsData = {
        conversationCount: 2,
        messageCount: 10,
        averageConversationLength: 5.0
      };

      const result = await analyticsService.recordConversationMetrics(
        testUser.user.id!,
        testChatbot.id!,
        metricsData
      );

      expect(result).toBe(true);

      // Verify metrics were recorded
      const metrics = await ConversationMetrics.findByUserAndChatbot(
        testUser.user.id!,
        testChatbot.id!
      );
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundError for non-existent chatbot', async () => {
      await expect(analyticsService.recordConversationMetrics(
        testUser.user.id!,
        'non-existent-id',
        { conversationCount: 1, messageCount: 5, averageConversationLength: 5.0 }
      )).rejects.toThrow(NotFoundError);
    });
  });

  describe('recordPerformanceMetrics', () => {
    it('should record performance metrics successfully', async () => {
      const metricsData = {
        averageResponseTime: 2.1,
        successRate: 0.92,
        errorRate: 0.08,
        userSatisfactionScore: 4.1
      };

      const result = await analyticsService.recordPerformanceMetrics(
        testUser.user.id!,
        testChatbot.id!,
        metricsData
      );

      expect(result).toBe(true);

      // Verify metrics were recorded
      const metrics = await PerformanceMetrics.findByUserAndChatbot(
        testUser.user.id!,
        testChatbot.id!
      );
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundError for non-existent chatbot', async () => {
      await expect(analyticsService.recordPerformanceMetrics(
        testUser.user.id!,
        'non-existent-id',
        { averageResponseTime: 1.0, successRate: 1.0, errorRate: 0.0, userSatisfactionScore: 5.0 }
      )).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAnalyticsTimeRange', () => {
    it('should return analytics for specific time range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      // Create test analytics
      await Analytics.create({
        userId: testUser.user.id!,
        chatbotId: testChatbot.id!,
        totalConversations: 8,
        totalMessages: 40,
        averageResponseTime: 1.7,
        userSatisfactionScore: 4.4,
        date: new Date()
      });

      const result = await analyticsService.getAnalyticsTimeRange(
        testUser.user.id!,
        startDate,
        endDate
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].totalConversations).toBe(8);
      expect(result[0].totalMessages).toBe(40);
    });

    it('should filter by chatbot ID when provided', async () => {
      const otherChatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);
      
      // Create analytics for both chatbots
      await Analytics.create({
        userId: testUser.user.id!,
        chatbotId: testChatbot.id!,
        totalConversations: 5,
        totalMessages: 25,
        averageResponseTime: 1.5,
        userSatisfactionScore: 4.0,
        date: new Date()
      });

      await Analytics.create({
        userId: testUser.user.id!,
        chatbotId: otherChatbot.id!,
        totalConversations: 3,
        totalMessages: 15,
        averageResponseTime: 2.0,
        userSatisfactionScore: 3.5,
        date: new Date()
      });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const result = await analyticsService.getAnalyticsTimeRange(
        testUser.user.id!,
        startDate,
        endDate,
        testChatbot.id!
      );

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].chatbotId).toBe(testChatbot.id);
      expect(result[0].totalConversations).toBe(5);
    });
  });
});