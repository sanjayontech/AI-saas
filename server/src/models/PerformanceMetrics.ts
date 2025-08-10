import Joi from 'joi';
import { db } from '../database/connection';

export interface PerformanceMetricsData {
  id?: string;
  chatbotId: string;
  timestamp?: Date;
  responseTime: number;
  tokenUsage?: number;
  modelVersion?: string;
  endpoint?: string;
  statusCode?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PerformanceMetrics {
  public id?: string;
  public chatbotId: string;
  public timestamp: Date;
  public responseTime: number;
  public tokenUsage: number;
  public modelVersion?: string;
  public endpoint?: string;
  public statusCode: number;
  public errorMessage?: string;
  public metadata: Record<string, any>;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(data: PerformanceMetricsData) {
    this.id = data.id;
    this.chatbotId = data.chatbotId;
    this.timestamp = data.timestamp || new Date();
    this.responseTime = data.responseTime;
    this.tokenUsage = data.tokenUsage || 0;
    this.modelVersion = data.modelVersion;
    this.endpoint = data.endpoint;
    this.statusCode = data.statusCode || 200;
    this.errorMessage = data.errorMessage;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Validation schema
  static getValidationSchema() {
    return {
      create: Joi.object({
        chatbotId: Joi.string().uuid().required(),
        timestamp: Joi.date().optional(),
        responseTime: Joi.number().min(0).required(),
        tokenUsage: Joi.number().integer().min(0).optional(),
        modelVersion: Joi.string().optional(),
        endpoint: Joi.string().optional(),
        statusCode: Joi.number().integer().min(100).max(599).optional(),
        errorMessage: Joi.string().optional(),
        metadata: Joi.object().optional()
      })
    };
  }

  // Helper method to create PerformanceMetrics instance from database row
  private static fromDbRow(row: any): PerformanceMetrics {
    return new PerformanceMetrics({
      id: row.id,
      chatbotId: row.chatbot_id,
      timestamp: row.timestamp,
      responseTime: parseFloat(row.response_time),
      tokenUsage: row.token_usage,
      modelVersion: row.model_version,
      endpoint: row.endpoint,
      statusCode: row.status_code,
      errorMessage: row.error_message,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  // Database operations
  static async create(metricsData: PerformanceMetricsData): Promise<PerformanceMetrics> {
    const [metrics] = await db('performance_metrics')
      .insert({
        chatbot_id: metricsData.chatbotId,
        timestamp: metricsData.timestamp || new Date(),
        response_time: metricsData.responseTime,
        token_usage: metricsData.tokenUsage || 0,
        model_version: metricsData.modelVersion,
        endpoint: metricsData.endpoint,
        status_code: metricsData.statusCode || 200,
        error_message: metricsData.errorMessage,
        metadata: metricsData.metadata ? JSON.stringify(metricsData.metadata) : null
      })
      .returning('*');

    return PerformanceMetrics.fromDbRow(metrics);
  }

  static async findById(id: string): Promise<PerformanceMetrics | null> {
    const metrics = await db('performance_metrics').where({ id }).first();
    
    if (!metrics) return null;

    return PerformanceMetrics.fromDbRow(metrics);
  }

  static async findByChatbotId(
    chatbotId: string,
    limit: number = 100,
    offset: number = 0,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      minResponseTime?: number;
      maxResponseTime?: number;
      statusCode?: number;
      endpoint?: string;
    }
  ): Promise<PerformanceMetrics[]> {
    let query = db('performance_metrics')
      .where({ chatbot_id: chatbotId })
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .offset(offset);

    if (filters) {
      if (filters.startDate) {
        query = query.where('timestamp', '>=', filters.startDate);
      }
      if (filters.endDate) {
        query = query.where('timestamp', '<=', filters.endDate);
      }
      if (filters.minResponseTime) {
        query = query.where('response_time', '>=', filters.minResponseTime);
      }
      if (filters.maxResponseTime) {
        query = query.where('response_time', '<=', filters.maxResponseTime);
      }
      if (filters.statusCode) {
        query = query.where('status_code', filters.statusCode);
      }
      if (filters.endpoint) {
        query = query.where('endpoint', filters.endpoint);
      }
    }

    const metricsArray = await query;
    
    return metricsArray.map((metrics: any) => PerformanceMetrics.fromDbRow(metrics));
  }

  // Get performance statistics for a chatbot
  static async getPerformanceStats(
    chatbotId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    averageResponseTime: number;
    medianResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    totalRequests: number;
    errorRate: number;
    totalTokenUsage: number;
    averageTokenUsage: number;
  }> {
    let query = db('performance_metrics')
      .where({ chatbot_id: chatbotId });

    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }
    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }

    const results = await query.select('response_time', 'status_code', 'token_usage')
      .orderBy('response_time');
    
    const totalRequests = results.length;
    
    if (totalRequests === 0) {
      return {
        averageResponseTime: 0,
        medianResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        totalRequests: 0,
        errorRate: 0,
        totalTokenUsage: 0,
        averageTokenUsage: 0
      };
    }

    const responseTimes = results.map(r => parseFloat(r.response_time));
    const tokenUsages = results.map(r => r.token_usage || 0);
    const errorCount = results.filter(r => r.status_code >= 400).length;

    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalRequests;
    const medianResponseTime = responseTimes[Math.floor(totalRequests / 2)];
    const p95ResponseTime = responseTimes[Math.floor(totalRequests * 0.95)];
    const p99ResponseTime = responseTimes[Math.floor(totalRequests * 0.99)];
    const errorRate = (errorCount / totalRequests) * 100;
    const totalTokenUsage = tokenUsages.reduce((sum, usage) => sum + usage, 0);
    const averageTokenUsage = totalTokenUsage / totalRequests;

    return {
      averageResponseTime,
      medianResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      totalRequests,
      errorRate,
      totalTokenUsage,
      averageTokenUsage
    };
  }

  // Get error statistics
  static async getErrorStats(
    chatbotId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalErrors: number;
    errorsByStatusCode: { [key: number]: number };
    errorsByEndpoint: { [key: string]: number };
    commonErrors: { message: string; count: number }[];
  }> {
    let query = db('performance_metrics')
      .where({ chatbot_id: chatbotId })
      .where('status_code', '>=', 400);

    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }
    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }

    const errors = await query.select('status_code', 'endpoint', 'error_message');
    
    const totalErrors = errors.length;
    const errorsByStatusCode: { [key: number]: number } = {};
    const errorsByEndpoint: { [key: string]: number } = {};
    const errorMessages: { [key: string]: number } = {};

    errors.forEach(error => {
      // Count by status code
      errorsByStatusCode[error.status_code] = (errorsByStatusCode[error.status_code] || 0) + 1;
      
      // Count by endpoint
      if (error.endpoint) {
        errorsByEndpoint[error.endpoint] = (errorsByEndpoint[error.endpoint] || 0) + 1;
      }
      
      // Count by error message
      if (error.error_message) {
        errorMessages[error.error_message] = (errorMessages[error.error_message] || 0) + 1;
      }
    });

    // Get top 10 most common error messages
    const commonErrors = Object.entries(errorMessages)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors,
      errorsByStatusCode,
      errorsByEndpoint,
      commonErrors
    };
  }

  // Get hourly performance trends
  static async getHourlyTrends(
    chatbotId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    hour: number;
    averageResponseTime: number;
    requestCount: number;
    errorRate: number;
  }[]> {
    // Use SQLite-compatible date functions
    const results = await db('performance_metrics')
      .where({ chatbot_id: chatbotId })
      .whereBetween('timestamp', [startDate, endDate])
      .select(
        db.raw('CAST(strftime("%H", timestamp) AS INTEGER) as hour'),
        db.raw('AVG(response_time) as avg_response_time'),
        db.raw('COUNT(*) as request_count'),
        db.raw('COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count')
      )
      .groupBy(db.raw('CAST(strftime("%H", timestamp) AS INTEGER)'))
      .orderBy('hour');

    return results.map((result: any) => ({
      hour: parseInt(result.hour) || 0,
      averageResponseTime: parseFloat(result.avg_response_time),
      requestCount: parseInt(result.request_count),
      errorRate: (parseInt(result.error_count) / parseInt(result.request_count)) * 100
    }));
  }

  // Get performance trends over time (daily aggregation)
  static async getPerformanceTrends(
    chatbotId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    date: string;
    averageResponseTime: number;
    requestCount: number;
    errorRate: number;
    tokenUsage: number;
  }[]> {
    // Use SQLite-compatible date functions
    const results = await db('performance_metrics')
      .where({ chatbot_id: chatbotId })
      .whereBetween('timestamp', [startDate, endDate])
      .select(
        db.raw('DATE(timestamp) as date'),
        db.raw('AVG(response_time) as avg_response_time'),
        db.raw('COUNT(*) as request_count'),
        db.raw('COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count'),
        db.raw('SUM(token_usage) as total_token_usage')
      )
      .groupBy(db.raw('DATE(timestamp)'))
      .orderBy('date');

    return results.map((result: any) => ({
      date: result.date,
      averageResponseTime: parseFloat(result.avg_response_time) || 0,
      requestCount: parseInt(result.request_count) || 0,
      errorRate: parseInt(result.request_count) > 0 
        ? (parseInt(result.error_count) / parseInt(result.request_count)) * 100 
        : 0,
      tokenUsage: parseInt(result.total_token_usage) || 0
    }));
  }

  // Clean up old performance metrics (for data retention)
  static async cleanupOldMetrics(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const deletedCount = await db('performance_metrics')
      .where('timestamp', '<', cutoffDate.toISOString())
      .del();

    return deletedCount;
  }
}