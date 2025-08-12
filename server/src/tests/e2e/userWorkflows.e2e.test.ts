import request from 'supertest';
import { app } from '../../index';
import { knex } from '../../database/connection';

describe('End-to-End User Workflows', () => {
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

  describe('Complete User Journey: Registration to Chatbot Deployment', () => {
    test('should complete full user journey from registration to chatbot deployment', async () => {
      const userEmail = 'journey@test.com';
      const userPassword = 'securepassword123';

      // Step 1: User Registration
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: userEmail,
          password: userPassword,
          firstName: 'Journey',
          lastName: 'User'
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.user.email).toBe(userEmail);
      expect(registerResponse.body.user.emailVerified).toBe(false);

      // Step 2: Email Verification (simulate)
      const user = registerResponse.body.user;
      await knex('users').where('id', user.id).update({ email_verified: true });

      // Step 3: User Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: userPassword
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.token).toBeDefined();
      const authToken = loginResponse.body.token;

      // Step 4: Complete Profile Setup
      const profileResponse = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Journey',
          lastName: 'User',
          preferences: {
            theme: 'light',
            notifications: true,
            language: 'en',
            timezone: 'America/New_York'
          }
        });

      expect(profileResponse.status).toBe(200);

      // Step 5: Create First Chatbot
      const chatbotResponse = await request(app)
        .post('/api/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'My First Chatbot',
          description: 'A helpful customer service bot',
          personality: 'Friendly and professional customer service representative',
          knowledgeBase: [
            'We are a software company that provides AI chatbot solutions',
            'Our business hours are 9 AM to 5 PM EST',
            'We offer 24/7 support through our chatbot'
          ],
          appearance: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d',
            fontFamily: 'Inter',
            borderRadius: 12,
            position: 'bottom-right'
          },
          settings: {
            maxTokens: 200,
            temperature: 0.7,
            responseDelay: 1500,
            fallbackMessage: 'I apologize, but I need more information to help you with that.',
            collectUserInfo: true
          }
        });

      expect(chatbotResponse.status).toBe(201);
      const chatbot = chatbotResponse.body;
      expect(chatbot.name).toBe('My First Chatbot');

      // Step 6: Test Chatbot Functionality
      const chatResponse = await request(app)
        .post(`/api/chatbots/${chatbot.id}/chat`)
        .send({
          message: 'Hello, what are your business hours?',
          sessionId: 'test-session-001',
          userInfo: {
            name: 'Test Customer',
            email: 'customer@example.com'
          }
        });

      expect(chatResponse.status).toBe(200);
      expect(chatResponse.body.response).toBeDefined();
      expect(chatResponse.body.conversationId).toBeDefined();

      // Step 7: Continue Conversation
      const followupResponse = await request(app)
        .post(`/api/chatbots/${chatbot.id}/chat`)
        .send({
          message: 'Do you offer technical support?',
          sessionId: 'test-session-001',
          conversationId: chatResponse.body.conversationId
        });

      expect(followupResponse.status).toBe(200);
      expect(followupResponse.body.response).toBeDefined();

      // Step 8: Check Analytics
      const analyticsResponse = await request(app)
        .get(`/api/analytics/chatbot/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.totalConversations).toBe(1);
      expect(analyticsResponse.body.totalMessages).toBe(4); // 2 user + 2 assistant

      // Step 9: View Conversation History
      const historyResponse = await request(app)
        .get(`/api/analytics/conversations/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.conversations).toHaveLength(1);
      expect(historyResponse.body.conversations[0].messages).toHaveLength(4);

      // Step 10: Update Chatbot Configuration
      const updateResponse = await request(app)
        .put(`/api/chatbots/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Customer Service Bot',
          personality: 'Very friendly and helpful customer service representative with expertise in technical support',
          knowledgeBase: [
            'We are a software company that provides AI chatbot solutions',
            'Our business hours are 9 AM to 5 PM EST',
            'We offer 24/7 support through our chatbot',
            'We provide technical support for integration issues',
            'Our API documentation is available at docs.example.com'
          ]
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe('Updated Customer Service Bot');

      // Step 11: Test Updated Chatbot
      const updatedChatResponse = await request(app)
        .post(`/api/chatbots/${chatbot.id}/chat`)
        .send({
          message: 'I need help with API integration',
          sessionId: 'test-session-002'
        });

      expect(updatedChatResponse.status).toBe(200);
      expect(updatedChatResponse.body.response).toBeDefined();

      // Step 12: Check Usage Statistics
      const usageResponse = await request(app)
        .get('/api/users/usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(usageResponse.status).toBe(200);
      expect(usageResponse.body.chatbotsCreated).toBe(1);
      expect(usageResponse.body.totalMessages).toBeGreaterThan(0);

      // Step 13: Export User Data
      const exportResponse = await request(app)
        .post('/api/users/export')
        .set('Authorization', `Bearer ${authToken}`);

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.user.email).toBe(userEmail);
      expect(exportResponse.body.chatbots).toHaveLength(1);
      expect(exportResponse.body.conversations.length).toBeGreaterThan(0);
    }, 30000); // Extended timeout for comprehensive test
  });

  describe('Multi-User Chatbot Interaction Workflow', () => {
    test('should handle multiple users interacting with same chatbot', async () => {
      // Create chatbot owner
      const ownerRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner@test.com',
          password: 'ownerpassword123',
          firstName: 'Bot',
          lastName: 'Owner'
        });

      const ownerId = ownerRegisterResponse.body.user.id;
      await knex('users').where('id', ownerId).update({ email_verified: true });

      const ownerLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'owner@test.com',
          password: 'ownerpassword123'
        });

      const ownerToken = ownerLoginResponse.body.token;

      // Create chatbot
      const chatbotResponse = await request(app)
        .post('/api/chatbots')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Multi-User Test Bot',
          description: 'Bot for testing multiple user interactions',
          personality: 'Helpful assistant that remembers context within conversations',
          knowledgeBase: ['general knowledge', 'customer support'],
          appearance: {
            primaryColor: '#28a745',
            secondaryColor: '#6c757d',
            fontFamily: 'Arial',
            borderRadius: 8,
            position: 'bottom-right'
          },
          settings: {
            maxTokens: 150,
            temperature: 0.7,
            responseDelay: 1000,
            fallbackMessage: 'I need more information to help you.',
            collectUserInfo: true
          }
        });

      const chatbot = chatbotResponse.body;

      // Simulate multiple users having conversations
      const userSessions = [
        { sessionId: 'user-1-session', userName: 'Alice', userEmail: 'alice@example.com' },
        { sessionId: 'user-2-session', userName: 'Bob', userEmail: 'bob@example.com' },
        { sessionId: 'user-3-session', userName: 'Charlie', userEmail: 'charlie@example.com' }
      ];

      const conversationPromises = userSessions.map(async (session) => {
        // Start conversation
        const initialResponse = await request(app)
          .post(`/api/chatbots/${chatbot.id}/chat`)
          .send({
            message: `Hello, my name is ${session.userName}. How can you help me?`,
            sessionId: session.sessionId,
            userInfo: {
              name: session.userName,
              email: session.userEmail
            }
          });

        expect(initialResponse.status).toBe(200);

        // Continue conversation
        const followupResponse = await request(app)
          .post(`/api/chatbots/${chatbot.id}/chat`)
          .send({
            message: 'What services do you offer?',
            sessionId: session.sessionId,
            conversationId: initialResponse.body.conversationId
          });

        expect(followupResponse.status).toBe(200);

        return {
          sessionId: session.sessionId,
          conversationId: initialResponse.body.conversationId,
          userName: session.userName
        };
      });

      const conversations = await Promise.all(conversationPromises);

      // Verify all conversations were created
      expect(conversations).toHaveLength(3);

      // Check analytics reflect multiple conversations
      const analyticsResponse = await request(app)
        .get(`/api/analytics/chatbot/${chatbot.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.totalConversations).toBe(3);
      expect(analyticsResponse.body.totalMessages).toBe(12); // 6 user + 6 assistant

      // Verify conversation history shows all users
      const historyResponse = await request(app)
        .get(`/api/analytics/conversations/${chatbot.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({ page: 1, limit: 10 });

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.conversations).toHaveLength(3);

      const userNames = historyResponse.body.conversations.map(
        (conv: any) => conv.userInfo?.name
      );
      expect(userNames).toContain('Alice');
      expect(userNames).toContain('Bob');
      expect(userNames).toContain('Charlie');
    }, 25000);
  });

  describe('Chatbot Lifecycle Management Workflow', () => {
    test('should handle complete chatbot lifecycle from creation to deletion', async () => {
      // Setup user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'lifecycle@test.com',
          password: 'lifecyclepassword123',
          firstName: 'Lifecycle',
          lastName: 'Test'
        });

      const userId = registerResponse.body.user.id;
      await knex('users').where('id', userId).update({ email_verified: true });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'lifecycle@test.com',
          password: 'lifecyclepassword123'
        });

      const authToken = loginResponse.body.token;

      // Phase 1: Create chatbot
      const createResponse = await request(app)
        .post('/api/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Lifecycle Test Bot',
          description: 'Testing complete lifecycle',
          personality: 'Professional and helpful',
          knowledgeBase: ['initial knowledge'],
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

      const chatbot = createResponse.body;

      // Phase 2: Use chatbot (generate data)
      const conversations = [];
      for (let i = 0; i < 3; i++) {
        const chatResponse = await request(app)
          .post(`/api/chatbots/${chatbot.id}/chat`)
          .send({
            message: `Test message ${i + 1}`,
            sessionId: `lifecycle-session-${i + 1}`
          });

        conversations.push(chatResponse.body.conversationId);
      }

      // Phase 3: Update chatbot multiple times
      const updates = [
        { name: 'Updated Lifecycle Bot v1', description: 'First update' },
        { name: 'Updated Lifecycle Bot v2', description: 'Second update' },
        { name: 'Final Lifecycle Bot', description: 'Final version' }
      ];

      for (const update of updates) {
        const updateResponse = await request(app)
          .put(`/api/chatbots/${chatbot.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(update);

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.name).toBe(update.name);
      }

      // Phase 4: Verify analytics data exists
      const analyticsResponse = await request(app)
        .get(`/api/analytics/chatbot/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.totalConversations).toBe(3);

      // Phase 5: Deactivate chatbot
      const deactivateResponse = await request(app)
        .put(`/api/chatbots/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isActive: false });

      expect(deactivateResponse.status).toBe(200);
      expect(deactivateResponse.body.isActive).toBe(false);

      // Phase 6: Verify deactivated chatbot doesn't accept new messages
      const inactiveResponse = await request(app)
        .post(`/api/chatbots/${chatbot.id}/chat`)
        .send({
          message: 'This should not work',
          sessionId: 'inactive-session'
        });

      expect(inactiveResponse.status).toBe(400);

      // Phase 7: Reactivate chatbot
      const reactivateResponse = await request(app)
        .put(`/api/chatbots/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isActive: true });

      expect(reactivateResponse.status).toBe(200);
      expect(reactivateResponse.body.isActive).toBe(true);

      // Phase 8: Verify reactivated chatbot works
      const activeResponse = await request(app)
        .post(`/api/chatbots/${chatbot.id}/chat`)
        .send({
          message: 'This should work now',
          sessionId: 'reactivated-session'
        });

      expect(activeResponse.status).toBe(200);

      // Phase 9: Delete chatbot
      const deleteResponse = await request(app)
        .delete(`/api/chatbots/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(204);

      // Phase 10: Verify chatbot and related data are deleted
      const getDeletedResponse = await request(app)
        .get(`/api/chatbots/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getDeletedResponse.status).toBe(404);

      // Verify conversations are also deleted
      const conversationsCount = await knex('conversations')
        .where('chatbot_id', chatbot.id)
        .count('* as count')
        .first();

      expect(parseInt(conversationsCount.count)).toBe(0);
    }, 30000);
  });

  describe('Error Recovery Workflow', () => {
    test('should handle and recover from various error scenarios', async () => {
      // Setup user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'error@test.com',
          password: 'errorpassword123',
          firstName: 'Error',
          lastName: 'Test'
        });

      const userId = registerResponse.body.user.id;
      await knex('users').where('id', userId).update({ email_verified: true });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'error@test.com',
          password: 'errorpassword123'
        });

      const authToken = loginResponse.body.token;

      // Create chatbot
      const chatbotResponse = await request(app)
        .post('/api/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Error Recovery Bot',
          description: 'Testing error recovery',
          personality: 'Resilient and helpful',
          knowledgeBase: ['error handling'],
          appearance: {
            primaryColor: '#dc3545',
            secondaryColor: '#6c757d',
            fontFamily: 'Arial',
            borderRadius: 8,
            position: 'bottom-right'
          },
          settings: {
            maxTokens: 150,
            temperature: 0.7,
            responseDelay: 1000,
            fallbackMessage: 'I encountered an error, but I am still here to help.',
            collectUserInfo: false
          }
        });

      const chatbot = chatbotResponse.body;

      // Test 1: Invalid message format
      const invalidMessageResponse = await request(app)
        .post(`/api/chatbots/${chatbot.id}/chat`)
        .send({
          // Missing message field
          sessionId: 'error-session-1'
        });

      expect(invalidMessageResponse.status).toBe(400);

      // Test 2: Valid message after error
      const validMessageResponse = await request(app)
        .post(`/api/chatbots/${chatbot.id}/chat`)
        .send({
          message: 'This should work fine',
          sessionId: 'error-session-1'
        });

      expect(validMessageResponse.status).toBe(200);

      // Test 3: Extremely long message
      const longMessage = 'A'.repeat(10000);
      const longMessageResponse = await request(app)
        .post(`/api/chatbots/${chatbot.id}/chat`)
        .send({
          message: longMessage,
          sessionId: 'error-session-2'
        });

      // Should either succeed or fail gracefully
      expect([200, 400, 413]).toContain(longMessageResponse.status);

      // Test 4: Invalid session ID format
      const invalidSessionResponse = await request(app)
        .post(`/api/chatbots/${chatbot.id}/chat`)
        .send({
          message: 'Test with invalid session',
          sessionId: '' // Empty session ID
        });

      expect(invalidSessionResponse.status).toBe(400);

      // Test 5: Recovery with valid session
      const recoveryResponse = await request(app)
        .post(`/api/chatbots/${chatbot.id}/chat`)
        .send({
          message: 'Recovery test',
          sessionId: 'recovery-session'
        });

      expect(recoveryResponse.status).toBe(200);

      // Verify system is still functional
      const analyticsResponse = await request(app)
        .get(`/api/analytics/chatbot/${chatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(analyticsResponse.status).toBe(200);
    }, 20000);
  });

  describe('Admin Workflow Integration', () => {
    test('should handle complete admin workflow', async () => {
      // Create admin user
      const adminUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@test.com',
          password: 'AdminPassword123!',
          firstName: 'Admin',
          lastName: 'User'
        });

      const adminId = adminUser.body.user.id;
      await knex('users').where('id', adminId).update({ 
        email_verified: true,
        role: 'admin'
      });

      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'AdminPassword123!'
        });

      const adminToken = adminLogin.body.token;

      // Test admin dashboard access
      const dashboardResponse = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.totalUsers).toBeDefined();
      expect(dashboardResponse.body.totalChatbots).toBeDefined();

      // Test user management
      const usersResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 });

      expect(usersResponse.status).toBe(200);
      expect(usersResponse.body.users).toBeDefined();
      expect(usersResponse.body.pagination).toBeDefined();

      // Test system health monitoring
      const healthResponse = await request(app)
        .get('/api/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.services).toBeDefined();
      expect(healthResponse.body.metrics).toBeDefined();
    });
  });

  describe('Data Migration and Backup Workflow', () => {
    test('should handle data export and import workflow', async () => {
      // Create user with data
      const user = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'migration@test.com',
          password: 'MigrationPassword123!',
          firstName: 'Migration',
          lastName: 'Test'
        });

      const userId = user.body.user.id;
      await knex('users').where('id', userId).update({ email_verified: true });

      const login = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'migration@test.com',
          password: 'MigrationPassword123!'
        });

      const token = login.body.token;

      // Create chatbot and conversations
      const chatbot = await request(app)
        .post('/api/chatbots')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Migration Test Bot',
          description: 'Bot for migration testing',
          personality: 'Helpful migration assistant',
          knowledgeBase: ['migration', 'data'],
          appearance: {
            primaryColor: '#17a2b8',
            secondaryColor: '#6c757d',
            fontFamily: 'Arial',
            borderRadius: 8,
            position: 'bottom-right'
          },
          settings: {
            maxTokens: 150,
            temperature: 0.7,
            responseDelay: 1000,
            fallbackMessage: 'Migration test response',
            collectUserInfo: false
          }
        });

      // Create conversation
      await request(app)
        .post(`/api/chatbots/${chatbot.body.id}/chat`)
        .send({
          message: 'Migration test message',
          sessionId: 'migration-session'
        });

      // Export data
      const exportResponse = await request(app)
        .post('/api/users/export')
        .set('Authorization', `Bearer ${token}`);

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.user).toBeDefined();
      expect(exportResponse.body.chatbots).toHaveLength(1);
      expect(exportResponse.body.conversations).toHaveLength(1);

      // Verify export contains all necessary data
      const exportedData = exportResponse.body;
      expect(exportedData.user.email).toBe('migration@test.com');
      expect(exportedData.chatbots[0].name).toBe('Migration Test Bot');
      expect(exportedData.conversations[0].messages).toBeDefined();
    });
  });
});