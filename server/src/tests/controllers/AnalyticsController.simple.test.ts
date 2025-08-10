import request from 'supertest';
import { app } from '../testServer';
import { db } from '../../database/connection';
import { User } from '../../models/User';
import { JWTUtils } from '../../utils/jwt';

describe('AnalyticsController - Simple Tests', () => {
  let user: User;
  let authToken: string;

  beforeAll(async () => {
    // Create test user with unique email
    const uniqueEmail = `analytics-simple-${Date.now()}@test.com`;
    user = await User.create({
      email: uniqueEmail,
      password: 'password123',
      firstName: 'Analytics',
      lastName: 'User'
    });

    // Generate auth token
    authToken = JWTUtils.generateAccessToken(user);
  });

  afterAll(async () => {
    // Clean up
    if (user?.id) {
      await db('users').where({ id: user.id }).del();
    }
  });

  describe('GET /api/v1/analytics/summary', () => {
    it('should get user analytics summary', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toHaveProperty('totalChatbots');
      expect(response.body.data.summary).toHaveProperty('totalConversations');
      expect(response.body.data.summary).toHaveProperty('totalMessages');
      expect(response.body.data.summary).toHaveProperty('avgSatisfactionScore');
      expect(response.body.data.chatbotSummaries).toBeInstanceOf(Array);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/analytics/summary')
        .expect(401);
    });
  });

  describe('Analytics routes exist', () => {
    it('should have analytics routes registered', async () => {
      // Test that the routes exist by checking they don't return 404
      const response = await request(app)
        .get('/api/v1/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).not.toBe(404);
    });
  });
});