import { db } from '../database/connection';

export interface UsageStatsData {
  id?: string;
  userId: string;
  messagesThisMonth?: number;
  totalMessages?: number;
  chatbotsCreated?: number;
  storageUsed?: number;
  lastActive?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UsageStats {
  public id?: string;
  public userId: string;
  public messagesThisMonth: number;
  public totalMessages: number;
  public chatbotsCreated: number;
  public storageUsed: number; // in bytes
  public lastActive?: Date;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(data: UsageStatsData) {
    this.id = data.id;
    this.userId = data.userId;
    this.messagesThisMonth = data.messagesThisMonth || 0;
    this.totalMessages = data.totalMessages || 0;
    this.chatbotsCreated = data.chatbotsCreated || 0;
    this.storageUsed = data.storageUsed || 0;
    this.lastActive = data.lastActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Database operations
  static async create(statsData: UsageStatsData): Promise<UsageStats> {
    const [stats] = await db('usage_stats')
      .insert({
        user_id: statsData.userId,
        messages_this_month: statsData.messagesThisMonth || 0,
        total_messages: statsData.totalMessages || 0,
        chatbots_created: statsData.chatbotsCreated || 0,
        storage_used: statsData.storageUsed || 0,
        last_active: statsData.lastActive
      })
      .returning('*');

    return new UsageStats({
      id: stats.id,
      userId: stats.user_id,
      messagesThisMonth: stats.messages_this_month,
      totalMessages: stats.total_messages,
      chatbotsCreated: stats.chatbots_created,
      storageUsed: stats.storage_used,
      lastActive: stats.last_active,
      createdAt: stats.created_at,
      updatedAt: stats.updated_at
    });
  }

  static async findByUserId(userId: string): Promise<UsageStats | null> {
    const stats = await db('usage_stats').where({ user_id: userId }).first();
    
    if (!stats) return null;

    return new UsageStats({
      id: stats.id,
      userId: stats.user_id,
      messagesThisMonth: stats.messages_this_month,
      totalMessages: stats.total_messages,
      chatbotsCreated: stats.chatbots_created,
      storageUsed: stats.storage_used,
      lastActive: stats.last_active,
      createdAt: stats.created_at,
      updatedAt: stats.updated_at
    });
  }

  static async findById(id: string): Promise<UsageStats | null> {
    const stats = await db('usage_stats').where({ id }).first();
    
    if (!stats) return null;

    return new UsageStats({
      id: stats.id,
      userId: stats.user_id,
      messagesThisMonth: stats.messages_this_month,
      totalMessages: stats.total_messages,
      chatbotsCreated: stats.chatbots_created,
      storageUsed: stats.storage_used,
      lastActive: stats.last_active,
      createdAt: stats.created_at,
      updatedAt: stats.updated_at
    });
  }

  async save(): Promise<UsageStats> {
    const [updatedStats] = await db('usage_stats')
      .where({ id: this.id })
      .update({
        messages_this_month: this.messagesThisMonth,
        total_messages: this.totalMessages,
        chatbots_created: this.chatbotsCreated,
        storage_used: this.storageUsed,
        last_active: this.lastActive,
        updated_at: new Date()
      })
      .returning('*');

    return new UsageStats({
      id: updatedStats.id,
      userId: updatedStats.user_id,
      messagesThisMonth: updatedStats.messages_this_month,
      totalMessages: updatedStats.total_messages,
      chatbotsCreated: updatedStats.chatbots_created,
      storageUsed: updatedStats.storage_used,
      lastActive: updatedStats.last_active,
      createdAt: updatedStats.created_at,
      updatedAt: updatedStats.updated_at
    });
  }

  async delete(): Promise<void> {
    await db('usage_stats').where({ id: this.id }).del();
  }

  // Create stats for user if they don't exist
  static async findOrCreateByUserId(userId: string): Promise<UsageStats> {
    let stats = await UsageStats.findByUserId(userId);
    
    if (!stats) {
      stats = await UsageStats.create({ userId });
    }
    
    return stats;
  }

  // Increment message count
  async incrementMessageCount(): Promise<UsageStats> {
    this.messagesThisMonth += 1;
    this.totalMessages += 1;
    this.lastActive = new Date();
    return this.save();
  }

  // Increment chatbot count
  async incrementChatbotCount(): Promise<UsageStats> {
    this.chatbotsCreated += 1;
    this.lastActive = new Date();
    return this.save();
  }

  // Update storage usage
  async updateStorageUsed(bytes: number): Promise<UsageStats> {
    this.storageUsed = bytes;
    this.lastActive = new Date();
    return this.save();
  }

  // Update last active timestamp
  async updateLastActive(): Promise<UsageStats> {
    this.lastActive = new Date();
    return this.save();
  }

  // Reset monthly message count (to be called monthly)
  async resetMonthlyCount(): Promise<UsageStats> {
    this.messagesThisMonth = 0;
    return this.save();
  }

  // Get all users' usage stats for admin purposes
  static async getAllUsageStats(limit?: number, offset?: number): Promise<UsageStats[]> {
    const query = db('usage_stats')
      .orderBy('total_messages', 'desc');
    
    if (limit) {
      query.limit(limit);
    }
    
    if (offset) {
      query.offset(offset);
    }
    
    const statsArray = await query;
    
    return statsArray.map(stats => new UsageStats({
      id: stats.id,
      userId: stats.user_id,
      messagesThisMonth: stats.messages_this_month,
      totalMessages: stats.total_messages,
      chatbotsCreated: stats.chatbots_created,
      storageUsed: stats.storage_used,
      lastActive: stats.last_active,
      createdAt: stats.created_at,
      updatedAt: stats.updated_at
    }));
  }
}