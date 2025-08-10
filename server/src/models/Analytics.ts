import Joi from 'joi';
import { db } from '../database/connection';

// Helper function to safely parse JSON
function safeJsonParse(jsonString: string | null, defaultValue: any = []): any {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString);
  } catch {
    return defaultValue;
  }
}

export interface PopularQuery {
  query: string;
  count: number;
}

export interface ResponseCategory {
  category: string;
  count: number;
  percentage: number;
}

export interface AnalyticsData {
  id?: string;
  chatbotId: string;
  date: Date;
  totalConversations?: number;
  totalMessages?: number;
  uniqueUsers?: number;
  avgConversationLength?: number;
  avgResponseTime?: number;
  userSatisfactionScore?: number;
  totalRatings?: number;
  popularQueries?: PopularQuery[];
  responseCategories?: ResponseCategory[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class Analytics {
  public id?: string;
  public chatbotId: string;
  public date: Date;
  public totalConversations: number;
  public totalMessages: number;
  public uniqueUsers: number;
  public avgConversationLength: number;
  public avgResponseTime: number;
  public userSatisfactionScore: number;
  public totalRatings: number;
  public popularQueries: PopularQuery[];
  public responseCategories: ResponseCategory[];
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(data: AnalyticsData) {
    this.id = data.id;
    this.chatbotId = data.chatbotId;
    this.date = data.date;
    this.totalConversations = data.totalConversations || 0;
    this.totalMessages = data.totalMessages || 0;
    this.uniqueUsers = data.uniqueUsers || 0;
    this.avgConversationLength = data.avgConversationLength || 0;
    this.avgResponseTime = data.avgResponseTime || 0;
    this.userSatisfactionScore = data.userSatisfactionScore || 0;
    this.totalRatings = data.totalRatings || 0;
    this.popularQueries = data.popularQueries || [];
    this.responseCategories = data.responseCategories || [];
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Validation schema
  static getValidationSchema() {
    return {
      create: Joi.object({
        chatbotId: Joi.string().uuid().required(),
        date: Joi.date().required(),
        totalConversations: Joi.number().integer().min(0).optional(),
        totalMessages: Joi.number().integer().min(0).optional(),
        uniqueUsers: Joi.number().integer().min(0).optional(),
        avgConversationLength: Joi.number().min(0).optional(),
        avgResponseTime: Joi.number().min(0).optional(),
        userSatisfactionScore: Joi.number().integer().min(0).max(5).optional(),
        totalRatings: Joi.number().integer().min(0).optional(),
        popularQueries: Joi.array().items(
          Joi.object({
            query: Joi.string().required(),
            count: Joi.number().integer().min(0).required()
          })
        ).optional(),
        responseCategories: Joi.array().items(
          Joi.object({
            category: Joi.string().required(),
            count: Joi.number().integer().min(0).required(),
            percentage: Joi.number().min(0).max(100).required()
          })
        ).optional()
      })
    };
  }

  // Helper method to create Analytics instance from database row
  private static fromDbRow(row: any): Analytics {
    return new Analytics({
      id: row.id,
      chatbotId: row.chatbot_id,
      date: typeof row.date === 'string' ? new Date(row.date) : row.date,
      totalConversations: row.total_conversations || 0,
      totalMessages: row.total_messages || 0,
      uniqueUsers: row.unique_users || 0,
      avgConversationLength: parseFloat(row.avg_conversation_length || 0),
      avgResponseTime: parseFloat(row.avg_response_time || 0),
      userSatisfactionScore: row.user_satisfaction_score || 0,
      totalRatings: row.total_ratings || 0,
      popularQueries: safeJsonParse(row.popular_queries, []),
      responseCategories: safeJsonParse(row.response_categories, []),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  // Database operations
  static async create(analyticsData: AnalyticsData): Promise<Analytics> {
    const [analytics] = await db('analytics')
      .insert({
        chatbot_id: analyticsData.chatbotId,
        date: analyticsData.date.toISOString().split('T')[0], // Ensure consistent date format
        total_conversations: analyticsData.totalConversations || 0,
        total_messages: analyticsData.totalMessages || 0,
        unique_users: analyticsData.uniqueUsers || 0,
        avg_conversation_length: analyticsData.avgConversationLength || 0,
        avg_response_time: analyticsData.avgResponseTime || 0,
        user_satisfaction_score: analyticsData.userSatisfactionScore || 0,
        total_ratings: analyticsData.totalRatings || 0,
        popular_queries: analyticsData.popularQueries ? JSON.stringify(analyticsData.popularQueries) : '[]',
        response_categories: analyticsData.responseCategories ? JSON.stringify(analyticsData.responseCategories) : null
      })
      .returning('*');

    return Analytics.fromDbRow(analytics);
  }

  static async findById(id: string): Promise<Analytics | null> {
    const analytics = await db('analytics').where({ id }).first();
    
    if (!analytics) return null;

    return Analytics.fromDbRow(analytics);
  }

  static async findByChatbotAndDate(chatbotId: string, date: Date): Promise<Analytics | null> {
    // Format date to YYYY-MM-DD for consistent comparison
    const dateStr = date.toISOString().split('T')[0];
    
    const analytics = await db('analytics')
      .where({ chatbot_id: chatbotId })
      .whereRaw('DATE(date) = ?', [dateStr])
      .first();
    
    if (!analytics) return null;

    return Analytics.fromDbRow(analytics);
  }

  static async findByChatbotId(
    chatbotId: string, 
    startDate?: Date, 
    endDate?: Date,
    limit: number = 30
  ): Promise<Analytics[]> {
    let query = db('analytics')
      .where({ chatbot_id: chatbotId })
      .orderBy('date', 'desc')
      .limit(limit);

    if (startDate) {
      query = query.where('date', '>=', startDate.toISOString().split('T')[0]);
    }

    if (endDate) {
      query = query.where('date', '<=', endDate.toISOString().split('T')[0]);
    }

    const analyticsArray = await query;
    
    return analyticsArray.map(analytics => Analytics.fromDbRow(analytics));
  }

  async save(): Promise<Analytics> {
    const [updatedAnalytics] = await db('analytics')
      .where({ id: this.id })
      .update({
        total_conversations: this.totalConversations,
        total_messages: this.totalMessages,
        unique_users: this.uniqueUsers,
        avg_conversation_length: this.avgConversationLength,
        avg_response_time: this.avgResponseTime,
        user_satisfaction_score: this.userSatisfactionScore,
        total_ratings: this.totalRatings,
        popular_queries: JSON.stringify(this.popularQueries),
        response_categories: JSON.stringify(this.responseCategories),
        updated_at: new Date()
      })
      .returning('*');

    return Analytics.fromDbRow(updatedAnalytics);
  }

  // Create or update analytics for a specific date
  static async upsert(analyticsData: AnalyticsData): Promise<Analytics> {
    const existing = await Analytics.findByChatbotAndDate(analyticsData.chatbotId, analyticsData.date);
    
    if (existing) {
      // Update existing record
      existing.totalConversations = analyticsData.totalConversations || existing.totalConversations;
      existing.totalMessages = analyticsData.totalMessages || existing.totalMessages;
      existing.uniqueUsers = analyticsData.uniqueUsers || existing.uniqueUsers;
      existing.avgConversationLength = analyticsData.avgConversationLength || existing.avgConversationLength;
      existing.avgResponseTime = analyticsData.avgResponseTime || existing.avgResponseTime;
      existing.userSatisfactionScore = analyticsData.userSatisfactionScore || existing.userSatisfactionScore;
      existing.totalRatings = analyticsData.totalRatings || existing.totalRatings;
      existing.popularQueries = analyticsData.popularQueries || existing.popularQueries;
      existing.responseCategories = analyticsData.responseCategories || existing.responseCategories;
      
      return await existing.save();
    } else {
      // Create new record
      return await Analytics.create(analyticsData);
    }
  }

  // Get aggregated analytics for a chatbot over a date range
  static async getAggregatedAnalytics(
    chatbotId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalConversations: number;
    totalMessages: number;
    avgConversationLength: number;
    avgResponseTime: number;
    avgSatisfactionScore: number;
    totalRatings: number;
    popularQueries: PopularQuery[];
    responseCategories: ResponseCategory[];
  }> {
    const analytics = await db('analytics')
      .where({ chatbot_id: chatbotId })
      .whereBetween('date', [
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ])
      .select(
        db.raw('SUM(total_conversations) as total_conversations'),
        db.raw('SUM(total_messages) as total_messages'),
        db.raw('AVG(avg_conversation_length) as avg_conversation_length'),
        db.raw('AVG(avg_response_time) as avg_response_time'),
        db.raw('AVG(user_satisfaction_score) as avg_satisfaction_score'),
        db.raw('SUM(total_ratings) as total_ratings')
      )
      .first();

    // Get popular queries and response categories (would need more complex aggregation)
    const popularQueries: PopularQuery[] = [];
    const responseCategories: ResponseCategory[] = [];

    return {
      totalConversations: parseInt(analytics?.total_conversations) || 0,
      totalMessages: parseInt(analytics?.total_messages) || 0,
      avgConversationLength: parseFloat(analytics?.avg_conversation_length) || 0,
      avgResponseTime: parseFloat(analytics?.avg_response_time) || 0,
      avgSatisfactionScore: parseFloat(analytics?.avg_satisfaction_score) || 0,
      totalRatings: parseInt(analytics?.total_ratings) || 0,
      popularQueries,
      responseCategories
    };
  }
}