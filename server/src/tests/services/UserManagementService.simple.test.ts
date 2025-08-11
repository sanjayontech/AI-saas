import { UserManagementService } from '../../services/UserManagementService';
import { UserProfile } from '../../models/UserProfile';
import { UsageStats } from '../../models/UsageStats';
import { TestDataFactory, TestCleanup } from '../utils/testHelpers';
import { NotFoundError, ValidationError } from '../../utils/errors';

describe('UserManagementService - Integration Tests', () => {
  let userManagementService: UserManagementService;
  let testUser: any;

  beforeAll(() => {
    userManagementService = new UserManagementService();
  });

  beforeEach(async () => {
    testUser = await TestDataFactory.createTestUser();
  });

  afterEach(async () => {
    await TestCleanup.cleanupAll();
  });

  describe('getUserProfile', () => {
    it('should return user profile if exists', async () => {
      const profile = await TestDataFactory.createTestUserProfile(testUser.user.id!);

      const result = await userManagementService.getUserProfile(testUser.user.id!);

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUser.user.id);
      expect(result.preferences).toBeDefined();
    });

    it('should create default profile if none exists', async () => {
      const result = await userManagementService.getUserProfile(testUser.user.id!);

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUser.user.id);
      expect(result.preferences.theme).toBe('light');
      expect(result.preferences.notifications).toBe(true);
    });
  });

  describe('updateUserProfile', () => {
    it('should update existing profile successfully', async () => {
      await TestDataFactory.createTestUserProfile(testUser.user.id!);
      
      const updateData = {
        preferences: {
          theme: 'dark' as const,
          notifications: false,
          language: 'es',
          timezone: 'America/New_York'
        }
      };

      const result = await userManagementService.updateUserProfile(
        testUser.user.id!,
        updateData
      );

      expect(result).toBeDefined();
      expect(result.preferences.theme).toBe('dark');
      expect(result.preferences.notifications).toBe(false);
      expect(result.preferences.language).toBe('es');
      expect(result.preferences.timezone).toBe('America/New_York');
    });

    it('should create profile if none exists and update it', async () => {
      const updateData = {
        preferences: {
          theme: 'dark' as const,
          notifications: false,
          language: 'fr',
          timezone: 'Europe/Paris'
        }
      };

      const result = await userManagementService.updateUserProfile(
        testUser.user.id!,
        updateData
      );

      expect(result).toBeDefined();
      expect(result.preferences.theme).toBe('dark');
      expect(result.preferences.language).toBe('fr');
    });

    it('should throw ValidationError for invalid theme', async () => {
      const updateData = {
        preferences: {
          theme: 'invalid-theme' as any
        }
      };

      await expect(userManagementService.updateUserProfile(
        testUser.user.id!,
        updateData
      )).rejects.toThrow(ValidationError);
    });
  });

  describe('getUserUsageStats', () => {
    it('should return usage stats if exists', async () => {
      const stats = await TestDataFactory.createTestUsageStats(testUser.user.id!, {
        messagesThisMonth: 100,
        totalMessages: 500,
        chatbotsCreated: 3
      });

      const result = await userManagementService.getUserUsageStats(testUser.user.id!);

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUser.user.id);
      expect(result.messagesThisMonth).toBe(100);
      expect(result.totalMessages).toBe(500);
      expect(result.chatbotsCreated).toBe(3);
    });

    it('should create default stats if none exists', async () => {
      const result = await userManagementService.getUserUsageStats(testUser.user.id!);

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUser.user.id);
      expect(result.messagesThisMonth).toBe(0);
      expect(result.totalMessages).toBe(0);
      expect(result.chatbotsCreated).toBe(0);
      expect(result.storageUsed).toBe(0);
    });
  });

  describe('updateUsageStats', () => {
    it('should update existing stats successfully', async () => {
      await TestDataFactory.createTestUsageStats(testUser.user.id!);

      const result = await userManagementService.updateUsageStats(testUser.user.id!, {
        messagesThisMonth: 150,
        totalMessages: 600,
        chatbotsCreated: 5
      });

      expect(result).toBeDefined();
      expect(result.messagesThisMonth).toBe(150);
      expect(result.totalMessages).toBe(600);
      expect(result.chatbotsCreated).toBe(5);
    });

    it('should create stats if none exists and update them', async () => {
      const result = await userManagementService.updateUsageStats(testUser.user.id!, {
        messagesThisMonth: 50,
        totalMessages: 200
      });

      expect(result).toBeDefined();
      expect(result.messagesThisMonth).toBe(50);
      expect(result.totalMessages).toBe(200);
    });
  });

  describe('exportUserData', () => {
    it('should export complete user data', async () => {
      // Create test data
      await TestDataFactory.createTestUserProfile(testUser.user.id!);
      await TestDataFactory.createTestUsageStats(testUser.user.id!);
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);

      const result = await userManagementService.exportUserData(testUser.user.id!);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testUser.user.email);
      expect(result.profile).toBeDefined();
      expect(result.usageStats).toBeDefined();
      expect(result.chatbots).toBeDefined();
      expect(result.chatbots).toHaveLength(1);
      expect(result.chatbots[0].name).toBe(chatbot.name);
      expect(result.exportedAt).toBeDefined();
    });

    it('should export minimal data for user with no additional data', async () => {
      const result = await userManagementService.exportUserData(testUser.user.id!);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.chatbots).toHaveLength(0);
      expect(result.conversations).toHaveLength(0);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(userManagementService.exportUserData('non-existent-id'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('deleteUserAccount', () => {
    it('should delete user account and all related data', async () => {
      // Create test data
      await TestDataFactory.createTestUserProfile(testUser.user.id!);
      await TestDataFactory.createTestUsageStats(testUser.user.id!);
      const chatbot = await TestDataFactory.createTestChatbot(testUser.user.id!);

      const result = await userManagementService.deleteUserAccount(testUser.user.id!);

      expect(result).toBe(true);

      // Verify all data is deleted
      const profile = await UserProfile.findByUserId(testUser.user.id!);
      expect(profile).toBeNull();

      const stats = await UsageStats.findByUserId(testUser.user.id!);
      expect(stats).toBeNull();

      // Note: User should still exist but be marked as deleted
      // This depends on the implementation - some systems soft delete
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(userManagementService.deleteUserAccount('non-existent-id'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('incrementMessageCount', () => {
    it('should increment message counts correctly', async () => {
      await TestDataFactory.createTestUsageStats(testUser.user.id!, {
        messagesThisMonth: 10,
        totalMessages: 50
      });

      const result = await userManagementService.incrementMessageCount(testUser.user.id!);

      expect(result).toBeDefined();
      expect(result.messagesThisMonth).toBe(11);
      expect(result.totalMessages).toBe(51);
    });

    it('should create stats and increment if none exists', async () => {
      const result = await userManagementService.incrementMessageCount(testUser.user.id!);

      expect(result).toBeDefined();
      expect(result.messagesThisMonth).toBe(1);
      expect(result.totalMessages).toBe(1);
    });
  });

  describe('incrementChatbotCount', () => {
    it('should increment chatbot count correctly', async () => {
      await TestDataFactory.createTestUsageStats(testUser.user.id!, {
        chatbotsCreated: 2
      });

      const result = await userManagementService.incrementChatbotCount(testUser.user.id!);

      expect(result).toBeDefined();
      expect(result.chatbotsCreated).toBe(3);
    });

    it('should create stats and increment if none exists', async () => {
      const result = await userManagementService.incrementChatbotCount(testUser.user.id!);

      expect(result).toBeDefined();
      expect(result.chatbotsCreated).toBe(1);
    });
  });
});