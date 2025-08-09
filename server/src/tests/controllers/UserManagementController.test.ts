import request from 'supertest';
import { app } from '../../index';
import { User } from '../../models/User';
import { UserProfile } from '../../models/UserProfile';
import { UsageStats } from '../../models/UsageStats';
import { db } from '../../database/connection';

describe('UserManagementController', () => {
  let testUser: User;
  let authToken: string;

  beforeEach(async () => {
    // Create and verify a test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    });

    // Verify email
    testUser.emailVerified = true;
    await testUser.save();

    // Generate auth token
    const tokens = testUser.generateTokens();
    authToken = tokens.accessToken;
  });

  afterEach(async () => {
    // Clean up test data
    await db('usage_stats').where({ user_id: testUser.id }).del();
    await db('user_profiles').where({ user_id: testUser.id }).del();
    await db('users').where({ id: testUser.id }).del();
  });

  describe('GET /api/v1/users/profile', () => {
    it('should return complete user profile', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.profile).toBeDefined();
      expect(response.body.data.profile.preferences).toBeDefined();
      expect(response.body.data.usage).toBeDefined();
      expect(response.body.data.usage.messagesThisMonth).toBe(0);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/users/profile')
        .expect(401);
    });

    it('should require email verification', async () => {
      // Create unverified user
      const unverifiedUser = await User.create({
        email: 'unverified@example.com',
        password: 'TestPassword123!',
        firstName: 'Unverified',
        lastName: 'User'
      });

      const unverifiedTokens = unverifiedUser.generateTokens();

      await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${unverifiedTokens.accessToken}`)
        .expect(403);

      // Clean up
      await db('users').where({ id: unverifiedUser.id }).del();
    });
  });

  describe('PUT /api/v1/users/profile', () => {
    it('should update user profile preferences', async () => {
      const updates = {
        preferences: {
          theme: 'dark',
          notifications: false,
          language: 'es'
        }
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.data.profile.preferences.theme).toBe('dark');
      expect(response.body.data.profile.preferences.notifications).toBe(false);
      expect(response.body.data.profile.preferences.language).toBe('es');
    });

    it('should validate preference updates', async () => {
      const invalidUpdates = {
        preferences: {
          theme: 'invalid-theme'
        }
      };

      await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdates)
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/v1/users/profile')
        .send({ preferences: { theme: 'dark' } })
        .expect(401);
    });
  });

  describe('GET /api/v1/users/usage', () => {
    it('should return user usage statistics', async () => {
      const response = await request(app)
        .get('/api/v1/users/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.usage).toBeDefined();
      expect(response.body.data.usage.messagesThisMonth).toBe(0);
      expect(response.body.data.usage.totalMessages).toBe(0);
      expect(response.body.data.usage.chatbotsCreated).toBe(0);
      expect(response.body.data.usage.storageUsed).toBe(0);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/users/usage')
        .expect(401);
    });
  });

  describe('GET /api/v1/users/export', () => {
    it('should export user data', async () => {
      const response = await request(app)
        .get('/api/v1/users/export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User data exported successfully');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.profile).toBeDefined();
      expect(response.body.data.usage).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/users/export')
        .expect(401);
    });
  });

  describe('DELETE /api/v1/users/account', () => {
    it('should delete user account with email confirmation', async () => {
      const response = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ confirmEmail: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Account deleted successfully');

      // Verify user is deleted
      const deletedUser = await User.findById(testUser.id!);
      expect(deletedUser).toBeNull();
    });

    it('should require email confirmation', async () => {
      await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ confirmEmail: 'wrong@example.com' })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .delete('/api/v1/users/account')
        .send({ confirmEmail: 'test@example.com' })
        .expect(401);
    });
  });

  describe('POST /api/v1/users/track/message', () => {
    it('should track message usage', async () => {
      const response = await request(app)
        .post('/api/v1/users/track/message')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Message usage tracked');
      expect(response.body.data.usage.messagesThisMonth).toBe(1);
      expect(response.body.data.usage.totalMessages).toBe(1);
      expect(response.body.data.usage.lastActive).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/users/track/message')
        .expect(401);
    });
  });

  describe('POST /api/v1/users/track/chatbot', () => {
    it('should track chatbot creation', async () => {
      const response = await request(app)
        .post('/api/v1/users/track/chatbot')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Chatbot creation tracked');
      expect(response.body.data.usage.chatbotsCreated).toBe(1);
      expect(response.body.data.usage.lastActive).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/users/track/chatbot')
        .expect(401);
    });
  });

  describe('PUT /api/v1/users/storage', () => {
    it('should update storage usage', async () => {
      const storageBytes = 1024000;

      const response = await request(app)
        .put('/api/v1/users/storage')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ storageBytes })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Storage usage updated');
      expect(response.body.data.usage.storageUsed).toBe(storageBytes);
      expect(response.body.data.usage.lastActive).toBeDefined();
    });

    it('should validate storage bytes', async () => {
      await request(app)
        .put('/api/v1/users/storage')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ storageBytes: 'invalid' })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/v1/users/storage')
        .send({ storageBytes: 1000 })
        .expect(401);
    });
  });

  describe('PUT /api/v1/users/activity', () => {
    it('should update user activity', async () => {
      const response = await request(app)
        .put('/api/v1/users/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User activity updated');
      expect(response.body.data.usage.lastActive).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/v1/users/activity')
        .expect(401);
    });
  });

  describe('Admin endpoints', () => {
    describe('GET /api/v1/admin/users/usage-stats', () => {
      it('should return all usage statistics', async () => {
        // Create some usage data first
        await request(app)
          .post('/api/v1/users/track/message')
          .set('Authorization', `Bearer ${authToken}`);

        const response = await request(app)
          .get('/api/v1/admin/users/usage-stats')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.stats).toBeDefined();
        expect(Array.isArray(response.body.data.stats)).toBe(true);
        expect(response.body.data.count).toBeDefined();
      });

      it('should support limit and offset parameters', async () => {
        const response = await request(app)
          .get('/api/v1/admin/users/usage-stats?limit=10&offset=0')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.stats).toBeDefined();
      });

      it('should validate limit and offset parameters', async () => {
        await request(app)
          .get('/api/v1/admin/users/usage-stats?limit=invalid')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/v1/admin/users/usage-stats')
          .expect(401);
      });
    });

    describe('POST /api/v1/admin/users/reset-monthly-stats', () => {
      it('should reset monthly usage statistics', async () => {
        // Create some usage data first
        await request(app)
          .post('/api/v1/users/track/message')
          .set('Authorization', `Bearer ${authToken}`);

        const response = await request(app)
          .post('/api/v1/admin/users/reset-monthly-stats')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Monthly usage stats reset successfully');

        // Verify monthly count is reset
        const usageResponse = await request(app)
          .get('/api/v1/users/usage')
          .set('Authorization', `Bearer ${authToken}`);

        expect(usageResponse.body.data.usage.messagesThisMonth).toBe(0);
        expect(usageResponse.body.data.usage.totalMessages).toBe(1); // Total should remain
      });

      it('should require authentication', async () => {
        await request(app)
          .post('/api/v1/admin/users/reset-monthly-stats')
          .expect(401);
      });
    });
  });
});