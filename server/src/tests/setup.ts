import dotenv from 'dotenv';

// Load test environment variables FIRST before any imports
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.USE_SQLITE = 'true'; // Ensure SQLite is used for tests
process.env.PORT = '0'; // Use random available port for tests

// Global test timeout
jest.setTimeout(30000);

// Lazy-load database connection to ensure environment is set up first
function getDb() {
  const { db } = require('../database/connection');
  return db;
}

// Database setup functions
export async function setupTestDatabase(): Promise<void> {
  try {
    const db = getDb();
    // Run migrations
    await db.migrate.latest();
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
}

export async function cleanupTestDatabase(): Promise<void> {
  // Clean up all tables in reverse order to avoid foreign key constraints
  try {
    const db = getDb();
    const tables = [
      'performance_metrics',
      'conversation_metrics', 
      'analytics',
      'messages',
      'conversations',
      'chatbots',
      'usage_stats',
      'user_profiles',
      'users'
    ];

    for (const table of tables) {
      try {
        await db(table).del();
      } catch (error) {
        // Ignore errors for tables that don't exist
      }
    }
  } catch (error) {
    console.error('Error cleaning up test database:', error);
  }
}

// Setup and teardown for all tests
beforeAll(async () => {
  try {
    await setupTestDatabase();
  } catch (error) {
    console.error('Failed to setup test database:', error);
  }
});

afterAll(async () => {
  try {
    await cleanupTestDatabase();
    const db = getDb();
    await db.destroy();
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
  }
});