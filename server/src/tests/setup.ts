import dotenv from 'dotenv';
import { db } from '../database/connection';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console.log to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(30000);

// Database setup functions
export async function setupTestDatabase(): Promise<void> {
  // Run migrations
  await db.migrate.latest();
}

export async function cleanupTestDatabase(): Promise<void> {
  // Clean up all tables in reverse order to avoid foreign key constraints
  await db('performance_metrics').del();
  await db('conversation_metrics').del();
  await db('analytics').del();
  await db('messages').del();
  await db('conversations').del();
  await db('chatbots').del();
  await db('usage_stats').del();
  await db('user_profiles').del();
  await db('users').del();
  
  // Close database connection
  await db.destroy();
}