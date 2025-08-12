import { createClient } from 'redis';
import { logger } from '../services/LoggingService';

// Create Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Handle Redis connection events
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
  if (logger) {
    logger.error('Redis connection error', { error: err.message });
  }
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
  if (logger) {
    logger.info('Redis connection established');
  }
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
  if (logger) {
    logger.info('Redis client ready for operations');
  }
});

redisClient.on('end', () => {
  console.log('Redis connection ended');
  if (logger) {
    logger.warn('Redis connection ended');
  }
});

// Connect to Redis (with error handling for development)
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.warn('Redis connection failed, continuing without Redis:', error);
    if (logger) {
      logger.warn('Redis connection failed, continuing without Redis', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
};

// Initialize connection
connectRedis();

export { redisClient };