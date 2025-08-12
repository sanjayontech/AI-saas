import { knex } from '../../database/connection';
import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { Conversation } from '../../models/Conversation';
import { Message } from '../../models/Message';
import { UserProfile } from '../../models/UserProfile';
import { UsageStats } from '../../models/UsageStats';

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Ensure we're using test database
    expect(process.env.NODE_ENV).toBe('test');
    
    // Run migrations
    await knex.migrate.latest();
  });

  beforeEach(async () => {
    // Clean database before each test
    await knex('messages').del();
    await knex('conversations').del();
    await knex('chatbots').del();
    await knex('usage_stats').del();
    await knex('user_profiles').del();
    await knex('users').del();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  describe('User Model Integration', () => {
    test('should create and retrieve user with all relationships', async () => {
      // Create user
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const user = await User.query().insert(userData);
      expect(user.id).toBeDefined();

      // Create user profile
      const profileData = {
        userId: user.id,
        preferences: {
          theme: 'dark',
          notifications: true,
          language: 'en',
          timezone: 'UTC'
        }
      };

      await UserProfile.query().insert(profileData);

      // Create usage stats
      const usageData = {
        userId: user.id,
        messagesThisMonth: 150,
        totalMessages: 500,
        chatbotsCreated: 3,
        storageUsed: 1024
      };

      await UsageStats.query().insert(usageData);

      // Retrieve user with all relationships
      const retrievedUser = await User.query()
        .findById(user.id)
        .withGraphFetched('[profile, usageStats, chatbots]');

      expect(retrievedUser).toBeDefined();
      expect(retrievedUser.profile).toBeDefined();
      expect(retrievedUser.usageStats).toBeDefined();
      expect(retrievedUser.profile.preferences.theme).toBe('dark');
      expect(retrievedUser.usageStats.messagesThisMonth).toBe(150);
    });

    test('should handle user deletion with cascade', async () => {
      // Create user with related data
      const user = await User.query().insert({
        email: 'delete@example.com',
        password: 'hashedpassword123',
        firstName: 'Delete',
        lastName: 'Me'
      });

      await UserProfile.query().insert({
        userId: user.id,
        preferences: { theme: 'light' }
      });

      await UsageStats.query().insert({
        userId: user.id,
        messagesThisMonth: 10,
        totalMessages: 10,
        chatbotsCreated: 1,
        storageUsed: 100
      });

      const chatbot = await Chatbot.query().insert({
        userId: user.id,
        name: 'Test Bot',
        description: 'Test Description',
        personality: 'Helpful',
        knowledgeBase: ['test knowledge'],
        appearance: {
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
          fontFamily: 'Arial',
          borderRadius: 8,
          position: 'bottom-right'
        },
        settings: {
          maxTokens: 150,
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'Sorry, I could not understand.',
          collectUserInfo: false
        }
      });

      // Delete user
      await User.query().deleteById(user.id);

      // Verify cascade deletion
      const deletedProfile = await UserProfile.query().findOne({ userId: user.id });
      const deletedStats = await UsageStats.query().findOne({ userId: user.id });
      const deletedChatbot = await Chatbot.query().findById(chatbot.id);

      expect(deletedProfile).toBeUndefined();
      expect(deletedStats).toBeUndefined();
      expect(deletedChatbot).toBeUndefined();
    });
  });

  describe('Chatbot and Conversation Integration', () => {
    let user: User;
    let chatbot: Chatbot;

    beforeEach(async () => {
      user = await User.query().insert({
        email: 'chatbot@example.com',
        password: 'hashedpassword123',
        firstName: 'Chatbot',
        lastName: 'Owner'
      });

      chatbot = await Chatbot.query().insert({
        userId: user.id,
        name: 'Integration Bot',
        description: 'Bot for integration testing',
        personality: 'Professional and helpful',
        knowledgeBase: ['integration', 'testing', 'chatbots'],
        appearance: {
          primaryColor: '#28a745',
          secondaryColor: '#6c757d',
          fontFamily: 'Roboto',
          borderRadius: 12,
          position: 'bottom-right'
        },
        settings: {
          maxTokens: 200,
          temperature: 0.8,
          responseDelay: 500,
          fallbackMessage: 'I apologize, but I could not process your request.',
          collectUserInfo: true
        }
      });
    });

    test('should create conversation with messages', async () => {
      const conversation = await Conversation.query().insert({
        chatbotId: chatbot.id,
        sessionId: 'session-123',
        userInfo: {
          name: 'Test User',
          email: 'user@example.com'
        }
      });

      const messages = [
        {
          conversationId: conversation.id,
          role: 'user',
          content: 'Hello, how can you help me?',
          metadata: { timestamp: new Date().toISOString() }
        },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: 'Hello! I can help you with various questions and tasks.',
          metadata: { 
            timestamp: new Date().toISOString(),
            responseTime: 1200
          }
        }
      ];

      await Message.query().insert(messages);

      // Retrieve conversation with messages
      const retrievedConversation = await Conversation.query()
        .findById(conversation.id)
        .withGraphFetched('messages');

      expect(retrievedConversation.messages).toHaveLength(2);
      expect(retrievedConversation.messages[0].role).toBe('user');
      expect(retrievedConversation.messages[1].role).toBe('assistant');
    });

    test('should handle complex conversation queries', async () => {
      // Create multiple conversations
      const conversations = await Promise.all([
        Conversation.query().insert({
          chatbotId: chatbot.id,
          sessionId: 'session-1',
          userInfo: { name: 'User 1' }
        }),
        Conversation.query().insert({
          chatbotId: chatbot.id,
          sessionId: 'session-2',
          userInfo: { name: 'User 2' }
        })
      ]);

      // Add messages to conversations
      await Promise.all([
        Message.query().insert({
          conversationId: conversations[0].id,
          role: 'user',
          content: 'First conversation message'
        }),
        Message.query().insert({
          conversationId: conversations[1].id,
          role: 'user',
          content: 'Second conversation message'
        })
      ]);

      // Query conversations with message counts
      const chatbotWithStats = await Chatbot.query()
        .findById(chatbot.id)
        .withGraphFetched('conversations.messages')
        .modifyGraph('conversations', builder => {
          builder.select('*').count('messages.id as messageCount');
        });

      expect(chatbotWithStats.conversations).toHaveLength(2);
    });
  });

  describe('Analytics and Performance Integration', () => {
    test('should handle large dataset queries efficiently', async () => {
      // Create test data
      const user = await User.query().insert({
        email: 'performance@example.com',
        password: 'hashedpassword123',
        firstName: 'Performance',
        lastName: 'Test'
      });

      const chatbot = await Chatbot.query().insert({
        userId: user.id,
        name: 'Performance Bot',
        description: 'Bot for performance testing',
        personality: 'Fast and efficient',
        knowledgeBase: ['performance'],
        appearance: {
          primaryColor: '#ffc107',
          secondaryColor: '#6c757d',
          fontFamily: 'Arial',
          borderRadius: 8,
          position: 'bottom-right'
        },
        settings: {
          maxTokens: 100,
          temperature: 0.5,
          responseDelay: 100,
          fallbackMessage: 'Quick response',
          collectUserInfo: false
        }
      });

      // Create multiple conversations with messages
      const conversationPromises = Array(10).fill(0).map((_, i) =>
        Conversation.query().insert({
          chatbotId: chatbot.id,
          sessionId: `perf-session-${i}`,
          userInfo: { name: `User ${i}` }
        })
      );

      const conversations = await Promise.all(conversationPromises);

      // Add messages to each conversation
      const messagePromises = conversations.flatMap(conv =>
        Array(5).fill(0).map((_, i) => [
          Message.query().insert({
            conversationId: conv.id,
            role: 'user',
            content: `User message ${i} in conversation ${conv.sessionId}`
          }),
          Message.query().insert({
            conversationId: conv.id,
            role: 'assistant',
            content: `Assistant response ${i} in conversation ${conv.sessionId}`
          })
        ])
      ).flat();

      await Promise.all(messagePromises);

      // Test performance of complex query
      const startTime = Date.now();
      
      const results = await knex('conversations')
        .join('messages', 'conversations.id', 'messages.conversation_id')
        .where('conversations.chatbot_id', chatbot.id)
        .select('conversations.session_id')
        .count('messages.id as message_count')
        .groupBy('conversations.id', 'conversations.session_id')
        .orderBy('message_count', 'desc');

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(results).toHaveLength(10);
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Transaction Integration', () => {
    test('should handle complex transactions correctly', async () => {
      const trx = await knex.transaction();

      try {
        // Create user within transaction
        const user = await User.query(trx).insert({
          email: 'transaction@example.com',
          password: 'hashedpassword123',
          firstName: 'Transaction',
          lastName: 'Test'
        });

        // Create related data
        await UserProfile.query(trx).insert({
          userId: user.id,
          preferences: { theme: 'dark' }
        });

        await UsageStats.query(trx).insert({
          userId: user.id,
          messagesThisMonth: 0,
          totalMessages: 0,
          chatbotsCreated: 0,
          storageUsed: 0
        });

        await trx.commit();

        // Verify data was created
        const createdUser = await User.query()
          .findById(user.id)
          .withGraphFetched('[profile, usageStats]');

        expect(createdUser).toBeDefined();
        expect(createdUser.profile).toBeDefined();
        expect(createdUser.usageStats).toBeDefined();
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });

    test('should rollback transaction on error', async () => {
      const trx = await knex.transaction();

      try {
        // Create user
        const user = await User.query(trx).insert({
          email: 'rollback@example.com',
          password: 'hashedpassword123',
          firstName: 'Rollback',
          lastName: 'Test'
        });

        // Try to create duplicate user (should fail)
        await User.query(trx).insert({
          email: 'rollback@example.com', // Duplicate email
          password: 'hashedpassword123',
          firstName: 'Duplicate',
          lastName: 'User'
        });

        await trx.commit();
      } catch (error) {
        await trx.rollback();
        
        // Verify no data was created
        const users = await User.query().where('email', 'rollback@example.com');
        expect(users).toHaveLength(0);
      }
    });
  });
});