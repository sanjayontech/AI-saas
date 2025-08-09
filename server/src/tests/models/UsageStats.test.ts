import { UsageStats, UsageStatsData } from '../../models/UsageStats';
import { User } from '../../models/User';
import { db } from '../../database/connection';

describe('UsageStats Model', () => {
  let testUser: User;
  let testUserId: string;

  beforeEach(async () => {
    // Create a test user first
    testUser = await User.create({
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    });
    testUserId = testUser.id!;
  });

  afterEach(async () => {
    // Clean up test data
    await db('usage_stats').where({ user_id: testUserId }).del();
    await db('users').where({ id: testUserId }).del();
  });

  describe('constructor', () => {
    it('should create a UsageStats instance with default values', () => {
      const statsData: UsageStatsData = {
        userId: testUserId
      };

      const stats = new UsageStats(statsData);

      expect(stats.userId).toBe(testUserId);
      expect(stats.messagesThisMonth).toBe(0);
      expect(stats.totalMessages).toBe(0);
      expect(stats.chatbotsCreated).toBe(0);
      expect(stats.storageUsed).toBe(0);
    });

    it('should create a UsageStats instance with custom values', () => {
      const statsData: UsageStatsData = {
        userId: testUserId,
        messagesThisMonth: 100,
        totalMessages: 500,
        chatbotsCreated: 3,
        storageUsed: 1024000,
        lastActive: new Date()
      };

      const stats = new UsageStats(statsData);

      expect(stats.userId).toBe(testUserId);
      expect(stats.messagesThisMonth).toBe(100);
      expect(stats.totalMessages).toBe(500);
      expect(stats.chatbotsCreated).toBe(3);
      expect(stats.storageUsed).toBe(1024000);
      expect(stats.lastActive).toBeDefined();
    });
  });

  describe('database operations', () => {
    describe('create', () => {
      it('should create new usage stats with default values', async () => {
        const statsData: UsageStatsData = {
          userId: testUserId
        };

        const stats = await UsageStats.create(statsData);

        expect(stats.id).toBeDefined();
        expect(stats.userId).toBe(testUserId);
        expect(stats.messagesThisMonth).toBe(0);
        expect(stats.totalMessages).toBe(0);
        expect(stats.chatbotsCreated).toBe(0);
        expect(stats.storageUsed).toBe(0);
        expect(stats.createdAt).toBeDefined();
        expect(stats.updatedAt).toBeDefined();
      });

      it('should create new usage stats with custom values', async () => {
        const lastActive = new Date();
        const statsData: UsageStatsData = {
          userId: testUserId,
          messagesThisMonth: 50,
          totalMessages: 200,
          chatbotsCreated: 2,
          storageUsed: 512000,
          lastActive
        };

        const stats = await UsageStats.create(statsData);

        expect(stats.id).toBeDefined();
        expect(stats.userId).toBe(testUserId);
        expect(stats.messagesThisMonth).toBe(50);
        expect(stats.totalMessages).toBe(200);
        expect(stats.chatbotsCreated).toBe(2);
        expect(stats.storageUsed).toBe(512000);
        expect(stats.lastActive).toEqual(lastActive);
      });
    });

    describe('findByUserId', () => {
      it('should find usage stats by user ID', async () => {
        const createdStats = await UsageStats.create({ userId: testUserId });

        const foundStats = await UsageStats.findByUserId(testUserId);

        expect(foundStats).toBeDefined();
        expect(foundStats!.id).toBe(createdStats.id);
        expect(foundStats!.userId).toBe(testUserId);
      });

      it('should return null if stats not found', async () => {
        const foundStats = await UsageStats.findByUserId('non-existent-id');

        expect(foundStats).toBeNull();
      });
    });

    describe('findById', () => {
      it('should find usage stats by ID', async () => {
        const createdStats = await UsageStats.create({ userId: testUserId });

        const foundStats = await UsageStats.findById(createdStats.id!);

        expect(foundStats).toBeDefined();
        expect(foundStats!.id).toBe(createdStats.id);
        expect(foundStats!.userId).toBe(testUserId);
      });

      it('should return null if stats not found', async () => {
        const foundStats = await UsageStats.findById('non-existent-id');

        expect(foundStats).toBeNull();
      });
    });

    describe('save', () => {
      it('should update existing usage stats', async () => {
        const stats = await UsageStats.create({ userId: testUserId });
        
        stats.messagesThisMonth = 25;
        stats.totalMessages = 100;
        stats.chatbotsCreated = 1;

        const updatedStats = await stats.save();

        expect(updatedStats.messagesThisMonth).toBe(25);
        expect(updatedStats.totalMessages).toBe(100);
        expect(updatedStats.chatbotsCreated).toBe(1);
        expect(updatedStats.updatedAt).toBeDefined();
      });
    });

    describe('delete', () => {
      it('should delete usage stats', async () => {
        const stats = await UsageStats.create({ userId: testUserId });

        await stats.delete();

        const foundStats = await UsageStats.findById(stats.id!);
        expect(foundStats).toBeNull();
      });
    });

    describe('findOrCreateByUserId', () => {
      it('should return existing stats if they exist', async () => {
        const existingStats = await UsageStats.create({ userId: testUserId });

        const stats = await UsageStats.findOrCreateByUserId(testUserId);

        expect(stats.id).toBe(existingStats.id);
      });

      it('should create new stats if they do not exist', async () => {
        const stats = await UsageStats.findOrCreateByUserId(testUserId);

        expect(stats.id).toBeDefined();
        expect(stats.userId).toBe(testUserId);
        expect(stats.messagesThisMonth).toBe(0);
        expect(stats.totalMessages).toBe(0);
        expect(stats.chatbotsCreated).toBe(0);
        expect(stats.storageUsed).toBe(0);
      });
    });
  });

  describe('utility methods', () => {
    let stats: UsageStats;

    beforeEach(async () => {
      stats = await UsageStats.create({ userId: testUserId });
    });

    describe('incrementMessageCount', () => {
      it('should increment message counts and update last active', async () => {
        const initialMonth = stats.messagesThisMonth;
        const initialTotal = stats.totalMessages;

        const updatedStats = await stats.incrementMessageCount();

        expect(updatedStats.messagesThisMonth).toBe(initialMonth + 1);
        expect(updatedStats.totalMessages).toBe(initialTotal + 1);
        expect(updatedStats.lastActive).toBeDefined();
      });
    });

    describe('incrementChatbotCount', () => {
      it('should increment chatbot count and update last active', async () => {
        const initialCount = stats.chatbotsCreated;

        const updatedStats = await stats.incrementChatbotCount();

        expect(updatedStats.chatbotsCreated).toBe(initialCount + 1);
        expect(updatedStats.lastActive).toBeDefined();
      });
    });

    describe('updateStorageUsed', () => {
      it('should update storage used and last active', async () => {
        const newStorageSize = 2048000;

        const updatedStats = await stats.updateStorageUsed(newStorageSize);

        expect(updatedStats.storageUsed).toBe(newStorageSize);
        expect(updatedStats.lastActive).toBeDefined();
      });
    });

    describe('updateLastActive', () => {
      it('should update last active timestamp', async () => {
        const beforeUpdate = new Date();

        const updatedStats = await stats.updateLastActive();

        expect(updatedStats.lastActive).toBeDefined();
        expect(updatedStats.lastActive!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      });
    });

    describe('resetMonthlyCount', () => {
      it('should reset monthly message count to zero', async () => {
        // First increment the count
        await stats.incrementMessageCount();
        expect(stats.messagesThisMonth).toBe(1);

        // Then reset it
        const updatedStats = await stats.resetMonthlyCount();

        expect(updatedStats.messagesThisMonth).toBe(0);
        expect(updatedStats.totalMessages).toBe(1); // Total should remain unchanged
      });
    });
  });

  describe('getAllUsageStats', () => {
    beforeEach(async () => {
      // Create multiple test users and their stats
      const user1 = await User.create({
        email: 'user1@example.com',
        password: 'TestPassword123!',
        firstName: 'User',
        lastName: 'One'
      });
      
      const user2 = await User.create({
        email: 'user2@example.com',
        password: 'TestPassword123!',
        firstName: 'User',
        lastName: 'Two'
      });

      await UsageStats.create({ 
        userId: user1.id!, 
        totalMessages: 100 
      });
      
      await UsageStats.create({ 
        userId: user2.id!, 
        totalMessages: 200 
      });
    });

    afterEach(async () => {
      // Clean up additional test data
      await db('usage_stats').del();
      await db('users').del();
    });

    it('should return all usage stats ordered by total messages', async () => {
      const allStats = await UsageStats.getAllUsageStats();

      expect(allStats.length).toBeGreaterThanOrEqual(2);
      expect(allStats[0].totalMessages).toBeGreaterThanOrEqual(allStats[1].totalMessages);
    });

    it('should respect limit parameter', async () => {
      const limitedStats = await UsageStats.getAllUsageStats(1);

      expect(limitedStats.length).toBe(1);
    });

    it('should respect offset parameter', async () => {
      const allStats = await UsageStats.getAllUsageStats();
      const offsetStats = await UsageStats.getAllUsageStats(undefined, 1);

      expect(offsetStats.length).toBe(allStats.length - 1);
    });
  });
});