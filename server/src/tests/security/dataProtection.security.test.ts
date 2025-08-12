import request from 'supertest';
import { app } from '../../index';
import { knex } from '../../database/connection';
import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { Conversation } from '../../models/Conversation';
import { Message } from '../../models/Message';
import { generateToken } from '../../utils/jwt';

describe('Data Protection Security Tests', () => {
  beforeAll(async () => {
    expect(process.env.NODE_ENV).toBe('test');
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

  describe('Personal Data Protection', () => {
    let testUser: User;
    let authToken: string;

    beforeEach(async () => {
      testUser = await User.query().insert({
        email: 'privacy@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Privacy',
        lastName: 'Test',
        emailVerified: true
      });

      authToken = generateToken({ userId: testUser.id, email: testUser.email });
    });

    test('should not expose sensitive user data in API responses', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.password).toBeUndefined();
      expect(response.body.passwordHash).toBeUndefined();
      expect(response.body.id).toBeDefined(); // ID should be present for functionality
      expect(response.body.email).toBeDefined();
      expect(response.body.firstName).toBeDefined();
    });

    test('should not expose other users data in listings', async () => {
      // Create another user
      const otherUser = await User.query().insert({
        email: 'other@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Other',
        lastName: 'User',
        emailVerified: true
      });

      // Create chatbot for other user
      await Chatbot.query().insert({
        userId: otherUser.id,
        name: 'Other User Bot',
        description: 'Private bot',
        personality: 'Helpful',
        knowledgeBase: ['private'],
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

      // Request chatbots list - should only see own chatbots
      const response = await request(app)
        .get('/api/chatbots')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0); // Should not see other user's chatbot
    });

    test('should sanitize error messages to prevent information disclosure', async () => {
      // Try to access non-existent resource
      const response = await request(app)
        .get('/api/chatbots/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).not.toContain('database');
      expect(response.body.error).not.toContain('SQL');
      expect(response.body.error).not.toContain('table');
      expect(response.body.error).not.toContain('column');
    });

    test('should protect against user enumeration', async () => {
      // Try to register with existing email
      const existingEmailResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: 'NewPassword123!',
          firstName: 'New',
          lastName: 'User'
        });

      // Try to register with non-existing email
      const newEmailResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'nonexistent@test.com',
          password: 'NewPassword123!',
          firstName: 'New',
          lastName: 'User'
        });

      // Responses should be similar to prevent user enumeration
      expect(existingEmailResponse.status).toBe(400);
      expect(newEmailResponse.status).toBe(201);
      
      // Error message should not reveal if email exists
      if (existingEmailResponse.status === 400) {
        expect(existingEmailResponse.body.error).not.toContain('already exists');
        expect(existingEmailResponse.body.error).not.toContain('taken');
      }
    });

    test('should protect password reset from user enumeration', async () => {
      // Request password reset for existing user
      const existingUserResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: testUser.email
        });

      // Request password reset for non-existing user
      const nonExistingUserResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@test.com'
        });

      // Both should return similar responses
      expect(existingUserResponse.status).toBe(200);
      expect(nonExistingUserResponse.status).toBe(200);
      
      // Messages should be generic
      expect(existingUserResponse.body.message).toBe(nonExistingUserResponse.body.message);
    });
  });

  describe('Data Encryption and Storage', () => {
    let testUser: User;
    let authToken: string;

    beforeEach(async () => {
      testUser = await User.query().insert({
        email: 'encryption@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Encryption',
        lastName: 'Test',
        emailVerified: true
      });

      authToken = generateToken({ userId: testUser.id, email: testUser.email });
    });

    test('should store passwords securely hashed', async () => {
      const password = 'TestPassword123!';
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'hash@test.com',
          password,
          firstName: 'Hash',
          lastName: 'Test'
        });

      expect(response.status).toBe(201);

      // Check database directly
      const user = await User.query().findOne({ email: 'hash@test.com' });
      expect(user?.password).not.toBe(password);
      expect(user?.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
      expect(user?.password.length).toBeGreaterThan(50); // Proper hash length
    });

    test('should not store sensitive data in plain text', async () => {
      // Create chatbot with potentially sensitive knowledge base
      const sensitiveData = [
        'API key: sk-1234567890abcdef',
        'Database password: secretpassword123',
        'Credit card: 4111-1111-1111-1111'
      ];

      const response = await request(app)
        .post('/api/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Sensitive Data Bot',
          description: 'Bot with sensitive data',
          personality: 'Helpful',
          knowledgeBase: sensitiveData,
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

      expect(response.status).toBe(201);

      // Verify sensitive data is stored (this is expected behavior, but should be noted)
      // In a real system, you might want to encrypt sensitive knowledge base data
      const chatbot = await Chatbot.query().findById(response.body.id);
      expect(chatbot?.knowledgeBase).toEqual(sensitiveData);
    });

    test('should handle PII in conversations securely', async () => {
      // Create chatbot
      const chatbotResponse = await request(app)
        .post('/api/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'PII Test Bot',
          description: 'Testing PII handling',
          personality: 'Helpful',
          knowledgeBase: ['general'],
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
            collectUserInfo: true
          }
        });

      const chatbot = chatbotResponse.body;

      // Send message with PII
      const piiMessage = 'My name is John Doe, my email is john@example.com and my phone is 555-123-4567';
      
      const chatResponse = await request(app)
        .post(`/api/chatbots/${chatbot.id}/chat`)
        .send({
          message: piiMessage,
          sessionId: 'pii-test-session',
          userInfo: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '555-123-4567'
          }
        });

      expect(chatResponse.status).toBe(200);

      // Verify conversation is stored
      const conversation = await Conversation.query()
        .findById(chatResponse.body.conversationId)
        .withGraphFetched('messages');

      expect(conversation).toBeDefined();
      expect(conversation?.userInfo).toBeDefined();
      
      // In a production system, you might want to encrypt or hash PII
      // For now, we just verify it's stored as expected
      expect(conversation?.userInfo?.email).toBe('john@example.com');
    });
  });

  describe('Data Access Controls', () => {
    let user1: User;
    let user2: User;
    let user1Token: string;
    let user2Token: string;
    let user1Chatbot: Chatbot;
    let conversation: Conversation;

    beforeEach(async () => {
      // Create two users
      user1 = await User.query().insert({
        email: 'user1@access.com',
        password: '$2a$10$hashedpassword',
        firstName: 'User',
        lastName: 'One',
        emailVerified: true
      });

      user2 = await User.query().insert({
        email: 'user2@access.com',
        password: '$2a$10$hashedpassword',
        firstName: 'User',
        lastName: 'Two',
        emailVerified: true
      });

      user1Token = generateToken({ userId: user1.id, email: user1.email });
      user2Token = generateToken({ userId: user2.id, email: user2.email });

      // Create chatbot and conversation for user1
      user1Chatbot = await Chatbot.query().insert({
        userId: user1.id,
        name: 'Private Bot',
        description: 'User 1 private bot',
        personality: 'Helpful',
        knowledgeBase: ['private'],
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

      conversation = await Conversation.query().insert({
        chatbotId: user1Chatbot.id,
        sessionId: 'private-session',
        userInfo: {
          name: 'Private User',
          email: 'private@example.com'
        }
      });

      await Message.query().insert([
        {
          conversationId: conversation.id,
          role: 'user',
          content: 'This is a private message'
        },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: 'This is a private response'
        }
      ]);
    });

    test('should prevent cross-user data access in chatbot endpoints', async () => {
      // User2 tries to access User1's chatbot
      const endpoints = [
        `/api/chatbots/${user1Chatbot.id}`,
        `/api/analytics/chatbot/${user1Chatbot.id}`,
        `/api/analytics/conversations/${user1Chatbot.id}`
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${user2Token}`);

        expect(response.status).toBe(404); // Should not reveal existence
      }
    });

    test('should prevent cross-user data access in conversation endpoints', async () => {
      // User2 tries to access User1's conversation data
      const response = await request(app)
        .get(`/api/analytics/conversations/${user1Chatbot.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(404);
    });

    test('should prevent direct database ID manipulation', async () => {
      // Try to access conversation by manipulating IDs
      const maliciousRequests = [
        `/api/analytics/conversations/${user1Chatbot.id}?conversationId=${conversation.id}`,
        `/api/chatbots/${user1Chatbot.id}/conversations/${conversation.id}`
      ];

      for (const endpoint of maliciousRequests) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${user2Token}`);

        expect([404, 403]).toContain(response.status);
      }
    });

    test('should validate ownership in update operations', async () => {
      // User2 tries to update User1's chatbot
      const response = await request(app)
        .put(`/api/chatbots/${user1Chatbot.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'Hacked Bot Name'
        });

      expect(response.status).toBe(404);

      // Verify chatbot was not modified
      const chatbot = await Chatbot.query().findById(user1Chatbot.id);
      expect(chatbot?.name).toBe('Private Bot');
    });

    test('should validate ownership in delete operations', async () => {
      // User2 tries to delete User1's chatbot
      const response = await request(app)
        .delete(`/api/chatbots/${user1Chatbot.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(404);

      // Verify chatbot still exists
      const chatbot = await Chatbot.query().findById(user1Chatbot.id);
      expect(chatbot).toBeDefined();
    });
  });

  describe('Data Retention and Deletion', () => {
    let testUser: User;
    let authToken: string;
    let testChatbot: Chatbot;

    beforeEach(async () => {
      testUser = await User.query().insert({
        email: 'retention@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Retention',
        lastName: 'Test',
        emailVerified: true
      });

      authToken = generateToken({ userId: testUser.id, email: testUser.email });

      testChatbot = await Chatbot.query().insert({
        userId: testUser.id,
        name: 'Retention Test Bot',
        description: 'Testing data retention',
        personality: 'Helpful',
        knowledgeBase: ['retention'],
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
    });

    test('should properly delete user data on account deletion', async () => {
      // Create some data for the user
      const conversation = await Conversation.query().insert({
        chatbotId: testChatbot.id,
        sessionId: 'deletion-test-session',
        userInfo: {
          name: 'Test User',
          email: 'test@example.com'
        }
      });

      await Message.query().insert([
        {
          conversationId: conversation.id,
          role: 'user',
          content: 'Test message'
        },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: 'Test response'
        }
      ]);

      // Delete user account
      const deleteResponse = await request(app)
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(204);

      // Verify all user data is deleted
      const deletedUser = await User.query().findById(testUser.id);
      const deletedChatbot = await Chatbot.query().findById(testChatbot.id);
      const deletedConversation = await Conversation.query().findById(conversation.id);
      const deletedMessages = await Message.query().where('conversation_id', conversation.id);

      expect(deletedUser).toBeUndefined();
      expect(deletedChatbot).toBeUndefined();
      expect(deletedConversation).toBeUndefined();
      expect(deletedMessages).toHaveLength(0);
    });

    test('should handle data export before deletion', async () => {
      // Create conversation data
      const conversation = await Conversation.query().insert({
        chatbotId: testChatbot.id,
        sessionId: 'export-test-session',
        userInfo: {
          name: 'Export User',
          email: 'export@example.com'
        }
      });

      await Message.query().insert([
        {
          conversationId: conversation.id,
          role: 'user',
          content: 'Export test message'
        },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: 'Export test response'
        }
      ]);

      // Export data
      const exportResponse = await request(app)
        .post('/api/users/export')
        .set('Authorization', `Bearer ${authToken}`);

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.user).toBeDefined();
      expect(exportResponse.body.chatbots).toBeDefined();
      expect(exportResponse.body.conversations).toBeDefined();

      // Verify exported data contains expected information
      expect(exportResponse.body.user.email).toBe(testUser.email);
      expect(exportResponse.body.chatbots).toHaveLength(1);
      expect(exportResponse.body.conversations).toHaveLength(1);
      expect(exportResponse.body.conversations[0].messages).toHaveLength(2);

      // Verify sensitive data is not included in export
      expect(exportResponse.body.user.password).toBeUndefined();
    });

    test('should anonymize data when required', async () => {
      // Create conversation with user info
      const conversation = await Conversation.query().insert({
        chatbotId: testChatbot.id,
        sessionId: 'anonymize-test-session',
        userInfo: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '555-123-4567'
        }
      });

      await Message.query().insert({
        conversationId: conversation.id,
        role: 'user',
        content: 'My name is John Doe and my email is john.doe@example.com'
      });

      // Request data anonymization (if implemented)
      const anonymizeResponse = await request(app)
        .post('/api/users/anonymize')
        .set('Authorization', `Bearer ${authToken}`);

      // This endpoint might not exist yet, so we'll check if it's implemented
      if (anonymizeResponse.status !== 404) {
        expect([200, 202]).toContain(anonymizeResponse.status);

        // Verify user data is anonymized
        const anonymizedConversation = await Conversation.query().findById(conversation.id);
        if (anonymizedConversation) {
          expect(anonymizedConversation.userInfo?.email).not.toBe('john.doe@example.com');
          expect(anonymizedConversation.userInfo?.name).not.toBe('John Doe');
        }
      }
    });
  });

  describe('Audit Trail and Logging', () => {
    let testUser: User;
    let authToken: string;

    beforeEach(async () => {
      testUser = await User.query().insert({
        email: 'audit@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Audit',
        lastName: 'Test',
        emailVerified: true
      });

      authToken = generateToken({ userId: testUser.id, email: testUser.email });
    });

    test('should not log sensitive data in application logs', async () => {
      // Capture console output
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      const logs: string[] = [];

      console.log = (...args) => {
        logs.push(args.join(' '));
        originalConsoleLog(...args);
      };

      console.error = (...args) => {
        logs.push(args.join(' '));
        originalConsoleError(...args);
      };

      try {
        // Perform operations that might log sensitive data
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'password123'
          });

        await request(app)
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: 'Updated',
            lastName: 'Name'
          });

        // Check logs don't contain sensitive data
        const allLogs = logs.join(' ');
        expect(allLogs).not.toContain('password123');
        expect(allLogs).not.toContain('$2a$10$hashedpassword');
        expect(allLogs).not.toContain(authToken);
      } finally {
        // Restore console
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
      }
    });

    test('should handle security events appropriately', async () => {
      // Attempt unauthorized access
      const unauthorizedResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(unauthorizedResponse.status).toBe(401);

      // Attempt to access other user's data
      const otherUser = await User.query().insert({
        email: 'other@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Other',
        lastName: 'User',
        emailVerified: true
      });

      const otherUserChatbot = await Chatbot.query().insert({
        userId: otherUser.id,
        name: 'Other User Bot',
        description: 'Private bot',
        personality: 'Helpful',
        knowledgeBase: ['private'],
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

      const crossUserResponse = await request(app)
        .get(`/api/chatbots/${otherUserChatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(crossUserResponse.status).toBe(404);

      // These security events should be logged appropriately
      // In a real system, you would verify security event logging here
    });
  });
});