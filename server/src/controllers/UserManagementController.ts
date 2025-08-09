import { Request, Response, NextFunction } from 'express';
import { UserManagementService } from '../services/UserManagementService';
import { UserProfile } from '../models/UserProfile';
import { ValidationError } from '../utils/errors';

export class UserManagementController {
  // Get complete user profile including preferences and usage stats
  static async getUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;

      const profile = await UserManagementService.getUserProfile(userId);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: profile.user.id,
            email: profile.user.email,
            firstName: profile.user.firstName,
            lastName: profile.user.lastName,
            emailVerified: profile.user.emailVerified,
            createdAt: profile.user.createdAt
          },
          profile: {
            id: profile.profile.id,
            preferences: profile.profile.preferences,
            createdAt: profile.profile.createdAt,
            updatedAt: profile.profile.updatedAt
          },
          usage: {
            id: profile.usage.id,
            messagesThisMonth: profile.usage.messagesThisMonth,
            totalMessages: profile.usage.totalMessages,
            chatbotsCreated: profile.usage.chatbotsCreated,
            storageUsed: profile.usage.storageUsed,
            lastActive: profile.usage.lastActive,
            createdAt: profile.usage.createdAt,
            updatedAt: profile.usage.updatedAt
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user profile preferences
  static async updateUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const updates = req.body;

      // Validate the update data
      const schema = UserProfile.getValidationSchema().update;
      const { error } = schema.validate(updates);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const updatedProfile = await UserManagementService.updateUserProfile(userId, updates);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          profile: {
            id: updatedProfile.id,
            preferences: updatedProfile.preferences,
            createdAt: updatedProfile.createdAt,
            updatedAt: updatedProfile.updatedAt
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user usage statistics
  static async getUserUsageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;

      const usage = await UserManagementService.getUserUsageStats(userId);

      res.status(200).json({
        success: true,
        data: {
          usage: {
            id: usage.id,
            messagesThisMonth: usage.messagesThisMonth,
            totalMessages: usage.totalMessages,
            chatbotsCreated: usage.chatbotsCreated,
            storageUsed: usage.storageUsed,
            lastActive: usage.lastActive,
            createdAt: usage.createdAt,
            updatedAt: usage.updatedAt
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Export user data (GDPR compliance)
  static async exportUserData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;

      const exportData = await UserManagementService.exportUserData(userId);

      res.status(200).json({
        success: true,
        message: 'User data exported successfully',
        data: exportData
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete user account and all associated data
  static async deleteUserAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { confirmEmail } = req.body;

      // Require email confirmation for account deletion
      if (!confirmEmail || confirmEmail !== (req as any).user.email) {
        throw new ValidationError('Email confirmation is required to delete account');
      }

      await UserManagementService.deleteUserAccount(userId);

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Track message usage (internal endpoint, might be called by chatbot service)
  static async trackMessageUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;

      const usage = await UserManagementService.trackMessageUsage(userId);

      res.status(200).json({
        success: true,
        message: 'Message usage tracked',
        data: {
          usage: {
            messagesThisMonth: usage.messagesThisMonth,
            totalMessages: usage.totalMessages,
            lastActive: usage.lastActive
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Track chatbot creation (internal endpoint)
  static async trackChatbotCreation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;

      const usage = await UserManagementService.trackChatbotCreation(userId);

      res.status(200).json({
        success: true,
        message: 'Chatbot creation tracked',
        data: {
          usage: {
            chatbotsCreated: usage.chatbotsCreated,
            lastActive: usage.lastActive
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update storage usage (internal endpoint)
  static async updateStorageUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { storageBytes } = req.body;

      if (typeof storageBytes !== 'number') {
        throw new ValidationError('Storage bytes must be a number');
      }

      const usage = await UserManagementService.updateStorageUsage(userId, storageBytes);

      res.status(200).json({
        success: true,
        message: 'Storage usage updated',
        data: {
          usage: {
            storageUsed: usage.storageUsed,
            lastActive: usage.lastActive
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user activity (internal endpoint)
  static async updateUserActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;

      const usage = await UserManagementService.updateUserActivity(userId);

      res.status(200).json({
        success: true,
        message: 'User activity updated',
        data: {
          usage: {
            lastActive: usage.lastActive
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin endpoint: Get all usage statistics
  static async getAllUsageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit, offset } = req.query;
      
      const limitNum = limit ? parseInt(limit as string, 10) : undefined;
      const offsetNum = offset ? parseInt(offset as string, 10) : undefined;

      if (limit && isNaN(limitNum!)) {
        throw new ValidationError('Limit must be a valid number');
      }
      
      if (offset && isNaN(offsetNum!)) {
        throw new ValidationError('Offset must be a valid number');
      }

      const allStats = await UserManagementService.getAllUsageStats(limitNum, offsetNum);

      res.status(200).json({
        success: true,
        data: {
          stats: allStats.map(stats => ({
            id: stats.id,
            userId: stats.userId,
            messagesThisMonth: stats.messagesThisMonth,
            totalMessages: stats.totalMessages,
            chatbotsCreated: stats.chatbotsCreated,
            storageUsed: stats.storageUsed,
            lastActive: stats.lastActive,
            createdAt: stats.createdAt,
            updatedAt: stats.updatedAt
          })),
          count: allStats.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin endpoint: Reset monthly usage stats
  static async resetMonthlyUsageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await UserManagementService.resetMonthlyUsageStats();

      res.status(200).json({
        success: true,
        message: 'Monthly usage stats reset successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}