import { Router, Request, Response } from 'express';
import { db as knex } from '../database/connection';
import { redisClient } from '../config/redis';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: any;
    redis: any;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
}

// Basic health check endpoint
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: 'disconnected'
        },
        redis: {
          status: 'disconnected'
        },
        memory: {
          used: 0,
          total: 0,
          percentage: 0
        },
        cpu: {
          usage: 0
        }
      }
    };

    // Check database connection
    try {
      const dbStartTime = Date.now();
      await knex.raw('SELECT 1');
      healthStatus.services.database = {
        status: 'connected',
        responseTime: Date.now() - dbStartTime
      };
    } catch (error) {
      healthStatus.services.database = {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown database error'
      } as any;
      healthStatus.status = 'unhealthy';
    }

    // Check Redis connection
    try {
      const redisStartTime = Date.now();
      await redisClient.ping();
      healthStatus.services.redis = {
        status: 'connected',
        responseTime: Date.now() - redisStartTime
      };
    } catch (error) {
      healthStatus.services.redis = {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown Redis error'
      } as any;
      healthStatus.status = 'unhealthy';
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    healthStatus.services.memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    };

    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    healthStatus.services.cpu = {
      usage: Math.round((cpuUsage.user + cpuUsage.system) / 1000000) // Convert to milliseconds
    };

    const responseTime = Date.now() - startTime;
    
    // Set appropriate HTTP status code
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      ...healthStatus,
      responseTime
    });

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    });
  }
});

// Detailed health check with more metrics
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: { status: 'disconnected' },
        redis: { status: 'disconnected' }
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      },
      metrics: {
        activeConnections: 0,
        totalRequests: 0,
        errorRate: 0
      }
    };

    // Database health check with additional metrics
    try {
      const dbStartTime = Date.now();
      
      // Test basic connectivity
      await knex.raw('SELECT 1');
      
      // Get database statistics
      const dbStats = await knex.raw(`
        SELECT 
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size,
          (SELECT version()) as version
      `);
      
      healthStatus.services.database = {
        status: 'connected',
        responseTime: Date.now() - dbStartTime,
        activeConnections: dbStats.rows[0]?.active_connections || 0,
        databaseSize: dbStats.rows[0]?.database_size || 'unknown',
        version: dbStats.rows[0]?.version || 'unknown'
      } as any;
    } catch (error) {
      healthStatus.services.database = {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown database error'
      } as any;
      healthStatus.status = 'unhealthy';
    }

    // Redis health check with additional metrics
    try {
      const redisStartTime = Date.now();
      
      // Test basic connectivity
      await redisClient.ping();
      
      // Get Redis info
      const redisInfo = await redisClient.info();
      const memoryMatch = redisInfo.match(/used_memory_human:([^\r\n]+)/);
      const connectionsMatch = redisInfo.match(/connected_clients:(\d+)/);
      
      healthStatus.services.redis = {
        status: 'connected',
        responseTime: Date.now() - redisStartTime,
        memoryUsage: memoryMatch ? memoryMatch[1] : 'unknown',
        connectedClients: connectionsMatch ? parseInt(connectionsMatch[1]) : 0
      } as any;
    } catch (error) {
      healthStatus.services.redis = {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown Redis error'
      } as any;
      healthStatus.status = 'unhealthy';
    }

    const responseTime = Date.now() - startTime;
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      ...healthStatus,
      responseTime
    });

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    });
  }
});

// Liveness probe (simple check that the service is running)
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness probe (check if the service is ready to handle requests)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check critical dependencies
    await knex.raw('SELECT 1');
    await redisClient.ping();
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;