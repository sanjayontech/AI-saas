import { ConversationMetrics, ConversationMetricsData } from '../../models/ConversationMetrics';
import { db } from '../../database/connection';

describe('ConversationMetrics Model', () => {
  beforeAll(async () => {
    // Ensure migrations are run
    await db.migrate.latest();
  });

  beforeEach(async () => {
    // Clean up conversation_metrics table
    await db('conversation_metrics').del();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('create', () => {
    it('should create conversation metrics with valid data', async () => {
      const metricsData: ConversationMetricsData = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        chatbotId: '123e4567-e89b-12d3-a456-426614174001',
        messageCount: 10,
        durationSeconds: 300.5,
        avgResponseTime: 2.5,
        userSatisfaction: 4,
        userIntent: 'support',
        goalAchieved: true,
        sentimentAnalysis: [
          { timestamp: new Date(), score: 0.5, confidence: 0.8 }
        ],
        topicsDiscussed: ['billing', 'support']
      };

      const metrics = await ConversationMetrics.create(metricsData);

      expect(metrics.id).toBeDefined();
      expect(metrics.conversationId).toBe(metricsData.conversationId);
      expect(metrics.chatbotId).toBe(metricsData.chatbotId);
      expect(metrics.messageCount).toBe(10);
      expect(metrics.durationSeconds).toBe(300.5);
      expect(metrics.avgResponseTime).toBe(2.5);
      expect(metrics.userSatisfaction).toBe(4);
      expect(metrics.userIntent).toBe('support');
      expect(metrics.goalAchieved).toBe(true);
      expect(metrics.sentimentAnalysis).toHaveLength(1);
      expect(metrics.topicsDiscussed).toEqual(['billing', 'support']);
      expect(metrics.createdAt).toBeDefined();
    });

    it('should create conversation metrics with minimal data', async () => {
      const metricsData: ConversationMetricsData = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        chatbotId: '123e4567-e89b-12d3-a456-426614174001'
      };

      const metrics = await ConversationMetrics.create(metricsData);

      expect(metrics.id).toBeDefined();
      expect(metrics.conversationId).toBe(metricsData.conversationId);
      expect(metrics.chatbotId).toBe(metricsData.chatbotId);
      expect(metrics.messageCount).toBe(0);
      expect(metrics.durationSeconds).toBeUndefined();
      expect(metrics.avgResponseTime).toBeUndefined();
      expect(metrics.userSatisfaction).toBeUndefined();
      expect(metrics.userIntent).toBeUndefined();
      expect(metrics.goalAchieved).toBeUndefined();
      expect(metrics.sentimentAnalysis).toEqual([]);
      expect(metrics.topicsDiscussed).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should find conversation metrics by id', async () => {
      const metricsData: ConversationMetricsData = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        chatbotId: '123e4567-e89b-12d3-a456-426614174001',
        messageCount: 5
      };

      const created = await ConversationMetrics.create(metricsData);
      const found = await ConversationMetrics.findById(created.id!);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.messageCount).toBe(5);
    });

    it('should return null for non-existent id', async () => {
      const found = await ConversationMetrics.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findByConversationId', () => {
    it('should find conversation metrics by conversation id', async () => {
      const conversationId = '123e4567-e89b-12d3-a456-426614174000';
      const metricsData: ConversationMetricsData = {
        conversationId,
        chatbotId: '123e4567-e89b-12d3-a456-426614174001',
        messageCount: 5
      };

      await ConversationMetrics.create(metricsData);
      const found = await ConversationMetrics.findByConversationId(conversationId);

      expect(found).toBeDefined();
      expect(found!.conversationId).toBe(conversationId);
      expect(found!.messageCount).toBe(5);
    });

    it('should return null for non-existent conversation id', async () => {
      const found = await ConversationMetrics.findByConversationId('non-existent-conversation');
      expect(found).toBeNull();
    });
  });

  describe('findByChatbotId', () => {
    it('should find conversation metrics by chatbot id', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174001';
      
      // Create multiple metrics for the same chatbot
      await ConversationMetrics.create({
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        chatbotId,
        messageCount: 5
      });
      
      await ConversationMetrics.create({
        conversationId: '123e4567-e89b-12d3-a456-426614174002',
        chatbotId,
        messageCount: 10
      });

      const metrics = await ConversationMetrics.findByChatbotId(chatbotId);

      expect(metrics).toHaveLength(2);
      expect(metrics[0].chatbotId).toBe(chatbotId);
      expect(metrics[1].chatbotId).toBe(chatbotId);
    });

    it('should filter by satisfaction rating', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174001';
      
      await ConversationMetrics.create({
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        chatbotId,
        userSatisfaction: 5
      });
      
      await ConversationMetrics.create({
        conversationId: '123e4567-e89b-12d3-a456-426614174002',
        chatbotId,
        userSatisfaction: 2
      });

      const metrics = await ConversationMetrics.findByChatbotId(chatbotId, 50, 0, {
        minSatisfaction: 4
      });

      expect(metrics).toHaveLength(1);
      expect(metrics[0].userSatisfaction).toBe(5);
    });

    it('should filter by user intent', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174001';
      
      await ConversationMetrics.create({
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        chatbotId,
        userIntent: 'support'
      });
      
      await ConversationMetrics.create({
        conversationId: '123e4567-e89b-12d3-a456-426614174002',
        chatbotId,
        userIntent: 'sales'
      });

      const metrics = await ConversationMetrics.findByChatbotId(chatbotId, 50, 0, {
        userIntent: 'support'
      });

      expect(metrics).toHaveLength(1);
      expect(metrics[0].userIntent).toBe('support');
    });
  });

  describe('upsert', () => {
    it('should create new metrics if none exists', async () => {
      const metricsData: ConversationMetricsData = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        chatbotId: '123e4567-e89b-12d3-a456-426614174001',
        messageCount: 5
      };

      const metrics = await ConversationMetrics.upsert(metricsData);

      expect(metrics.id).toBeDefined();
      expect(metrics.messageCount).toBe(5);
    });

    it('should update existing metrics', async () => {
      const conversationId = '123e4567-e89b-12d3-a456-426614174000';
      const chatbotId = '123e4567-e89b-12d3-a456-426614174001';

      // Create initial metrics
      await ConversationMetrics.create({
        conversationId,
        chatbotId,
        messageCount: 5
      });

      // Upsert with new data
      const updated = await ConversationMetrics.upsert({
        conversationId,
        chatbotId,
        messageCount: 10,
        userSatisfaction: 4
      });

      expect(updated.messageCount).toBe(10);
      expect(updated.userSatisfaction).toBe(4);

      // Verify only one record exists
      const all = await ConversationMetrics.findByChatbotId(chatbotId);
      expect(all).toHaveLength(1);
    });
  });

  describe('getSatisfactionStats', () => {
    it('should calculate satisfaction statistics', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174001';
      
      // Create metrics with different satisfaction scores
      await ConversationMetrics.create({
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        chatbotId,
        userSatisfaction: 5
      });
      
      await ConversationMetrics.create({
        conversationId: '123e4567-e89b-12d3-a456-426614174002',
        chatbotId,
        userSatisfaction: 4
      });
      
      await ConversationMetrics.create({
        conversationId: '123e4567-e89b-12d3-a456-426614174003',
        chatbotId,
        userSatisfaction: 5
      });

      const stats = await ConversationMetrics.getSatisfactionStats(chatbotId);

      expect(stats.averageSatisfaction).toBeCloseTo(4.67, 2);
      expect(stats.totalRatings).toBe(3);
      expect(stats.satisfactionDistribution[4]).toBe(1);
      expect(stats.satisfactionDistribution[5]).toBe(2);
    });

    it('should return zero values for no satisfaction data', async () => {
      const stats = await ConversationMetrics.getSatisfactionStats('non-existent-chatbot');

      expect(stats.averageSatisfaction).toBe(0);
      expect(stats.totalRatings).toBe(0);
      expect(stats.satisfactionDistribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    });
  });

  describe('getConversationLengthStats', () => {
    it('should calculate conversation length statistics', async () => {
      const chatbotId = '123e4567-e89b-12d3-a456-426614174001';
      
      // Create metrics with different message counts
      await ConversationMetrics.create({
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        chatbotId,
        messageCount: 5
      });
      
      await ConversationMetrics.create({
        conversationId: '123e4567-e89b-12d3-a456-426614174002',
        chatbotId,
        messageCount: 10
      });
      
      await ConversationMetrics.create({
        conversationId: '123e4567-e89b-12d3-a456-426614174003',
        chatbotId,
        messageCount: 15
      });

      const stats = await ConversationMetrics.getConversationLengthStats(chatbotId);

      expect(stats.averageLength).toBe(10);
      expect(stats.medianLength).toBe(10);
      expect(stats.totalConversations).toBe(3);
    });

    it('should return zero values for no conversation data', async () => {
      const stats = await ConversationMetrics.getConversationLengthStats('non-existent-chatbot');

      expect(stats.averageLength).toBe(0);
      expect(stats.medianLength).toBe(0);
      expect(stats.totalConversations).toBe(0);
    });
  });

  describe('validation', () => {
    it('should validate conversation metrics data correctly', () => {
      const schema = ConversationMetrics.getValidationSchema();
      
      const validData = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        chatbotId: '123e4567-e89b-12d3-a456-426614174001',
        messageCount: 10,
        durationSeconds: 300.5,
        avgResponseTime: 2.5,
        userSatisfaction: 4,
        userIntent: 'support',
        goalAchieved: true,
        sentimentAnalysis: [
          { timestamp: new Date(), score: 0.5, confidence: 0.8 }
        ],
        topicsDiscussed: ['billing', 'support']
      };

      const { error } = schema.create.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid conversation id', () => {
      const schema = ConversationMetrics.getValidationSchema();
      
      const invalidData = {
        conversationId: 'invalid-uuid',
        chatbotId: '123e4567-e89b-12d3-a456-426614174001'
      };

      const { error } = schema.create.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject invalid satisfaction score', () => {
      const schema = ConversationMetrics.getValidationSchema();
      
      const invalidData = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        chatbotId: '123e4567-e89b-12d3-a456-426614174001',
        userSatisfaction: 6 // Should be 1-5
      };

      const { error } = schema.create.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject invalid sentiment analysis', () => {
      const schema = ConversationMetrics.getValidationSchema();
      
      const invalidData = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        chatbotId: '123e4567-e89b-12d3-a456-426614174001',
        sentimentAnalysis: [
          { timestamp: new Date(), score: 2.0, confidence: 0.8 } // Score should be -1 to 1
        ]
      };

      const { error } = schema.create.validate(invalidData);
      expect(error).toBeDefined();
    });
  });
});