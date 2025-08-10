import { Analytics, AnalyticsData, PopularQuery, ResponseCategory } from '../models/Analytics';
import { ConversationMetrics, ConversationMetricsData } from '../models/ConversationMetrics';
import { PerformanceMetrics, PerformanceMetricsData } from '../models/PerformanceMetrics';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { db } from '../database/connection';

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export interface DashboardMetrics {
  totalConversations: number;
  totalMessages: number;
  uniqueUsers: number;
  averageConversationLength: number;
  averageResponseTime: number;
  userSatisfactionScore: number;
  totalRatings: number;
  popularQueries: PopularQuery[];
  responseCategories: ResponseCategory[];
  conversationTrends: { date: string; conversations: number; messages: number }[];
  satisfactionTrends: { date: string; satisfaction: number }[];
  performanceMetrics: {
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    totalRequests: number;
  };
}

export interface ConversationInsights {
  totalConversations: number;
  averageLength: number;
  medianLength: number;
  satisfactionStats: {
    average: number;
    distribution: { [key: number]: number };
    totalRatings: number;
  };
  topIntents: { intent: string; count: number }[];
  topTopics: { topic: string; count: number }[];
  goalAchievementRate: number;
}

export class AnalyticsService {
  // Generate daily analytics for a chatbot
  static async generateDailyAnalytics(chatbotId: string, date: Date): Promise<Analytics> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get conversations for the day
    const conversations = await db('conversations')
      .where({ chatbot_id: chatbotId })
      .whereBetween('started_at', [startOfDay, endOfDay]);

    const conversationIds = conversations.map(c => c.id);
    
    // Get messages for these conversations
    const messages = conversationIds.length > 0 
      ? await db('messages').whereIn('conversation_id', conversationIds)
      : [];

    // Get conversation metrics
    const conversationMetrics = conversationIds.length > 0
      ? await ConversationMetrics.findByChatbotId(chatbotId, 1000, 0, {
          startDate: startOfDay,
          endDate: endOfDay
        })
      : [];

    // Calculate metrics
    const totalConversations = conversations.length;
    const totalMessages = messages.length;
    const uniqueUsers = new Set(conversations.map(c => c.session_id)).size;
    
    const avgConversationLength = totalConversations > 0 
      ? totalMessages / totalConversations 
      : 0;

    // Calculate average response time from conversation metrics
    const metricsWithResponseTime = conversationMetrics.filter(m => m.avgResponseTime && m.avgResponseTime > 0);
    const avgResponseTime = metricsWithResponseTime.length > 0
      ? metricsWithResponseTime.reduce((sum, m) => sum + (m.avgResponseTime || 0), 0) / metricsWithResponseTime.length
      : 0;

    // Calculate satisfaction metrics
    const satisfactionRatings = conversationMetrics
      .filter(m => m.userSatisfaction)
      .map(m => m.userSatisfaction!);
    
    const userSatisfactionScore = satisfactionRatings.length > 0
      ? satisfactionRatings.reduce((sum, rating) => sum + rating, 0) / satisfactionRatings.length
      : 0;

    const totalRatings = satisfactionRatings.length;

    // Generate popular queries (simplified - would need NLP in production)
    const popularQueries = await this.generatePopularQueries(conversationIds);

    // Generate response categories (simplified)
    const responseCategories = await this.generateResponseCategories(conversationIds);

    // Create or update analytics record
    const analyticsData: AnalyticsData = {
      chatbotId,
      date,
      totalConversations,
      totalMessages,
      uniqueUsers,
      avgConversationLength,
      avgResponseTime,
      userSatisfactionScore,
      totalRatings,
      popularQueries,
      responseCategories
    };

    return await Analytics.upsert(analyticsData);
  }

  // Track conversation metrics
  static async trackConversationMetrics(
    conversationId: string,
    chatbotId: string,
    additionalData?: Partial<ConversationMetricsData>
  ): Promise<ConversationMetrics> {
    // Get conversation and its messages
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const messages = await Message.findByConversationId(conversationId);
    const messageCount = messages.length;

    // Calculate duration if conversation is ended
    let durationSeconds: number | undefined;
    if (conversation.endedAt) {
      durationSeconds = (conversation.endedAt.getTime() - conversation.startedAt.getTime()) / 1000;
    }

    // Calculate average response time (simplified - would need actual timing data)
    const avgResponseTime = additionalData?.avgResponseTime || 2.5; // Default placeholder

    const metricsData: ConversationMetricsData = {
      conversationId,
      chatbotId,
      messageCount,
      durationSeconds,
      avgResponseTime,
      ...additionalData
    };

    return await ConversationMetrics.upsert(metricsData);
  }

  // Track performance metrics
  static async trackPerformanceMetrics(
    chatbotId: string,
    responseTime: number,
    additionalData?: Partial<PerformanceMetricsData>
  ): Promise<PerformanceMetrics> {
    const metricsData: PerformanceMetricsData = {
      chatbotId,
      responseTime,
      ...additionalData
    };

    return await PerformanceMetrics.create(metricsData);
  }

  // Get comprehensive dashboard metrics
  static async getDashboardMetrics(
    chatbotId: string,
    timeRange: TimeRange
  ): Promise<DashboardMetrics> {
    // Get aggregated analytics
    const aggregatedAnalytics = await Analytics.getAggregatedAnalytics(
      chatbotId,
      timeRange.startDate,
      timeRange.endDate
    );

    // Get conversation trends (daily breakdown)
    const conversationTrends = await this.getConversationTrends(chatbotId, timeRange);

    // Get satisfaction trends
    const satisfactionTrends = await this.getSatisfactionTrends(chatbotId, timeRange);

    // Get performance metrics
    const performanceMetrics = await PerformanceMetrics.getPerformanceStats(
      chatbotId,
      timeRange.startDate,
      timeRange.endDate
    );

    return {
      totalConversations: aggregatedAnalytics.totalConversations,
      totalMessages: aggregatedAnalytics.totalMessages,
      uniqueUsers: 0, // Would need to calculate from session data
      averageConversationLength: aggregatedAnalytics.avgConversationLength,
      averageResponseTime: aggregatedAnalytics.avgResponseTime,
      userSatisfactionScore: aggregatedAnalytics.avgSatisfactionScore,
      totalRatings: aggregatedAnalytics.totalRatings,
      popularQueries: aggregatedAnalytics.popularQueries,
      responseCategories: aggregatedAnalytics.responseCategories,
      conversationTrends,
      satisfactionTrends,
      performanceMetrics: {
        averageResponseTime: performanceMetrics.averageResponseTime,
        p95ResponseTime: performanceMetrics.p95ResponseTime,
        errorRate: performanceMetrics.errorRate,
        totalRequests: performanceMetrics.totalRequests
      }
    };
  }

  // Get detailed conversation insights
  static async getConversationInsights(
    chatbotId: string,
    timeRange: TimeRange
  ): Promise<ConversationInsights> {
    // Get conversation length stats
    const lengthStats = await ConversationMetrics.getConversationLengthStats(
      chatbotId,
      timeRange.startDate,
      timeRange.endDate
    );

    // Get satisfaction stats
    const satisfactionStats = await ConversationMetrics.getSatisfactionStats(
      chatbotId,
      timeRange.startDate,
      timeRange.endDate
    );

    // Get conversation metrics for analysis
    const conversationMetrics = await ConversationMetrics.findByChatbotId(
      chatbotId,
      1000,
      0,
      {
        startDate: timeRange.startDate,
        endDate: timeRange.endDate
      }
    );

    // Analyze intents
    const intentCounts: { [key: string]: number } = {};
    conversationMetrics.forEach(metric => {
      if (metric.userIntent) {
        intentCounts[metric.userIntent] = (intentCounts[metric.userIntent] || 0) + 1;
      }
    });

    const topIntents = Object.entries(intentCounts)
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Analyze topics
    const topicCounts: { [key: string]: number } = {};
    conversationMetrics.forEach(metric => {
      metric.topicsDiscussed.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });

    const topTopics = Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate goal achievement rate
    const metricsWithGoals = conversationMetrics.filter(m => m.goalAchieved !== undefined);
    const achievedGoals = metricsWithGoals.filter(m => m.goalAchieved).length;
    const goalAchievementRate = metricsWithGoals.length > 0 
      ? (achievedGoals / metricsWithGoals.length) * 100 
      : 0;

    return {
      totalConversations: lengthStats.totalConversations,
      averageLength: lengthStats.averageLength,
      medianLength: lengthStats.medianLength,
      satisfactionStats: {
        average: satisfactionStats.averageSatisfaction,
        distribution: satisfactionStats.satisfactionDistribution,
        totalRatings: satisfactionStats.totalRatings
      },
      topIntents,
      topTopics,
      goalAchievementRate
    };
  }

  // Get conversation trends over time
  private static async getConversationTrends(
    chatbotId: string,
    timeRange: TimeRange
  ): Promise<{ date: string; conversations: number; messages: number }[]> {
    const analytics = await Analytics.findByChatbotId(
      chatbotId,
      timeRange.startDate,
      timeRange.endDate,
      100
    );

    return analytics.map(a => ({
      date: a.date.toISOString().split('T')[0],
      conversations: a.totalConversations,
      messages: a.totalMessages
    }));
  }

  // Get satisfaction trends over time
  private static async getSatisfactionTrends(
    chatbotId: string,
    timeRange: TimeRange
  ): Promise<{ date: string; satisfaction: number }[]> {
    const analytics = await Analytics.findByChatbotId(
      chatbotId,
      timeRange.startDate,
      timeRange.endDate,
      100
    );

    return analytics
      .filter(a => a.userSatisfactionScore > 0)
      .map(a => ({
        date: a.date.toISOString().split('T')[0],
        satisfaction: a.userSatisfactionScore
      }));
  }

  // Generate popular queries (simplified implementation)
  private static async generatePopularQueries(conversationIds: string[]): Promise<PopularQuery[]> {
    if (conversationIds.length === 0) return [];

    // Get user messages from these conversations
    const userMessages = await db('messages')
      .whereIn('conversation_id', conversationIds)
      .where('role', 'user')
      .select('content');

    // Simple word frequency analysis (in production, would use NLP)
    const queryWords: { [key: string]: number } = {};
    
    userMessages.forEach((message: any) => {
      const words = message.content.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((word: string) => word.length > 3); // Filter out short words
      
      words.forEach((word: string) => {
        queryWords[word] = (queryWords[word] || 0) + 1;
      });
    });

    return Object.entries(queryWords)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // Generate response categories (simplified implementation)
  private static async generateResponseCategories(conversationIds: string[]): Promise<ResponseCategory[]> {
    if (conversationIds.length === 0) return [];

    // Get assistant messages from these conversations
    const assistantMessages = await db('messages')
      .whereIn('conversation_id', conversationIds)
      .where('role', 'assistant')
      .select('content');

    const totalMessages = assistantMessages.length;
    
    // Simple categorization based on message content patterns
    const categories = {
      'Informational': 0,
      'Support': 0,
      'Transactional': 0,
      'Conversational': 0,
      'Other': 0
    };

    assistantMessages.forEach((message: any) => {
      const content = message.content.toLowerCase();
      
      if (content.includes('information') || content.includes('details') || content.includes('about')) {
        categories['Informational']++;
      } else if (content.includes('help') || content.includes('support') || content.includes('assist')) {
        categories['Support']++;
      } else if (content.includes('order') || content.includes('purchase') || content.includes('payment')) {
        categories['Transactional']++;
      } else if (content.includes('hello') || content.includes('how are you') || content.includes('thanks')) {
        categories['Conversational']++;
      } else {
        categories['Other']++;
      }
    });

    return Object.entries(categories)
      .map(([category, count]) => ({
        category,
        count,
        percentage: totalMessages > 0 ? (count / totalMessages) * 100 : 0
      }))
      .filter(cat => cat.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  // Batch process analytics for multiple days
  static async batchGenerateAnalytics(
    chatbotId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Analytics[]> {
    const results: Analytics[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      try {
        const analytics = await this.generateDailyAnalytics(chatbotId, new Date(currentDate));
        results.push(analytics);
      } catch (error) {
        console.error(`Failed to generate analytics for ${currentDate.toISOString()}:`, error);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return results;
  }

  // Export analytics data for reporting
  static async exportAnalyticsData(
    chatbotId: string,
    timeRange: TimeRange,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const analytics = await Analytics.findByChatbotId(
      chatbotId,
      timeRange.startDate,
      timeRange.endDate,
      1000
    );

    if (format === 'csv') {
      // Convert to CSV format
      const headers = [
        'Date',
        'Total Conversations',
        'Total Messages',
        'Unique Users',
        'Avg Conversation Length',
        'Avg Response Time',
        'User Satisfaction Score',
        'Total Ratings'
      ];

      const rows = analytics.map(a => [
        a.date.toISOString().split('T')[0],
        a.totalConversations,
        a.totalMessages,
        a.uniqueUsers,
        a.avgConversationLength.toFixed(2),
        a.avgResponseTime.toFixed(2),
        a.userSatisfactionScore.toFixed(2),
        a.totalRatings
      ]);

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    return JSON.stringify(analytics, null, 2);
  }
}