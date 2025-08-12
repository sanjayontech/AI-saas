import { AdminService } from '../../services/AdminService';
import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { UsageStats } from '../../models/UsageStats';
import { TestDataFactory, TestCleanup } from '../utils/testHelpers';
import { 
  ValidationError, 
  AuthenticationError, 
  ForbiddenError,
  NotFoundError 
} from '../../utils/errors';

describe('AdminService - Unit Tests', () => {
  let adminService: AdminService;

  beforeAll(() => {
    adminService = new AdminService();
  });

  afterEach(async () => {
    await TestCleanup.cleanupAll();
  });

  describe('getSystemStats', () => {
    it('should return system statistics', async () => {
      // Create test data
      const user1 = await TestDataFactory.createTestUser();
      const user2 = await TestDataFactory.createTestUser({ email: 'user2@example.com' });
      
      const chatbot1 = await TestDataFactory.createTestChatbot({ userId: user1.user.id! });
      const chatbot2 = await TestDataFactory.createTestChatbot({ userId: user2.user.id! });

      const stats = await adminService.getSystemStats();

      expect(stats).toBeDefined();
      expect(stats.totalUsers).toBeGreaterThanOrEqual(2);
      expect(stats.totalChatbots).toBeGreaterThanOrEqual(2);
      expect(stats.totalConversations).toBeGreaterThanOrEqual(0);
      expect(stats.totalMessages).toBeGreaterThanOrEqual(0);
      expect(stats.activeUsersToday).toBeGreaterThanOrEqual(0);
      expect(stats.systemHealth).toBeDefined();
      expect(stats.systemHealth.database).toBe('healthy');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalQuery = User.query;
      User.query = jest.fn().mockRejectedValue(new Error('Database error'));

      const stats = await adminService.getSystemStats();

      expect(stats.systemHealth.database).toBe('unhealthy');
      
      // Restore original method
      User.query = originalQuery;
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated list of users', async () => {
      // Create test users
      await TestDataFactory.createTestUser({ email: 'user1@example.com' });
      await TestDataFactory.createTestUser({ email: 'user2@example.com' });
      await TestDataFactory.createTestUser({ email: 'user3@example.com' });

      const result = await adminService.getAllUsers({ page: 1, limit: 2 });

      expect(result).toBeDefined();
      expect(result.users).toHaveLength(2);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.total).toBeGreaterThanOrEqual(3);
      expect(result.pagination.pages).toBeGreaterThanOrEqual(2);
    });

    it('should filter users by search term', async () => {
      await TestDataFactory.createTestUser({ 
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe'
      });
      await TestDataFactory.createTestUser({ 
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith'
      });

      const result = await adminService.getAllUsers({ 
        page: 1, 
        limit: 10, 
        search: 'john' 
      });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].firstName).toBe('John');
    });

    it('should sort users by specified field', async () => {
      await TestDataFactory.createTestUser({ 
        email: 'a@example.com',
        firstName: 'Alice'
      });
      await TestDataFactory.createTestUser({ 
        email: 'b@example.com',
        firstName: 'Bob'
      });

      const result = await adminService.getAllUsers({ 
        page: 1, 
        limit: 10, 
        sortBy: 'firstName',
        sortOrder: 'asc'
      });

      expect(result.users[0].firstName).toBe('Alice');
      expect(result.users[1].firstName).toBe('Bob');
    });
  });

  describe('getUserDetails', () => {
    it('should return detailed user information', async () => {
      const testUser = await TestDataFactory.createTestUser();
      const chatbot = await TestDataFactory.createTestChatbot({ userId: testUser.user.id! });

      const details = await adminService.getUserDetails(testUser.user.id!);

      expect(details).toBeDefined();
      expect(details.user).toBeDefined();
      expect(details.user.id).toBe(testUser.user.id);
      expect(details.chatbots).toBeDefined();
      expect(details.chatbots).toHaveLength(1);
      expect(details.usage).toBeDefined();
      expect(details.conversations).toBeDefined();
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(adminService.getUserDetails('non-existent-id'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status successfully', async () => {
      const testUser = await TestDataFactory.createTestUser();

      const result = await adminService.updateUserStatus(testUser.user.id!, {
        isActive: false,
        reason: 'Suspended for policy violation'
      });

      expect(result).toBe(true);

      // Verify user was updated
      const updatedUser = await User.findById(testUser.user.id!);
      expect(updatedUser?.isActive).toBe(false);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(adminService.updateUserStatus('non-existent-id', {
        isActive: false,
        reason: 'Test'
      }))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('deleteUser', () => {
    it('should delete user and all associated data', async () => {
      const testUser = await TestDataFactory.createTestUser();
      const chatbot = await TestDataFactory.createTestChatbot({ userId: testUser.user.id! });

      const result = await adminService.deleteUser(testUser.user.id!);

      expect(result).toBe(true);

      // Verify user was deleted
      const deletedUser = await User.findById(testUser.user.id!);
      expect(deletedUser).toBeNull();

      // Verify associated chatbots were deleted
      const deletedChatbot = await Chatbot.findById(chatbot.id!);
      expect(deletedChatbot).toBeNull();
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(adminService.deleteUser('non-existent-id'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health status', async () => {
      const health = await adminService.getSystemHealth();

      expect(health).toBeDefined();
      expect(health.database).toBeDefined();
      expect(health.googleAI).toBeDefined();
      expect(health.memory).toBeDefined();
      expect(health.uptime).toBeDefined();
      expect(typeof health.uptime).toBe('number');
    });

    it('should detect unhealthy database', async () => {
      // Mock database error
      const originalQuery = User.query;
      User.query = jest.fn().mockRejectedValue(new Error('Database error'));

      const health = await adminService.getSystemHealth();

      expect(health.database).toBe('unhealthy');
      
      // Restore original method
      User.query = originalQuery;
    });
  });

  describe('getUsageAnalytics', () => {
    it('should return usage analytics for specified time range', async () => {
      const testUser = await TestDataFactory.createTestUser();
      const chatbot = await TestDataFactory.createTestChatbot({ userId: testUser.user.id! });

      const analytics = await adminService.getUsageAnalytics({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endDate: new Date(),
        granularity: 'day'
      });

      expect(analytics).toBeDefined();
      expect(analytics.userGrowth).toBeDefined();
      expect(analytics.chatbotUsage).toBeDefined();
      expect(analytics.messageVolume).toBeDefined();
      expect(analytics.topChatbots).toBeDefined();
      expect(Array.isArray(analytics.userGrowth)).toBe(true);
      expect(Array.isArray(analytics.messageVolume)).toBe(true);
    });

    it('should validate date range', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      await expect(adminService.getUsageAnalytics({
        startDate: futureDate,
        endDate: pastDate,
        granularity: 'day'
      }))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('exportUserData', () => {
    it('should export user data in specified format', async () => {
      const testUser = await TestDataFactory.createTestUser();
      const chatbot = await TestDataFactory.createTestChatbot({ userId: testUser.user.id! });

      const exportData = await adminService.exportUserData(testUser.user.id!, 'json');

      expect(exportData).toBeDefined();
      expect(exportData.format).toBe('json');
      expect(exportData.data).toBeDefined();
      expect(exportData.filename).toContain(testUser.user.id);
      expect(exportData.filename).toContain('.json');
    });

    it('should support CSV export format', async () => {
      const testUser = await TestDataFactory.createTestUser();

      const exportData = await adminService.exportUserData(testUser.user.id!, 'csv');

      expect(exportData.format).toBe('csv');
      expect(exportData.filename).toContain('.csv');
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(adminService.exportUserData('non-existent-id', 'json'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('getChatbotAnalytics', () => {
    it('should return analytics for all chatbots', async () => {
      const testUser = await TestDataFactory.createTestUser();
      const chatbot = await TestDataFactory.createTestChatbot({ userId: testUser.user.id! });

      const analytics = await adminService.getChatbotAnalytics({
        page: 1,
        limit: 10,
        sortBy: 'messageCount',
        sortOrder: 'desc'
      });

      expect(analytics).toBeDefined();
      expect(analytics.chatbots).toBeDefined();
      expect(analytics.pagination).toBeDefined();
      expect(Array.isArray(analytics.chatbots)).toBe(true);
    });

    it('should filter chatbots by user', async () => {
      const user1 = await TestDataFactory.createTestUser();
      const user2 = await TestDataFactory.createTestUser({ email: 'user2@example.com' });
      
      const chatbot1 = await TestDataFactory.createTestChatbot({ userId: user1.user.id! });
      const chatbot2 = await TestDataFactory.createTestChatbot({ userId: user2.user.id! });

      const analytics = await adminService.getChatbotAnalytics({
        page: 1,
        limit: 10,
        userId: user1.user.id!
      });

      expect(analytics.chatbots).toHaveLength(1);
      expect(analytics.chatbots[0].userId).toBe(user1.user.id);
    });
  });
});