import { db } from '../../database/connection';

export class DatabaseFixtures {
  static async createTestTables(): Promise<void> {
    // Ensure all migrations are run
    await db.migrate.latest();
  }

  static async cleanAllTables(): Promise<void> {
    // Clean up all tables in reverse order to avoid foreign key constraints
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
        console.warn(`Warning: Could not clean table ${table}:`, error);
      }
    }
  }

  static async seedTestData(): Promise<{
    users: any[];
    chatbots: any[];
    conversations: any[];
  }> {
    // Create test users
    const users = await Promise.all([
      db('users').insert({
        id: 'test-user-1',
        email: 'user1@test.com',
        password_hash: '$2b$10$test.hash.1',
        first_name: 'Test',
        last_name: 'User1',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*'),
      db('users').insert({
        id: 'test-user-2', 
        email: 'user2@test.com',
        password_hash: '$2b$10$test.hash.2',
        first_name: 'Test',
        last_name: 'User2',
        email_verified: true,
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*')
    ]);

    // Create user profiles
    await Promise.all([
      db('user_profiles').insert({
        user_id: 'test-user-1',
        preferences: JSON.stringify({
          theme: 'light',
          notifications: true,
          language: 'en',
          timezone: 'UTC'
        }),
        created_at: new Date(),
        updated_at: new Date()
      }),
      db('user_profiles').insert({
        user_id: 'test-user-2',
        preferences: JSON.stringify({
          theme: 'dark',
          notifications: false,
          language: 'en',
          timezone: 'UTC'
        }),
        created_at: new Date(),
        updated_at: new Date()
      })
    ]);

    // Create usage stats
    await Promise.all([
      db('usage_stats').insert({
        user_id: 'test-user-1',
        messages_this_month: 50,
        total_messages: 150,
        chatbots_created: 2,
        storage_used: 1024,
        last_active: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }),
      db('usage_stats').insert({
        user_id: 'test-user-2',
        messages_this_month: 25,
        total_messages: 75,
        chatbots_created: 1,
        storage_used: 512,
        last_active: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      })
    ]);

    // Create test chatbots
    const chatbots = await Promise.all([
      db('chatbots').insert({
        id: 'test-chatbot-1',
        user_id: 'test-user-1',
        name: 'Test Bot 1',
        description: 'A test chatbot',
        personality: 'Helpful and friendly',
        knowledge_base: JSON.stringify(['Test knowledge 1']),
        appearance: JSON.stringify({
          primaryColor: '#3B82F6',
          secondaryColor: '#F3F4F6',
          fontFamily: 'Arial',
          borderRadius: 12,
          position: 'bottom-right'
        }),
        settings: JSON.stringify({
          maxTokens: 150,
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'I apologize, but I cannot help with that.',
          collectUserInfo: false
        }),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*'),
      db('chatbots').insert({
        id: 'test-chatbot-2',
        user_id: 'test-user-2',
        name: 'Test Bot 2',
        description: 'Another test chatbot',
        personality: 'Professional and concise',
        knowledge_base: JSON.stringify(['Test knowledge 2']),
        appearance: JSON.stringify({
          primaryColor: '#EF4444',
          secondaryColor: '#FEF2F2',
          fontFamily: 'Helvetica',
          borderRadius: 8,
          position: 'bottom-left'
        }),
        settings: JSON.stringify({
          maxTokens: 100,
          temperature: 0.5,
          responseDelay: 500,
          fallbackMessage: 'I cannot assist with that request.',
          collectUserInfo: true
        }),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*')
    ]);

    // Create test conversations
    const conversations = await Promise.all([
      db('conversations').insert({
        id: 'test-conversation-1',
        chatbot_id: 'test-chatbot-1',
        session_id: 'session-1',
        user_info: JSON.stringify({ name: 'Visitor 1' }),
        started_at: new Date(Date.now() - 3600000), // 1 hour ago
        ended_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*'),
      db('conversations').insert({
        id: 'test-conversation-2',
        chatbot_id: 'test-chatbot-1',
        session_id: 'session-2',
        user_info: JSON.stringify({ name: 'Visitor 2' }),
        started_at: new Date(Date.now() - 1800000), // 30 minutes ago
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*')
    ]);

    // Create test messages
    await Promise.all([
      db('messages').insert({
        id: 'test-message-1',
        conversation_id: 'test-conversation-1',
        role: 'user',
        content: 'Hello, can you help me?',
        timestamp: new Date(Date.now() - 3600000),
        created_at: new Date(),
        updated_at: new Date()
      }),
      db('messages').insert({
        id: 'test-message-2',
        conversation_id: 'test-conversation-1',
        role: 'assistant',
        content: 'Hello! I\'d be happy to help you. What can I assist you with?',
        timestamp: new Date(Date.now() - 3590000),
        created_at: new Date(),
        updated_at: new Date()
      }),
      db('messages').insert({
        id: 'test-message-3',
        conversation_id: 'test-conversation-2',
        role: 'user',
        content: 'What are your hours?',
        timestamp: new Date(Date.now() - 1800000),
        created_at: new Date(),
        updated_at: new Date()
      })
    ]);

    return {
      users: users.flat(),
      chatbots: chatbots.flat(),
      conversations: conversations.flat()
    };
  }
}