import { User } from '../models/User';
import { UserProfile, UserPreferences } from '../models/UserProfile';
import { UsageStats } from '../models/UsageStats';
import { ValidationError, NotFoundError } from '../utils/errors';

export interface UserDataExport {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
    createdAt: Date;
  };
  profile: {
    preferences: UserPreferences;
    createdAt: Date;
    updatedAt: Date;
  };
  usage: {
    messagesThisMonth: number;
    totalMessages: number;
    chatbotsCreated: number;
    storageUsed: number;
    lastActive: Date | null;
  };
  // Future: chatbots, conversations, etc.
}

export class UserManagementService {
  // Get complete user profile including preferences and usage stats
  static async getUserProfile(userId: string): Promise<{
    user: User;
    profile: UserProfile;
    usage: UsageStats;
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get or create profile and usage stats
    const profile = await UserProfile.findOrCreateByUserId(userId);
    const usage = await UsageStats.findOrCreateByUserId(userId);

    return {
      user,
      profile,
      usage
    };
  }

  // Update user profile preferences
  static async updateUserProfile(
    userId: string, 
    updates: { preferences?: Partial<UserPreferences> }
  ): Promise<UserProfile> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    let profile = await UserProfile.findByUserId(userId);
    if (!profile) {
      profile = await UserProfile.create({ userId });
    }

    // Update preferences if provided
    if (updates.preferences) {
      profile.preferences = {
        ...profile.preferences,
        ...updates.preferences
      };
    }

    return profile.save();
  }

  // Get user usage statistics
  static async getUserUsageStats(userId: string): Promise<UsageStats> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return UsageStats.findOrCreateByUserId(userId);
  }

  // Track message usage
  static async trackMessageUsage(userId: string): Promise<UsageStats> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const stats = await UsageStats.findOrCreateByUserId(userId);
    return stats.incrementMessageCount();
  }

  // Track chatbot creation
  static async trackChatbotCreation(userId: string): Promise<UsageStats> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const stats = await UsageStats.findOrCreateByUserId(userId);
    return stats.incrementChatbotCount();
  }

  // Update storage usage
  static async updateStorageUsage(userId: string, bytes: number): Promise<UsageStats> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (bytes < 0) {
      throw new ValidationError('Storage usage cannot be negative');
    }

    const stats = await UsageStats.findOrCreateByUserId(userId);
    return stats.updateStorageUsed(bytes);
  }

  // Update user activity
  static async updateUserActivity(userId: string): Promise<UsageStats> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const stats = await UsageStats.findOrCreateByUserId(userId);
    return stats.updateLastActive();
  }

  // Export all user data
  static async exportUserData(userId: string): Promise<UserDataExport> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const profile = await UserProfile.findOrCreateByUserId(userId);
    const usage = await UsageStats.findOrCreateByUserId(userId);

    return {
      user: {
        id: user.id!,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt!
      },
      profile: {
        preferences: profile.preferences,
        createdAt: profile.createdAt!,
        updatedAt: profile.updatedAt!
      },
      usage: {
        messagesThisMonth: usage.messagesThisMonth,
        totalMessages: usage.totalMessages,
        chatbotsCreated: usage.chatbotsCreated,
        storageUsed: usage.storageUsed,
        lastActive: usage.lastActive || null
      }
    };
  }

  // Delete user account and all associated data
  static async deleteUserAccount(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Delete associated data first (due to foreign key constraints)
    const profile = await UserProfile.findByUserId(userId);
    if (profile) {
      await profile.delete();
    }

    const usage = await UsageStats.findByUserId(userId);
    if (usage) {
      await usage.delete();
    }

    // Note: In a real application, you would also delete:
    // - Chatbots created by the user
    // - Conversations and messages
    // - Any uploaded files or assets
    // - Billing information
    // - Audit logs (or anonymize them)

    // Finally delete the user account
    // Note: The User model doesn't have a delete method yet, 
    // so we'll need to add it or use direct database query
    // For now, we'll use direct database query
    const { db } = require('../database/connection');
    await db('users').where({ id: userId }).del();
  }

  // Reset monthly usage stats (to be called by a scheduled job)
  static async resetMonthlyUsageStats(): Promise<void> {
    const allStats = await UsageStats.getAllUsageStats();
    
    for (const stats of allStats) {
      await stats.resetMonthlyCount();
    }
  }

  // Get usage statistics for all users (admin function)
  static async getAllUsageStats(limit?: number, offset?: number): Promise<UsageStats[]> {
    return UsageStats.getAllUsageStats(limit, offset);
  }

  // Initialize user profile and usage stats when user registers
  static async initializeUserData(userId: string): Promise<{
    profile: UserProfile;
    usage: UsageStats;
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Create profile and usage stats if they don't exist
    const profile = await UserProfile.findOrCreateByUserId(userId);
    const usage = await UsageStats.findOrCreateByUserId(userId);

    return { profile, usage };
  }
}