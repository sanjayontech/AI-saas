import { Request, Response } from 'express';
import { AnalyticsService, TimeRange } from '../services/AnalyticsService';
import { Analytics } from '../models/Analytics';
import { ConversationMetrics } from '../models/ConversationMetrics';
import { PerformanceMetrics } from '../models/PerformanceMetrics';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { ValidationError, NotFoundError, AuthorizationError } from '../utils/errors';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../database/connection';

export class AnalyticsController {
  // Get dashboard metrics for a chatbot
  static async getDashboardMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { chatbotId } = req.params;
      const { startDate, endDate, period = '30d' } = req.query;

      // Verify chatbot ownership
      const chatbot = await db('chatbots')
        .where({ id: chatbotId, user_id: req.user!.id })
        .first();

      if (!chatbot) {
        throw new NotFoundError('Chatbot not found or access denied');
      }

      // Parse time range
      let timeRange: TimeRange;
      if (startDate && endDate) {
        timeRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      } else {
        // Default time ranges based on period
        const end = new Date();
        const start = new Date();
        
        switch (period) {
          case '7d':
            start.setDate(end.getDate() - 7);
            break;
          case '30d':
            start.setDate(end.getDate() - 30);
            break;
          case '90d':
            start.setDate(end.getDate() - 90);
            break;
          case '1y':
            start.setFullYear(end.getFullYear() - 1);
            break;
          default:
            start.setDate(end.getDate() - 30);
        }
        
        timeRange = { startDate: start, endDate: end };
      }

      const metrics = await AnalyticsService.getDashboardMetrics(chatbotId, timeRange);

      res.status(200).json({
        success: true,
        data: {
          chatbotId,
          timeRange,
          metrics
        }
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CHATBOT_NOT_FOUND',
            message: error.message
          }
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
      } else {
        console.error('Error getting dashboard metrics:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve dashboard metrics'
          }
        });
      }
    }
  }

  // Get conversation insights
  static async getConversationInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { chatbotId } = req.params;
      const { startDate, endDate, period = '30d' } = req.query;

      // Verify chatbot ownership
      const chatbot = await db('chatbots')
        .where({ id: chatbotId, user_id: req.user!.id })
        .first();

      if (!chatbot) {
        throw new NotFoundError('Chatbot not found or access denied');
      }

      // Parse time range
      let timeRange: TimeRange;
      if (startDate && endDate) {
        timeRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      } else {
        const end = new Date();
        const start = new Date();
        
        switch (period) {
          case '7d':
            start.setDate(end.getDate() - 7);
            break;
          case '30d':
            start.setDate(end.getDate() - 30);
            break;
          case '90d':
            start.setDate(end.getDate() - 90);
            break;
          case '1y':
            start.setFullYear(end.getFullYear() - 1);
            break;
          default:
            start.setDate(end.getDate() - 30);
        }
        
        timeRange = { startDate: start, endDate: end };
      }

      const insights = await AnalyticsService.getConversationInsights(chatbotId, timeRange);

      res.status(200).json({
        success: true,
        data: {
          chatbotId,
          timeRange,
          insights
        }
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CHATBOT_NOT_FOUND',
            message: error.message
          }
        });
      } else {
        console.error('Error getting conversation insights:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve conversation insights'
          }
        });
      }
    }
  }

  // Get conversation history with search and filtering
  static async getConversationHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { chatbotId } = req.params;
      const { 
        page = '1', 
        limit = '20', 
        search, 
        startDate, 
        endDate,
        minSatisfaction,
        maxSatisfaction,
        sortBy = 'started_at',
        sortOrder = 'desc'
      } = req.query;

      // Verify chatbot ownership
      const chatbot = await db('chatbots')
        .where({ id: chatbotId, user_id: req.user!.id })
        .first();

      if (!chatbot) {
        throw new NotFoundError('Chatbot not found or access denied');
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Build query for conversations
      let query = db('conversations')
        .where({ chatbot_id: chatbotId })
        .orderBy(sortBy as string, sortOrder as 'asc' | 'desc')
        .limit(limitNum)
        .offset(offset);

      // Apply filters
      if (startDate) {
        query = query.where('started_at', '>=', new Date(startDate as string));
      }
      if (endDate) {
        query = query.where('started_at', '<=', new Date(endDate as string));
      }

      const conversations = await query;

      // Get conversation metrics for satisfaction filtering
      const conversationIds = conversations.map(c => c.id);
      let conversationMetrics: any[] = [];
      
      if (conversationIds.length > 0) {
        let metricsQuery = db('conversation_metrics')
          .whereIn('conversation_id', conversationIds);

        if (minSatisfaction) {
          metricsQuery = metricsQuery.where('user_satisfaction', '>=', parseFloat(minSatisfaction as string));
        }
        if (maxSatisfaction) {
          metricsQuery = metricsQuery.where('user_satisfaction', '<=', parseFloat(maxSatisfaction as string));
        }

        conversationMetrics = await metricsQuery;
      }

      // Filter conversations based on satisfaction if specified
      let filteredConversations = conversations;
      if (minSatisfaction || maxSatisfaction) {
        const satisfactionConversationIds = new Set(conversationMetrics.map(m => m.conversation_id));
        filteredConversations = conversations.filter(c => satisfactionConversationIds.has(c.id));
      }

      // Get messages for search functionality
      if (search && filteredConversations.length > 0) {
        const searchConversationIds = await db('messages')
          .whereIn('conversation_id', filteredConversations.map(c => c.id))
          .where('content', 'ilike', `%${search}%`)
          .distinct('conversation_id')
          .pluck('conversation_id');

        filteredConversations = filteredConversations.filter(c => 
          searchConversationIds.includes(c.id)
        );
      }

      // Get messages for each conversation
      const conversationsWithMessages = await Promise.all(
        filteredConversations.map(async (conversation) => {
          const messages = await Message.findByConversationId(conversation.id);
          const metrics = conversationMetrics.find(m => m.conversation_id === conversation.id);
          
          return {
            id: conversation.id,
            sessionId: conversation.session_id,
            startedAt: conversation.started_at,
            endedAt: conversation.ended_at,
            userInfo: conversation.user_info ? JSON.parse(conversation.user_info) : null,
            messages: messages.map(m => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
              metadata: m.metadata
            })),
            metrics: metrics ? {
              messageCount: metrics.message_count,
              durationSeconds: metrics.duration_seconds,
              avgResponseTime: metrics.avg_response_time,
              userSatisfaction: metrics.user_satisfaction,
              userIntent: metrics.user_intent,
              topicsDiscussed: metrics.topics_discussed || [],
              goalAchieved: metrics.goal_achieved
            } : null
          };
        })
      );

      // Get total count for pagination
      let countQuery = db('conversations')
        .where({ chatbot_id: chatbotId })
        .count('* as count');

      if (startDate) {
        countQuery = countQuery.where('started_at', '>=', new Date(startDate as string));
      }
      if (endDate) {
        countQuery = countQuery.where('started_at', '<=', new Date(endDate as string));
      }

      const [{ count }] = await countQuery;
      const totalCount = parseInt(count as string);

      res.status(200).json({
        success: true,
        data: {
          conversations: conversationsWithMessages,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            pages: Math.ceil(totalCount / limitNum)
          },
          filters: {
            search,
            startDate,
            endDate,
            minSatisfaction,
            maxSatisfaction,
            sortBy,
            sortOrder
          }
        }
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CHATBOT_NOT_FOUND',
            message: error.message
          }
        });
      } else {
        console.error('Error getting conversation history:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve conversation history'
          }
        });
      }
    }
  }

  // Get performance insights
  static async getPerformanceInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { chatbotId } = req.params;
      const { startDate, endDate, period = '30d' } = req.query;

      // Verify chatbot ownership
      const chatbot = await db('chatbots')
        .where({ id: chatbotId, user_id: req.user!.id })
        .first();

      if (!chatbot) {
        throw new NotFoundError('Chatbot not found or access denied');
      }

      // Parse time range
      let timeRange: TimeRange;
      if (startDate && endDate) {
        timeRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      } else {
        const end = new Date();
        const start = new Date();
        
        switch (period) {
          case '7d':
            start.setDate(end.getDate() - 7);
            break;
          case '30d':
            start.setDate(end.getDate() - 30);
            break;
          case '90d':
            start.setDate(end.getDate() - 90);
            break;
          case '1y':
            start.setFullYear(end.getFullYear() - 1);
            break;
          default:
            start.setDate(end.getDate() - 30);
        }
        
        timeRange = { startDate: start, endDate: end };
      }

      const performanceStats = await PerformanceMetrics.getPerformanceStats(
        chatbotId,
        timeRange.startDate,
        timeRange.endDate
      );

      // Get performance trends over time
      const performanceTrends = await PerformanceMetrics.getPerformanceTrends(
        chatbotId,
        timeRange.startDate,
        timeRange.endDate
      );

      res.status(200).json({
        success: true,
        data: {
          chatbotId,
          timeRange,
          performanceStats,
          performanceTrends
        }
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CHATBOT_NOT_FOUND',
            message: error.message
          }
        });
      } else {
        console.error('Error getting performance insights:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve performance insights'
          }
        });
      }
    }
  }

  // Export analytics data
  static async exportAnalyticsData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { chatbotId } = req.params;
      const { startDate, endDate, format = 'json' } = req.query;

      // Verify chatbot ownership
      const chatbot = await db('chatbots')
        .where({ id: chatbotId, user_id: req.user!.id })
        .first();

      if (!chatbot) {
        throw new NotFoundError('Chatbot not found or access denied');
      }

      if (!startDate || !endDate) {
        throw new ValidationError('Start date and end date are required for export');
      }

      const timeRange: TimeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      };

      const exportData = await AnalyticsService.exportAnalyticsData(
        chatbotId,
        timeRange,
        format as 'json' | 'csv'
      );

      const filename = `analytics-${chatbotId}-${timeRange.startDate.toISOString().split('T')[0]}-${timeRange.endDate.toISOString().split('T')[0]}.${format}`;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      
      res.status(200).send(exportData);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CHATBOT_NOT_FOUND',
            message: error.message
          }
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
      } else {
        console.error('Error exporting analytics data:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to export analytics data'
          }
        });
      }
    }
  }

  // Generate analytics for a specific date range
  static async generateAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { chatbotId } = req.params;
      const { startDate, endDate } = req.body;

      // Verify chatbot ownership
      const chatbot = await db('chatbots')
        .where({ id: chatbotId, user_id: req.user!.id })
        .first();

      if (!chatbot) {
        throw new NotFoundError('Chatbot not found or access denied');
      }

      if (!startDate || !endDate) {
        throw new ValidationError('Start date and end date are required');
      }

      const analytics = await AnalyticsService.batchGenerateAnalytics(
        chatbotId,
        new Date(startDate),
        new Date(endDate)
      );

      res.status(200).json({
        success: true,
        data: {
          chatbotId,
          generatedAnalytics: analytics.length,
          analytics: analytics.map(a => ({
            date: a.date,
            totalConversations: a.totalConversations,
            totalMessages: a.totalMessages,
            uniqueUsers: a.uniqueUsers,
            avgConversationLength: a.avgConversationLength,
            avgResponseTime: a.avgResponseTime,
            userSatisfactionScore: a.userSatisfactionScore
          }))
        }
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CHATBOT_NOT_FOUND',
            message: error.message
          }
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
      } else {
        console.error('Error generating analytics:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to generate analytics'
          }
        });
      }
    }
  }

  // Get analytics summary for all user's chatbots
  static async getUserAnalyticsSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { period = '30d' } = req.query;

      // Get user's chatbots
      const chatbots = await db('chatbots')
        .where({ user_id: userId })
        .select('id', 'name');

      if (chatbots.length === 0) {
        res.status(200).json({
          success: true,
          data: {
            summary: {
              totalChatbots: 0,
              totalConversations: 0,
              totalMessages: 0,
              avgSatisfactionScore: 0
            },
            chatbotSummaries: []
          }
        });
        return;
      }

      // Parse time range
      const end = new Date();
      const start = new Date();
      
      switch (period) {
        case '7d':
          start.setDate(end.getDate() - 7);
          break;
        case '30d':
          start.setDate(end.getDate() - 30);
          break;
        case '90d':
          start.setDate(end.getDate() - 90);
          break;
        case '1y':
          start.setFullYear(end.getFullYear() - 1);
          break;
        default:
          start.setDate(end.getDate() - 30);
      }

      const timeRange = { startDate: start, endDate: end };

      // Get analytics for each chatbot
      const chatbotSummaries = await Promise.all(
        chatbots.map(async (chatbot) => {
          try {
            const metrics = await AnalyticsService.getDashboardMetrics(chatbot.id, timeRange);
            return {
              chatbotId: chatbot.id,
              chatbotName: chatbot.name,
              totalConversations: metrics.totalConversations,
              totalMessages: metrics.totalMessages,
              averageResponseTime: metrics.averageResponseTime,
              userSatisfactionScore: metrics.userSatisfactionScore,
              totalRatings: metrics.totalRatings
            };
          } catch (error) {
            console.error(`Error getting metrics for chatbot ${chatbot.id}:`, error);
            return {
              chatbotId: chatbot.id,
              chatbotName: chatbot.name,
              totalConversations: 0,
              totalMessages: 0,
              averageResponseTime: 0,
              userSatisfactionScore: 0,
              totalRatings: 0
            };
          }
        })
      );

      // Calculate overall summary
      const summary = {
        totalChatbots: chatbots.length,
        totalConversations: chatbotSummaries.reduce((sum, s) => sum + s.totalConversations, 0),
        totalMessages: chatbotSummaries.reduce((sum, s) => sum + s.totalMessages, 0),
        avgSatisfactionScore: chatbotSummaries.length > 0 
          ? chatbotSummaries.reduce((sum, s) => sum + s.userSatisfactionScore, 0) / chatbotSummaries.length
          : 0
      };

      res.status(200).json({
        success: true,
        data: {
          timeRange,
          summary,
          chatbotSummaries
        }
      });
    } catch (error) {
      console.error('Error getting user analytics summary:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve analytics summary'
        }
      });
    }
  }
}