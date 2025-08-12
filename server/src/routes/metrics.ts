import { Router, Request, Response } from 'express';
import { monitoringService } from '../middleware/monitoring';
import { redisClient } from '../config/redis';
import { knex } from '../database/connection';

const router = Router();

// Get application metrics
router.get('/', async (req: Request, res: Response) => {
  try {
    const metrics = monitoringService.getMetrics();
    const systemMetrics = monitoringService.getSystemMetrics();
    const performanceMetrics = monitoringService.getPerformanceMetrics();

    res.json({
      success: true,
      data: {
        application: metrics,
        system: systemMetrics,
        performance: performanceMetrics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get error logs
router.get('/errors', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const errors = await redisClient.lRange('app:errors', 0, limit - 1);
    
    const parsedErrors = errors.map(error => {
      try {
        return JSON.parse(error);
      } catch {
        return { message: error, timestamp: new Date().toISOString() };
      }
    });

    res.json({
      success: true,
      data: {
        errors: parsedErrors,
        total: errors.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get database metrics
router.get('/database', async (req: Request, res: Response) => {
  try {
    const dbMetrics = await knex.raw(`
      SELECT 
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
        (SELECT count(*) FROM pg_stat_activity) as total_connections,
        (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size,
        (SELECT pg_size_pretty(sum(pg_total_relation_size(schemaname||'.'||tablename))::bigint) 
         FROM pg_tables WHERE schemaname = 'public') as tables_size,
        (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
    `);

    // Get slow queries if pg_stat_statements is available
    let slowQueries = [];
    try {
      const slowQueryResult = await knex.raw(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_time > 100 
        ORDER BY mean_time DESC 
        LIMIT 10
      `);
      slowQueries = slowQueryResult.rows;
    } catch {
      // pg_stat_statements extension not available
    }

    res.json({
      success: true,
      data: {
        metrics: dbMetrics.rows[0],
        slowQueries,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Redis metrics
router.get('/redis', async (req: Request, res: Response) => {
  try {
    const info = await redisClient.info();
    
    // Parse Redis info
    const metrics = {
      version: info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown',
      uptime: info.match(/uptime_in_seconds:(\d+)/)?.[1] || '0',
      connectedClients: info.match(/connected_clients:(\d+)/)?.[1] || '0',
      usedMemory: info.match(/used_memory_human:([^\r\n]+)/)?.[1] || 'unknown',
      usedMemoryPeak: info.match(/used_memory_peak_human:([^\r\n]+)/)?.[1] || 'unknown',
      totalCommandsProcessed: info.match(/total_commands_processed:(\d+)/)?.[1] || '0',
      instantaneousOpsPerSec: info.match(/instantaneous_ops_per_sec:(\d+)/)?.[1] || '0',
      keyspaceHits: info.match(/keyspace_hits:(\d+)/)?.[1] || '0',
      keyspaceMisses: info.match(/keyspace_misses:(\d+)/)?.[1] || '0'
    };

    // Calculate hit rate
    const hits = parseInt(metrics.keyspaceHits);
    const misses = parseInt(metrics.keyspaceMisses);
    const hitRate = hits + misses > 0 ? (hits / (hits + misses) * 100).toFixed(2) : '0';

    res.json({
      success: true,
      data: {
        metrics: {
          ...metrics,
          hitRate: `${hitRate}%`
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get system resource usage
router.get('/system', async (req: Request, res: Response) => {
  try {
    const systemMetrics = monitoringService.getSystemMetrics();
    
    // Additional system information
    const additionalMetrics = {
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      pid: process.pid,
      loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
      freeMemory: require('os').freemem(),
      totalMemory: require('os').totalmem(),
      cpuCount: require('os').cpus().length
    };

    res.json({
      success: true,
      data: {
        ...systemMetrics,
        ...additionalMetrics,
        memoryUsagePercentage: ((additionalMetrics.totalMemory - additionalMetrics.freeMemory) / additionalMetrics.totalMemory * 100).toFixed(2) + '%'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Reset metrics (admin only)
router.post('/reset', async (req: Request, res: Response) => {
  try {
    // In a real application, you'd want to check admin permissions here
    monitoringService.resetMetrics();
    
    res.json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Prometheus-style metrics endpoint
router.get('/prometheus', async (req: Request, res: Response) => {
  try {
    const metrics = monitoringService.getMetrics();
    const systemMetrics = monitoringService.getSystemMetrics();
    const performanceMetrics = monitoringService.getPerformanceMetrics();

    // Generate Prometheus format metrics
    const prometheusMetrics = `
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total ${metrics.totalRequests}

# HELP http_requests_successful_total Total number of successful HTTP requests
# TYPE http_requests_successful_total counter
http_requests_successful_total ${metrics.successfulRequests}

# HELP http_requests_failed_total Total number of failed HTTP requests
# TYPE http_requests_failed_total counter
http_requests_failed_total ${metrics.failedRequests}

# HELP http_request_duration_ms Average HTTP request duration in milliseconds
# TYPE http_request_duration_ms gauge
http_request_duration_ms ${metrics.averageResponseTime}

# HELP http_request_duration_p50_ms 50th percentile HTTP request duration in milliseconds
# TYPE http_request_duration_p50_ms gauge
http_request_duration_p50_ms ${performanceMetrics.p50}

# HELP http_request_duration_p90_ms 90th percentile HTTP request duration in milliseconds
# TYPE http_request_duration_p90_ms gauge
http_request_duration_p90_ms ${performanceMetrics.p90}

# HELP http_request_duration_p95_ms 95th percentile HTTP request duration in milliseconds
# TYPE http_request_duration_p95_ms gauge
http_request_duration_p95_ms ${performanceMetrics.p95}

# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${systemMetrics.uptime}

# HELP process_memory_heap_used_bytes Process heap memory used in bytes
# TYPE process_memory_heap_used_bytes gauge
process_memory_heap_used_bytes ${systemMetrics.memoryUsage.heapUsed}

# HELP process_memory_heap_total_bytes Process heap memory total in bytes
# TYPE process_memory_heap_total_bytes gauge
process_memory_heap_total_bytes ${systemMetrics.memoryUsage.heapTotal}
    `.trim();

    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;