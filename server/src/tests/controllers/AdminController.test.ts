import request from 'supertest';
import { app } from '../testApp';
import { TestDataFactory, TestCleanup } from '../utils/testHelpers';

describe('AdminController - Integration Tests', () => {
  let adminUser: any;
  let regularUser: any;

  beforeEach(async () => {
    // Create admin user
    adminUser = await TestDataFactory.createTestUser({
      email: 'admin@example.com',
      role: 'admin'
    });

    // Create regular user
    regularUser = await TestDataFactory.createTestUser({
      email: 'user@example.com',
      role: 'user'
    });
  });

  afterEach(async () => {
    await TestCleanup.cleanupAll();
  });

  describe('GET /api/v1/admin/stats', () => {
    it('should return system statistics for admin user', async () => {
      const response = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalUsers).toBeDefined();
      expect(response.body.data.totalChatbots).toBeDefined();
      expect(response.body.data.totalConversations).toBeDefined();
      expect(response.body.data.totalMessages).toBeDefined();
      expect(response.body.data.activeUsersToday).toBeDefined();
      expect(response.body.data.systemHealth).toBeDefined();
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${regularUser.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/admin/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('should return paginated list of users', async () => {
      // Create additional test users
      await TestDataFactory.createTestUser({ email: 'user1@example.com' });
      await TestDataFactory.createTestUser({ email: 'user2@example.com' });

      const response = await request(app)
        .get('/api/v1/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should filter users by search term', async () => {
      await TestDataFactory.createTestUser({ 
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe'
      });

      const response = await request(app)
        .get('/api/v1/admin/users?search=john')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.data.users[0].firstName).toBe('John');
    });

    it('should sort users by specified field', async () => {
      await TestDataFactory.createTestUser({ 
        email: 'alice@example.com',
        firstName: 'Alice'
      });
      await TestDataFactory.createTestUser({ 
        email: 'bob@example.com',
        firstName: 'Bob'
      });

      const response = await request(app)
        .get('/api/v1/admin/users?sortBy=firstName&sortOrder=asc')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      expect(response.body.data.users[0].firstName).toBe('Alice');
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${regularUser.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/users/:userId', () => {
    it('should return detailed user information', async () => {
      const testUser = await TestDataFactory.createTestUser({ email: 'detail@example.com' });
      const chatbot = await TestDataFactory.createTestChatbot({ userId: testUser.user.id! });

      const response = await request(app)
        .get(`/api/v1/admin/users/${testUser.user.id}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBe(testUser.user.id);
      expect(response.body.data.chatbots).toBeDefined();
      expect(response.body.data.usage).toBeDefined();
      expect(response.body.data.conversations).toBeDefined();
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users/non-existent-id')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/users/${regularUser.user.id}`)
        .set('Authorization', `Bearer ${regularUser.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/admin/users/:userId/status', () => {
    it('should update user status successfully', async () => {
      const testUser = await TestDataFactory.createTestUser({ email: 'status@example.com' });

      const response = await request(app)
        .put(`/api/v1/admin/users/${testUser.user.id}/status`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({
          isActive: false,
          reason: 'Suspended for policy violation'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
    });

    it('should return 400 for invalid status data', async () => {
      const testUser = await TestDataFactory.createTestUser();

      const response = await request(app)
        .put(`/api/v1/admin/users/${testUser.user.id}/status`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({
          isActive: 'invalid' // Should be boolean
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/v1/admin/users/non-existent-id/status')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({
          isActive: false,
          reason: 'Test'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/users/${regularUser.user.id}/status`)
        .set('Authorization', `Bearer ${regularUser.token}`)
        .send({
          isActive: false,
          reason: 'Test'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/admin/users/:userId', () => {
    it('should delete user successfully', async () => {
      const testUser = await TestDataFactory.createTestUser({ email: 'delete@example.com' });

      const response = await request(app)
        .delete(`/api/v1/admin/users/${testUser.user.id}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete('/api/v1/admin/users/non-existent-id')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/users/${regularUser.user.id}`)
        .set('Authorization', `Bearer ${regularUser.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/health', () => {
    it('should return system health status', async () => {
      const response = await request(app)
        .get('/api/v1/admin/health')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.database).toBeDefined();
      expect(response.body.data.googleAI).toBeDefined();
      expect(response.body.data.memory).toBeDefined();
      expect(response.body.data.uptime).toBeDefined();
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/api/v1/admin/health')
        .set('Authorization', `Bearer ${regularUser.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/analytics', () => {
    it('should return usage analytics', async () => {
      const response = await request(app)
        .get('/api/v1/admin/analytics')
        .query({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          granularity: 'day'
        })
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userGrowth).toBeDefined();
      expect(response.body.data.chatbotUsage).toBeDefined();
      expect(response.body.data.messageVolume).toBeDefined();
      expect(response.body.data.topChatbots).toBeDefined();
    });

    it('should return 400 for invalid date range', async () => {
      const response = await request(app)
        .get('/api/v1/admin/analytics')
        .query({
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // End before start
          granularity: 'day'
        })
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${regularUser.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/users/:userId/export', () => {
    it('should export user data in JSON format', async () => {
      const testUser = await TestDataFactory.createTestUser({ email: 'export@example.com' });

      const response = await request(app)
        .get(`/api/v1/admin/users/${testUser.user.id}/export`)
        .query({ format: 'json' })
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.format).toBe('json');
      expect(response.body.data.data).toBeDefined();
      expect(response.body.data.filename).toContain('.json');
    });

    it('should export user data in CSV format', async () => {
      const testUser = await TestDataFactory.createTestUser({ email: 'export@example.com' });

      const response = await request(app)
        .get(`/api/v1/admin/users/${testUser.user.id}/export`)
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.format).toBe('csv');
      expect(response.body.data.filename).toContain('.csv');
    });

    it('should return 400 for invalid export format', async () => {
      const testUser = await TestDataFactory.createTestUser();

      const response = await request(app)
        .get(`/api/v1/admin/users/${testUser.user.id}/export`)
        .query({ format: 'xml' }) // Unsupported format
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users/non-existent-id/export')
        .query({ format: 'json' })
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/users/${regularUser.user.id}/export`)
        .query({ format: 'json' })
        .set('Authorization', `Bearer ${regularUser.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/chatbots', () => {
    it('should return analytics for all chatbots', async () => {
      const testUser = await TestDataFactory.createTestUser();
      const chatbot = await TestDataFactory.createTestChatbot({ userId: testUser.user.id! });

      const response = await request(app)
        .get('/api/v1/admin/chatbots')
        .query({
          page: 1,
          limit: 10,
          sortBy: 'messageCount',
          sortOrder: 'desc'
        })
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chatbots).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(Array.isArray(response.body.data.chatbots)).toBe(true);
    });

    it('should filter chatbots by user', async () => {
      const user1 = await TestDataFactory.createTestUser({ email: 'user1@example.com' });
      const user2 = await TestDataFactory.createTestUser({ email: 'user2@example.com' });
      
      const chatbot1 = await TestDataFactory.createTestChatbot({ userId: user1.user.id! });
      const chatbot2 = await TestDataFactory.createTestChatbot({ userId: user2.user.id! });

      const response = await request(app)
        .get('/api/v1/admin/chatbots')
        .query({
          userId: user1.user.id,
          page: 1,
          limit: 10
        })
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);

      expect(response.body.data.chatbots).toHaveLength(1);
      expect(response.body.data.chatbots[0].userId).toBe(user1.user.id);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/api/v1/admin/chatbots')
        .set('Authorization', `Bearer ${regularUser.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});