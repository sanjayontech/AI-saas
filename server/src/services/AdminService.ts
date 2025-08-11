import { User } from '../models/User';
import { Chatbot } from '../models/Chatbot';
import { db } from '../database/connection';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface SystemMetrics {
  totalUsers: number;
  totalAdmins: number;
  totalChatbots: number;
  totalConversations: number;
  activeUsersToday: number;
  activeUsersThisWeek: number;
  activeUsersThisMonth: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export interface UserManagementData {
  users: User[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface AdminDashboardData {
  metrics: SystemMetrics;
  recentUsers: User[];
  recentActivity: any[];
}

export class AdminService {
  static async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      // Get user counts
      const totalUsers = await User.getUserCount();
      const totalAdmins = await User.getAdminCount();

      // Get chatbot count
      const chatbotResult = await db('chatbots').count('id as count').first();
      const totalChatbots = parseInt(chatbotResult?.count as string) || 0;

      // Get conversation count
      const conversationResult = await db('conversations').count('id as count').first();
      const totalConversations = parseInt(conversationResult?.count as string) || 0;

      // Get active users (users who logged in recently)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const thisWeek = new Date();
      thisWeek.setDate(thisWeek.getDate() - 7);
      
      const thisMonth = new Date();
      thisMonth.setDate(thisMonth.getDate() - 30);

      const activeUsersToday = await db('users')
        .where('last_login_at', '>=', today)
        .count('id as count')
        .first();

      const activeUsersThisWeek = await db('users')
        .where('last_login_at', '>=', thisWeek)
        .count('id as count')
        .first();

      const activeUsersThisMonth = await db('users')
        .where('last_login_at', '>=', thisMonth)
        .count('id as count')
        .first();

      // Determine system health (simplified logic)
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      const activeRatio = totalUsers > 0 ? (parseInt(activeUsersThisWeek?.count as string) || 0) / totalUsers : 0;
      
      if (activeRatio < 0.1) {
        systemHealth = 'critical';
      } else if (activeRatio < 0.3) {
        systemHealth = 'warning';
      }

      return {
        totalUsers,
        totalAdmins,
        totalChatbots,
        totalConversations,
        activeUsersToday: parseInt(activeUsersToday?.count as string) || 0,
        activeUsersThisWeek: parseInt(activeUsersThisWeek?.count as string) || 0,
        activeUsersThisMonth: parseInt(activeUsersThisMonth?.count as string) || 0,
        systemHealth
      };
    } catch (error) {
      console.error('Error getting system metrics:', error);
      throw new Error('Failed to retrieve system metrics');
    }
  }

  static async getAllUsers(page: number = 1, limit: number = 50): Promise<UserManagementData> {
    try {
      const offset = (page - 1) * limit;
      const users = await User.findAllUsers(limit, offset);
      const totalCount = await User.getUserCount();
      const totalPages = Math.ceil(totalCount / limit);

      return {
        users,
        totalCount,
        currentPage: page,
        totalPages
      };
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Failed to retrieve users');
    }
  }

  static async getUserById(userId: string): Promise<User> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  static async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<User> {
    if (!['user', 'admin'].includes(role)) {
      throw new ValidationError('Invalid role. Must be "user" or "admin"');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.role = role;
    return await user.save();
  }

  static async deleteUser(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Start transaction to delete user and related data
    await db.transaction(async (trx) => {
      // Delete user's conversations
      await trx('conversations').where('chatbot_id', 'in', 
        trx('chatbots').select('id').where('user_id', userId)
      ).del();

      // Delete user's chatbots
      await trx('chatbots').where('user_id', userId).del();

      // Delete user's usage stats
      await trx('usage_stats').where('user_id', userId).del();

      // Delete user's profile
      await trx('user_profiles').where('user_id', userId).del();

      // Delete the user
      await trx('users').where('id', userId).del();
    });
  }

  static async getDashboardData(): Promise<AdminDashboardData> {
    try {
      const metrics = await this.getSystemMetrics();
      
      // Get recent users (last 10)
      const recentUsers = await User.findAllUsers(10, 0);

      // Get recent activity (simplified - could be expanded)
      const recentActivity = await db('users')
        .select('id', 'email', 'first_name', 'last_name', 'last_login_at', 'created_at')
        .whereNotNull('last_login_at')
        .orderBy('last_login_at', 'desc')
        .limit(10);

      return {
        metrics,
        recentUsers,
        recentActivity: recentActivity.map(activity => ({
          id: activity.id,
          type: 'login',
          user: {
            email: activity.email,
            name: `${activity.first_name} ${activity.last_name}`
          },
          timestamp: activity.last_login_at,
          description: `User logged in`
        }))
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw new Error('Failed to retrieve dashboard data');
    }
  }

  static async searchUsers(query: string, page: number = 1, limit: number = 50): Promise<UserManagementData> {
    try {
      const offset = (page - 1) * limit;
      
      const users = await db('users')
        .where('email', 'ilike', `%${query}%`)
        .orWhere('first_name', 'ilike', `%${query}%`)
        .orWhere('last_name', 'ilike', `%${query}%`)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const totalCountResult = await db('users')
        .where('email', 'ilike', `%${query}%`)
        .orWhere('first_name', 'ilike', `%${query}%`)
        .orWhere('last_name', 'ilike', `%${query}%`)
        .count('id as count')
        .first();

      const totalCount = parseInt(totalCountResult?.count as string) || 0;
      const totalPages = Math.ceil(totalCount / limit);

      const userObjects = users.map(user => new User({
        id: user.id,
        email: user.email,
        passwordHash: user.password_hash,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        emailVerified: user.email_verified,
        emailVerificationToken: user.email_verification_token,
        passwordResetToken: user.password_reset_token,
        passwordResetExpires: user.password_reset_expires,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }));

      return {
        users: userObjects,
        totalCount,
        currentPage: page,
        totalPages
      };
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }

  static async getSystemHealth(): Promise<{ status: string; checks: any[] }> {
    const checks = [];

    try {
      // Database connectivity check
      await db.raw('SELECT 1');
      checks.push({
        name: 'Database',
        status: 'healthy',
        message: 'Database connection successful'
      });
    } catch (error) {
      checks.push({
        name: 'Database',
        status: 'critical',
        message: 'Database connection failed'
      });
    }

    // Memory usage check (simplified)
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    checks.push({
      name: 'Memory Usage',
      status: memUsageMB > 500 ? 'warning' : 'healthy',
      message: `Heap used: ${memUsageMB}MB`
    });

    // Overall status
    const hasError = checks.some(check => check.status === 'critical');
    const hasWarning = checks.some(check => check.status === 'warning');
    
    let overallStatus = 'healthy';
    if (hasError) overallStatus = 'critical';
    else if (hasWarning) overallStatus = 'warning';

    return {
      status: overallStatus,
      checks
    };
  }
}