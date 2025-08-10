import { Analytics, AnalyticsData } from '../../models/Analytics';
import { db } from '../../database/connection';

describe('Analytics Model', () => {
  beforeAll(async () => {
    // Ensure migrations are run
    await db.migrate.latest();
  });

  beforeEach(async () => {
    // Clean up analytics table
    await db('analytics').del();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('create', () => {
    it('should create analytics record with valid data', async () => {
      const analyticsData: AnalyticsData = {
        chatbotId: '123e4567-e89b-12d3-a456-426614174000',
        date: new Date('2024-01-15'),
        totalConversations: 10,
        totalMessages: 50,
        uniqueUsers: 8,
        avgConversationLength: 5.0,
        avgResponseTime: 2.5,
        userSatisfactionScore: 4.2,
        totalRatings: 5,
        popularQueries: [
          { query: 'help', count: 15 },
          { query: 'support', count: 10 }
        ],
        responseCategories: [
          { category: 'Support', count: 20, percentage: 40 },
          { category: 'Information', count: 30, percentage: 60 }
        ]
      };

      const analytics = await Analytics.create(analyticsData);

      expect(analytics.id).toBeDefined();
      expect(analytics.chatbotId).toBe(analyticsData.chatbotId);
      expect(analytics.totalConversations).toBe(10);
      expect(analytics.totalMessages).toBe(50);
      expect(analytics.uniqueUsers).toBe(8);
      expect(analytics.avgConversationLength).toBe(5.0);
      expect(analytics.avgResponseTime).toBe(2.5);
      expect(analytics.userSatisfactionScore).toBe(4.2);
      expect(analytics.totalRatings).toBe(5);
      expect(analytics.popularQueries).toHaveLength(2);
      expect(analytics.responseCategories).toHaveLength(2);
      expect(analytics.createdAt).toBeDefined();
    });

    it('should create analytics record with minimal data', async () => {
      const analyticsData: AnalyticsData = {
        chatbotId: '123e4567-e89b-12d3-a456-426614174000',
        date: new Date('2024-01-15')
      };

      const analytics = await Analytics.create(analyticsData);

      expect(analytics.id).toBeDefined();
      expect(analytics.chatbotId).toBe(analyticsData.chatbotId);
      expect(analytics.totalConversations).toBe(0);
      expect(analytics.totalMessages).toBe(0);
      expect(analytics.uniqueUsers).toBe(0);
      expect(analytics.avgConversationLength).toBe(0);
      expect(analytics.avgResponseTime).toBe(0);
      expect(analytics.userSatisfactionScore).toBe(0);
      expect(analytics.totalRatings).toBe(0);
      expect(analytics.popularQueries).toEqual([]);
      expect(analytics.responseCategories).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should find analytics by id', async () => {
      const analyticsData: AnalyticsData = {
        chatbotId: '123e4567-e89b-12d3-a456-426614174000',
        date: new Date('2024-01-15'),
        totalConversations: 5
      };

      const created = await Analytics.create(analyticsData);
      const found = await Analytics.findById(created.id!);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.totalConversations).toBe(5);
    });

    it('should return null for non-existent id', async () => {
      const found = await Analytics.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findByChatbotAndDate', () => {
    it('should find analytics by chatbot and date', async () => {
      const date = new Date('2024-01-15');
      const analyticsData: AnalyticsData = {
        chatbotId: '123e4567-e89b-12d3-a456-426614174000',
        date,
        totalConversations: 5
      };

      await Analytics.create(analyticsData);
      const found = await Analytics.findByChatbotAndDate(analyticsData.chatbotId, date);

      expect(found).toBeDefined();
      expect(found!.chatbotId).toBe(analyticsData.chatbotId);
      expect(found!.totalConversations).toBe(5);
    });

    it('should return null for non-existent combination', async () => {
      const found = await Analytics.findByChatbotAndDate(
        'non-existent-chatbot',
        new Date('2024-01-15')
      );
      expect(found).toBeNull();
    });
  });

  describe('findByChatbotId', () => {
    it('should find analytics by chatbot id with date range', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Create analytics for multiple dates
      await Analytics.create({
        chatbotId,
        date: new Date('2024-01-10'),
        totalConversations: 5
      });
      
      await Analytics.create({
        chatbotId,
        date: new Date('2024-01-15'),
        totalConversations: 10
      });
      
      await Analytics.create({
        chatbotId,
        date: new Date('2024-01-20'),
        totalConversations: 8
      });

      const analytics = await Analytics.findByChatbotId(
        chatbotId,
        new Date('2024-01-12'),
        new Date('2024-01-18')
      );

      expect(analytics).toHaveLength(1);
      expect(analytics[0].totalConversations).toBe(10);
    });

    it('should return empty array for non-existent chatbot', async () => {
      const analytics = await Analytics.findByChatbotId('non-existent-chatbot');
      expect(analytics).toEqual([]);
    });
  });

  describe('upsert', () => {
    it('should create new analytics if none exists', async () => {
      const analyticsData: AnalyticsData = {
        chatbotId: '123e4567-e89b-12d3-a456-426614174000',
        date: new Date('2024-01-15'),
        totalConversations: 5
      };

      const analytics = await Analytics.upsert(analyticsData);

      expect(analytics.id).toBeDefined();
      expect(analytics.totalConversations).toBe(5);
    });

    it('should update existing analytics', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174000';
      const date = new Date('2024-01-15');

      // Create initial analytics
      await Analytics.create({
        chatbotId,
        date,
        totalConversations: 5
      });

      // Upsert with new data
      const updated = await Analytics.upsert({
        chatbotId,
        date,
        totalConversations: 10,
        totalMessages: 50
      });

      expect(updated.totalConversations).toBe(10);
      expect(updated.totalMessages).toBe(50);

      // Verify only one record exists
      const all = await Analytics.findByChatbotId(chatbotId);
      expect(all).toHaveLength(1);
    });
  });

  describe('save', () => {
    it('should update existing analytics record', async () => {
      const analyticsData: AnalyticsData = {
        chatbotId: '123e4567-e89b-12d3-a456-426614174000',
        date: new Date('2024-01-15'),
        totalConversations: 5
      };

      const analytics = await Analytics.create(analyticsData);
      analytics.totalConversations = 10;
      analytics.totalMessages = 50;

      const updated = await analytics.save();

      expect(updated.totalConversations).toBe(10);
      expect(updated.totalMessages).toBe(50);
      expect(updated.updatedAt).toBeDefined();
    });
  });

  describe('getAggregatedAnalytics', () => {
    it('should return aggregated analytics for date range', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Create analytics for multiple dates
      await Analytics.create({
        chatbotId,
        date: new Date('2024-01-10'),
        totalConversations: 5,
        totalMessages: 25,
        avgConversationLength: 5.0,
        avgResponseTime: 2.0,
        userSatisfactionScore: 4.0,
        totalRatings: 3
      });
      
      await Analytics.create({
        chatbotId,
        date: new Date('2024-01-15'),
        totalConversations: 10,
        totalMessages: 40,
        avgConversationLength: 4.0,
        avgResponseTime: 3.0,
        userSatisfactionScore: 4.5,
        totalRatings: 5
      });

      const aggregated = await Analytics.getAggregatedAnalytics(
        chatbotId,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(aggregated.totalConversations).toBe(15);
      expect(aggregated.totalMessages).toBe(65);
      expect(aggregated.avgConversationLength).toBe(4.5); // Average of 5.0 and 4.0
      expect(aggregated.avgResponseTime).toBe(2.5); // Average of 2.0 and 3.0
      expect(aggregated.avgSatisfactionScore).toBe(4.25); // Average of 4.0 and 4.5
      expect(aggregated.totalRatings).toBe(8);
    });

    it('should return zero values for no data', async () => {
      const aggregated = await Analytics.getAggregatedAnalytics(
        'non-existent-chatbot',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(aggregated.totalConversations).toBe(0);
      expect(aggregated.totalMessages).toBe(0);
      expect(aggregated.avgConversationLength).toBe(0);
      expect(aggregated.avgResponseTime).toBe(0);
      expect(aggregated.avgSatisfactionScore).toBe(0);
      expect(aggregated.totalRatings).toBe(0);
    });
  });

  describe('validation', () => {
    it('should validate analytics data correctly', () => {
      const schema = Analytics.getValidationSchema();
      
      const validData = {
        chatbotId: '123e4567-e89b-12d3-a456-426614174000',
        date: new Date('2024-01-15'),
        totalConversations: 10,
        totalMessages: 50,
        uniqueUsers: 8,
        avgConversationLength: 5.0,
        avgResponseTime: 2.5,
        userSatisfactionScore: 4,
        totalRatings: 5,
        popularQueries: [{ query: 'help', count: 10 }],
        responseCategories: [{ category: 'Support', count: 10, percentage: 50 }]
      };

      const { error } = schema.create.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid chatbot id', () => {
      const schema = Analytics.getValidationSchema();
      
      const invalidData = {
        chatbotId: 'invalid-uuid',
        date: new Date('2024-01-15')
      };

      const { error } = schema.create.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject invalid satisfaction score', () => {
      const schema = Analytics.getValidationSchema();
      
      const invalidData = {
        chatbotId: '123e4567-e89b-12d3-a456-426614174000',
        date: new Date('2024-01-15'),
        userSatisfactionScore: 6 // Should be 0-5
      };

      const { error } = schema.create.validate(invalidData);
      expect(error).toBeDefined();
    });
  });
});