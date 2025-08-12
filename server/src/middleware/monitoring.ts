import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';

interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsByEndpoint: Record<string, number>;
  requestsByMethod: Record<string, number>;
  errorsByType: Record<string, number>;
  lastUpdated: string;
}

interface SystemMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  activeConnections: number;
  timestamp: string;
}

class MonitoringService {
  private metrics: RequestMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    requestsByEndpoint: {},
    requestsByMethod: {},
    errorsByType: {},
    lastUpdated: new Date().toISOString()
  };

  private responseTimes: number[] = [];
  private readonly maxResponseTimeHistory = 1000; // Keep last 1000 response times

  // Middleware to track request metrics
  trackRequest = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;
    const self = this;

    // Override res.send to capture response
    res.send = function(data: any) {
      const responseTime = Date.now() - startTime;
      
      // Update metrics
      self.updateMetrics(req, res, responseTime);
      
      return originalSend.call(this, data);
    };

    next();
  };

  private updateMetrics(req: Request, res: Response, responseTime: number) {
    this.metrics.totalRequests++;
    
    // Track success/failure
    if (res.statusCode >= 200 && res.statusCode < 400) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
      
      // Track error types
      const errorType = this.getErrorType(res.statusCode);
      this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
    }

    // Track response times
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }
    
    // Calculate average response time
    this.metrics.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;

    // Track requests by endpoint
    const endpoint = this.normalizeEndpoint(req.path);
    this.metrics.requestsByEndpoint[endpoint] = (this.metrics.requestsByEndpoint[endpoint] || 0) + 1;

    // Track requests by method
    this.metrics.requestsByMethod[req.method] = (this.metrics.requestsByMethod[req.method] || 0) + 1;

    this.metrics.lastUpdated = new Date().toISOString();

    // Store metrics in Redis for persistence
    this.storeMetricsInRedis();
  }

  private getErrorType(statusCode: number): string {
    if (statusCode >= 400 && statusCode < 500) {
      return '4xx_client_errors';
    } else if (statusCode >= 500) {
      return '5xx_server_errors';
    }
    return 'unknown_errors';
  }

  private normalizeEndpoint(path: string): string {
    // Normalize paths to group similar endpoints
    return path
      .replace(/\/\d+/g, '/:id') // Replace numeric IDs
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // Replace UUIDs
      .replace(/\/[a-f0-9]{24}/g, '/:objectId'); // Replace MongoDB ObjectIds
  }

  private async storeMetricsInRedis() {
    try {
      await redisClient.setEx('app:metrics', 300, JSON.stringify(this.metrics)); // 5 minutes TTL
    } catch (error) {
      console.error('Failed to store metrics in Redis:', error);
    }
  }

  // Get current metrics
  getMetrics(): RequestMetrics {
    return { ...this.metrics };
  }

  // Get system metrics
  getSystemMetrics(): SystemMetrics {
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeConnections: 0, // This would need to be tracked separately
      timestamp: new Date().toISOString()
    };
  }

  // Get performance percentiles
  getPerformanceMetrics() {
    if (this.responseTimes.length === 0) {
      return {
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0
      };
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const length = sorted.length;

    return {
      p50: sorted[Math.floor(length * 0.5)],
      p90: sorted[Math.floor(length * 0.9)],
      p95: sorted[Math.floor(length * 0.95)],
      p99: sorted[Math.floor(length * 0.99)],
      min: sorted[0],
      max: sorted[length - 1]
    };
  }

  // Reset metrics (useful for testing or periodic resets)
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsByEndpoint: {},
      requestsByMethod: {},
      errorsByType: {},
      lastUpdated: new Date().toISOString()
    };
    this.responseTimes = [];
  }

  // Get metrics from Redis (for distributed systems)
  async getMetricsFromRedis(): Promise<RequestMetrics | null> {
    try {
      const metricsData = await redisClient.get('app:metrics');
      return metricsData ? JSON.parse(metricsData) : null;
    } catch (error) {
      console.error('Failed to get metrics from Redis:', error);
      return null;
    }
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

// Export middleware and service
export const monitoringMiddleware = monitoringService.trackRequest;
export { monitoringService };

// Error tracking middleware
export const errorTrackingMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
  // Log error details
  console.error('Application Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Store error in Redis for analysis
  const errorData = {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip
  };

  redisClient.lPush('app:errors', JSON.stringify(errorData))
    .then(() => redisClient.lTrim('app:errors', 0, 999)) // Keep last 1000 errors
    .catch((redisError: any) => console.error('Failed to store error in Redis:', redisError));

  next(error);
};