import { UserManagementService } from '../../services/UserManagementService';
import { User } from '../../models/User';
import { UserProfile } from '../../models/UserProfile';
import { UsageStats } from '../../models/UsageStats';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { db } from '../../database/connection';

describe('UserManagementService', () => {
  let testUser: User;
  let testUserId: string;

  beforeEach(async () => {
    // Create a test user
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
    await db('user_profiles').where({ user_id: testUserId }).del();
    await db('users').where({ id: testUserId }).del();
  });

  describe('getUserProfile', () => {
    it('should return complete user profile with created profile and usage stats', async () => {
      const result = await UserManagementService.getUserProfile(testUserId);

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(testUserId);
      expect(result.profile).toBeDefined();
      expect(result.profile.userId).toBe(testUserId);
      expect(result.usage).toBeDefined();
      expect(result.usage.userId).toBe(testUserId);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(
        UserManagementService.getUserProfile('non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile preferences', async () => {
      const updates = {
        preferences: {
          theme: 'dark' as const,
          notifications: false
        }
      };

      const updatedProfile = await UserManagementService.updateUserProfile(testUserId, updates);

      expect(updatedProfile.preferences.theme).toBe('dark');
      expect(updatedProfile.preferences.notifications).toBe(false);
      expect(updatedProfile.preferences.language).toBe('en'); // Should keep existing values
      expect(updatedProfile.preferences.timezone).toBe('UTC');
    });

    it('should create profile if it does not exist', async () => {
      const updates = {
        preferences: {
          theme: 'dark' as const
        }
      };

      const updatedProfile = await UserManagementService.updateUserProfile(testUserId, updates);

      expect(updatedProfile.userId).toBe(testUserId);
      expect(updatedProfile.preferences.theme).toBe('dark');
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(
        UserManagementService.updateUserProfile('non-existent-id', {})
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getUserUsageStats', () => {
    it('should return usage stats for user', async () => {
      const stats = await UserManagementService.getUserUsageStats(testUserId);

      expect(stats.userId).toBe(testUserId);
      expect(stats.messagesThisMonth).toBe(0);
      expect(stats.totalMessages).toBe(0);
      expect(stats.chatbotsCreated).toBe(0);
      expect(stats.storageUsed).toBe(0);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(
        UserManagementService.getUserUsageStats('non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('trackMessageUsage', () => {
    it('should increment message counts', async () => {
      const stats = await UserManagementService.trackMessageUsage(testUserId);

      expect(stats.messagesThisMonth).toBe(1);
      expect(stats.totalMessages).toBe(1);
      expect(stats.lastActive).toBeDefined();
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(
        UserManagementService.trackMessageUsage('non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('trackChatbotCreation', () => {
    it('should increment chatbot count', async () => {
      const stats = await UserManagementService.trackChatbotCreation(testUserId);

      expect(stats.chatbotsCreated).toBe(1);
      expect(stats.lastActive).toBeDefined();
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(
        UserManagementService.trackChatbotCreation('non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateStorageUsage', () => {
    it('should update storage usage', async () => {
      const storageBytes = 1024000;
      const stats = await UserManagementService.updateStorageUsage(testUserId, storageBytes);

      expect(stats.storageUsed).toBe(storageBytes);
      expect(stats.lastActive).toBeDefined();
    });

    it('should throw ValidationError for negative storage', async () => {
      await expect(
        UserManagementService.updateStorageUsage(testUserId, -100)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(
        UserManagementService.updateStorageUsage('non-existent-id', 1000)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateUserActivity', () => {
    it('should update last active timestamp', async () => {
      const beforeUpdate = new Date();
      const stats = await UserManagementService.updateUserActivity(testUserId);

      expect(stats.lastActive).toBeDefined();
      expect(stats.lastActive!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(
        UserManagementService.updateUserActivity('non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('exportUserData', () => {
    it('should export complete user data', async () => {
      // Create some usage data first
      await UserManagementService.trackMessageUsage(testUserId);
      await UserManagementService.trackChatbotCreation(testUserId);
      await UserManagementService.updateUserProfile(testUserId, {
        preferences: { theme: 'dark' }
      });

      const exportData = await UserManagementService.exportUserData(testUserId);

      expect(exportData.user).toBeDefined();
      expect(exportData.user.id).toBe(testUserId);
      expect(exportData.user.email).toBe('test@example.com');
      expect(exportData.user.firstName).toBe('Test');
      expect(exportData.user.lastName).toBe('User');

      expect(exportData.profile).toBeDefined();
      expect(exportData.profile.preferences.theme).toBe('dark');

      expect(exportData.usage).toBeDefined();
      expect(exportData.usage.totalMessages).toBe(1);
      expect(exportData.usage.chatbotsCreated).toBe(1);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(
        UserManagementService.exportUserData('non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteUserAccount', () => {
    it('should delete user account and associated data', async () => {
      // Create profile and usage stats first
      await UserManagementService.getUserProfile(testUserId);

      await UserManagementService.deleteUserAccount(testUserId);

      // Verify user is deleted
      const user = await User.findById(testUserId);
      expect(user).toBeNull();

      // Verify profile is deleted
      const profile = await UserProfile.findByUserId(testUserId);
      expect(profile).toBeNull();

      // Verify usage stats are deleted
      const usage = await UsageStats.findByUserId(testUserId);
      expect(usage).toBeNull();
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(
        UserManagementService.deleteUserAccount('non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('initializeUserData', () => {
    it('should initialize profile and usage stats for new user', async () => {
      const result = await UserManagementService.initializeUserData(testUserId);

      expect(result.profile).toBeDefined();
      expect(result.profile.userId).toBe(testUserId);
      expect(result.usage).toBeDefined();
      expect(result.usage.userId).toBe(testUserId);
    });

    it('should return existing data if already initialized', async () => {
      // Initialize once
      const firstResult = await UserManagementService.initializeUserData(testUserId);
      
      // Initialize again
      const secondResult = await UserManagementService.initializeUserData(testUserId);

      expect(secondResult.profile.id).toBe(firstResult.profile.id);
      expect(secondResult.usage.id).toBe(firstResult.usage.id);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(
        UserManagementService.initializeUserData('non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('resetMonthlyUsageStats', () => {
    it('should reset monthly message counts for all users', async () => {
      // Create another user and track some messages
      const user2 = await User.create({
        email: 'user2@example.com',
        password: 'TestPassword123!',
        firstName: 'User',
        lastName: 'Two'
      });

      await UserManagementService.trackMessageUsage(testUserId);
      await UserManagementService.trackMessageUsage(user2.id!);

      // Verify counts are set
      let stats1 = await UserManagementService.getUserUsageStats(testUserId);
      let stats2 = await UserManagementService.getUserUsageStats(user2.id!);
      expect(stats1.messagesThisMonth).toBe(1);
      expect(stats2.messagesThisMonth).toBe(1);

      // Reset monthly stats
      await UserManagementService.resetMonthlyUsageStats();

      // Verify monthly counts are reset but total counts remain
      stats1 = await UserManagementService.getUserUsageStats(testUserId);
      stats2 = await UserManagementService.getUserUsageStats(user2.id!);
      expect(stats1.messagesThisMonth).toBe(0);
      expect(stats2.messagesThisMonth).toBe(0);
      expect(stats1.totalMessages).toBe(1);
      expect(stats2.totalMessages).toBe(1);

      // Clean up
      await db('usage_stats').where({ user_id: user2.id }).del();
      await db('user_profiles').where({ user_id: user2.id }).del();
      await db('users').where({ id: user2.id }).del();
    });
  });

  describe('getAllUsageStats', () => {
    it('should return usage stats for all users', async () => {
      // Create another user
      const user2 = await User.create({
        email: 'user2@example.com',
        password: 'TestPassword123!',
        firstName: 'User',
        lastName: 'Two'
      });

      // Create usage stats for both users
      await UserManagementService.trackMessageUsage(testUserId);
      await UserManagementService.trackMessageUsage(user2.id!);

      const allStats = await UserManagementService.getAllUsageStats();

      expect(allStats.length).toBeGreaterThanOrEqual(2);
      expect(allStats.some(s => s.userId === testUserId)).toBe(true);
      expect(allStats.some(s => s.userId === user2.id)).toBe(true);

      // Clean up
      await db('usage_stats').where({ user_id: user2.id }).del();
      await db('user_profiles').where({ user_id: user2.id }).del();
      await db('users').where({ id: user2.id }).del();
    });
  });
});