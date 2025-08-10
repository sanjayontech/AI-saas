import Joi from 'joi';
import { db } from '../database/connection';

export interface SentimentScore {
  timestamp: Date;
  score: number; // -1 to 1, where -1 is negative, 0 is neutral, 1 is positive
  confidence: number; // 0 to 1
}

export interface ConversationMetricsData {
  id?: string;
  conversationId: string;
  chatbotId: string;
  messageCount?: number;
  durationSeconds?: number;
  avgResponseTime?: number;
  userSatisfaction?: number;
  userIntent?: string;
  goalAchieved?: boolean;
  sentimentAnalysis?: SentimentScore[];
  topicsDiscussed?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class ConversationMetrics {
  public id?: string;
  public conversationId: string;
  public chatbotId: string;
  public messageCount: number;
  public durationSeconds?: number;
  public avgResponseTime?: number;
  public userSatisfaction?: number;
  public userIntent?: string;
  public goalAchieved?: boolean;
  public sentimentAnalysis: SentimentScore[];
  public topicsDiscussed: string[];
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(data: ConversationMetricsData) {
    this.id = data.id;
    this.conversationId = data.conversationId;
    this.chatbotId = data.chatbotId;
    this.messageCount = data.messageCount || 0;
    this.durationSeconds = data.durationSeconds;
    this.avgResponseTime = data.avgResponseTime;
    this.userSatisfaction = data.userSatisfaction;
    this.userIntent = data.userIntent;
    this.goalAchieved = data.goalAchieved;
    this.sentimentAnalysis = data.sentimentAnalysis || [];
    this.topicsDiscussed = data.topicsDiscussed || [];
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Validation schema
  static getValidationSchema() {
    return {
      create: Joi.object({
        conversationId: Joi.string().uuid().required(),
        chatbotId: Joi.string().uuid().required(),
        messageCount: Joi.number().integer().min(0).optional(),
        durationSeconds: Joi.number().min(0).optional(),
        avgResponseTime: Joi.number().min(0).optional(),
        userSatisfaction: Joi.number().integer().min(1).max(5).optional(),
        userIntent: Joi.string().optional(),
        goalAchieved: Joi.boolean().optional(),
        sentimentAnalysis: Joi.array().items(
          Joi.object({
            timestamp: Joi.date().required(),
            score: Joi.number().min(-1).max(1).required(),
            confidence: Joi.number().min(0).max(1).required()
          })
        ).optional(),
        topicsDiscussed: Joi.array().items(Joi.string()).optional()
      }),
      update: Joi.object({
        messageCount: Joi.number().integer().min(0).optional(),
        durationSeconds: Joi.number().min(0).optional(),
        avgResponseTime: Joi.number().min(0).optional(),
        userSatisfaction: Joi.number().integer().min(1).max(5).optional(),
        userIntent: Joi.string().optional(),
        goalAchieved: Joi.boolean().optional(),
        sentimentAnalysis: Joi.array().items(
          Joi.object({
            timestamp: Joi.date().required(),
            score: Joi.number().min(-1).max(1).required(),
            confidence: Joi.number().min(0).max(1).required()
          })
        ).optional(),
        topicsDiscussed: Joi.array().items(Joi.string()).optional()
      })
    };
  }

  // Helper method to create ConversationMetrics instance from database row
  private static fromDbRow(row: any): ConversationMetrics {
    return new ConversationMetrics({
      id: row.id,
      conversationId: row.conversation_id,
      chatbotId: row.chatbot_id,
      messageCount: row.message_count,
      durationSeconds: row.duration_seconds ? parseFloat(row.duration_seconds) : undefined,
      avgResponseTime: row.avg_response_time ? parseFloat(row.avg_response_time) : undefined,
      userSatisfaction: row.user_satisfaction || undefined,
      userIntent: row.user_intent || undefined,
      goalAchieved: row.goal_achieved === null ? undefined : Boolean(row.goal_achieved),
      sentimentAnalysis: row.sentiment_analysis ? JSON.parse(row.sentiment_analysis) : [],
      topicsDiscussed: row.topics_discussed ? JSON.parse(row.topics_discussed) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  // Database operations
  static async create(metricsData: ConversationMetricsData): Promise<ConversationMetrics> {
    const [metrics] = await db('conversation_metrics')
      .insert({
        conversation_id: metricsData.conversationId,
        chatbot_id: metricsData.chatbotId,
        message_count: metricsData.messageCount || 0,
        duration_seconds: metricsData.durationSeconds,
        avg_response_time: metricsData.avgResponseTime,
        user_satisfaction: metricsData.userSatisfaction,
        user_intent: metricsData.userIntent,
        goal_achieved: metricsData.goalAchieved,
        sentiment_analysis: metricsData.sentimentAnalysis ? JSON.stringify(metricsData.sentimentAnalysis) : null,
        topics_discussed: metricsData.topicsDiscussed ? JSON.stringify(metricsData.topicsDiscussed) : null
      })
      .returning('*');

    return ConversationMetrics.fromDbRow(metrics);
  }

  static async findById(id: string): Promise<ConversationMetrics | null> {
    const metrics = await db('conversation_metrics').where({ id }).first();
    
    if (!metrics) return null;

    return ConversationMetrics.fromDbRow(metrics);
  }

  static async findByConversationId(conversationId: string): Promise<ConversationMetrics | null> {
    const metrics = await db('conversation_metrics')
      .where({ conversation_id: conversationId })
      .first();
    
    if (!metrics) return null;

    return ConversationMetrics.fromDbRow(metrics);
  }

  static async findByChatbotId(
    chatbotId: string,
    limit: number = 50,
    offset: number = 0,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      minSatisfaction?: number;
      maxSatisfaction?: number;
      userIntent?: string;
      goalAchieved?: boolean;
    }
  ): Promise<ConversationMetrics[]> {
    let query = db('conversation_metrics')
      .where({ chatbot_id: chatbotId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (filters) {
      if (filters.startDate) {
        query = query.where('created_at', '>=', filters.startDate);
      }
      if (filters.endDate) {
        query = query.where('created_at', '<=', filters.endDate);
      }
      if (filters.minSatisfaction) {
        query = query.where('user_satisfaction', '>=', filters.minSatisfaction);
      }
      if (filters.maxSatisfaction) {
        query = query.where('user_satisfaction', '<=', filters.maxSatisfaction);
      }
      if (filters.userIntent) {
        query = query.where('user_intent', filters.userIntent);
      }
      if (filters.goalAchieved !== undefined) {
        query = query.where('goal_achieved', filters.goalAchieved);
      }
    }

    const metricsArray = await query;
    
    return metricsArray.map(metrics => ConversationMetrics.fromDbRow(metrics));
  }

  async save(): Promise<ConversationMetrics> {
    const [updatedMetrics] = await db('conversation_metrics')
      .where({ id: this.id })
      .update({
        message_count: this.messageCount,
        duration_seconds: this.durationSeconds,
        avg_response_time: this.avgResponseTime,
        user_satisfaction: this.userSatisfaction,
        user_intent: this.userIntent,
        goal_achieved: this.goalAchieved,
        sentiment_analysis: JSON.stringify(this.sentimentAnalysis),
        topics_discussed: JSON.stringify(this.topicsDiscussed),
        updated_at: new Date()
      })
      .returning('*');

    return ConversationMetrics.fromDbRow(updatedMetrics);
  }

  // Create or update metrics for a conversation
  static async upsert(metricsData: ConversationMetricsData): Promise<ConversationMetrics> {
    const existing = await ConversationMetrics.findByConversationId(metricsData.conversationId);
    
    if (existing) {
      // Update existing record
      existing.messageCount = metricsData.messageCount || existing.messageCount;
      existing.durationSeconds = metricsData.durationSeconds || existing.durationSeconds;
      existing.avgResponseTime = metricsData.avgResponseTime || existing.avgResponseTime;
      existing.userSatisfaction = metricsData.userSatisfaction || existing.userSatisfaction;
      existing.userIntent = metricsData.userIntent || existing.userIntent;
      existing.goalAchieved = metricsData.goalAchieved !== undefined ? metricsData.goalAchieved : existing.goalAchieved;
      existing.sentimentAnalysis = metricsData.sentimentAnalysis || existing.sentimentAnalysis;
      existing.topicsDiscussed = metricsData.topicsDiscussed || existing.topicsDiscussed;
      
      return await existing.save();
    } else {
      // Create new record
      return await ConversationMetrics.create(metricsData);
    }
  }

  // Get satisfaction statistics for a chatbot
  static async getSatisfactionStats(chatbotId: string, startDate?: Date, endDate?: Date): Promise<{
    averageSatisfaction: number;
    totalRatings: number;
    satisfactionDistribution: { [key: number]: number };
  }> {
    let query = db('conversation_metrics')
      .where({ chatbot_id: chatbotId })
      .whereNotNull('user_satisfaction');

    if (startDate) {
      query = query.where('created_at', '>=', startDate);
    }
    if (endDate) {
      query = query.where('created_at', '<=', endDate);
    }

    const results = await query.select('user_satisfaction');
    
    const totalRatings = results.length;
    const satisfactionDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalScore = 0;

    results.forEach(result => {
      const satisfaction = result.user_satisfaction;
      satisfactionDistribution[satisfaction] = (satisfactionDistribution[satisfaction] || 0) + 1;
      totalScore += satisfaction;
    });

    return {
      averageSatisfaction: totalRatings > 0 ? totalScore / totalRatings : 0,
      totalRatings,
      satisfactionDistribution
    };
  }

  // Get conversation length statistics
  static async getConversationLengthStats(chatbotId: string, startDate?: Date, endDate?: Date): Promise<{
    averageLength: number;
    medianLength: number;
    totalConversations: number;
  }> {
    let query = db('conversation_metrics')
      .where({ chatbot_id: chatbotId });

    if (startDate) {
      query = query.where('created_at', '>=', startDate);
    }
    if (endDate) {
      query = query.where('created_at', '<=', endDate);
    }

    const results = await query.select('message_count').orderBy('message_count');
    
    const totalConversations = results.length;
    const messageCounts = results.map(r => r.message_count);
    
    const averageLength = totalConversations > 0 
      ? messageCounts.reduce((sum, count) => sum + count, 0) / totalConversations 
      : 0;
    
    const medianLength = totalConversations > 0
      ? messageCounts[Math.floor(totalConversations / 2)]
      : 0;

    return {
      averageLength,
      medianLength,
      totalConversations
    };
  }
}