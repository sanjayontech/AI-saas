import request from 'supertest';
import { app } from '../../index';
import { knex } from '../../database/connection';
import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { generateToken } from '../../utils/jwt';
import jwt from 'jsonwebtoken';

describe('Authentication Security Tests', () => {
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

  describe('JWT Token Security', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await User.query().insert({
        email: 'security@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Security',
        lastName: 'Test',
        emailVerified: true
      });
    });

    test('should reject invalid JWT tokens', async () => {
      const invalidTokens = [
        'invalid.token.here',
        'Bearer invalid.token.here',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
        'null',
        'undefined'
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      }
    });

    test('should reject expired JWT tokens', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('expired');
    });

    test('should reject tokens with invalid signature', async () => {
      // Create token with wrong secret
      const invalidToken = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
    });

    test('should reject tokens with missing required claims', async () => {
      // Token without userId
      const tokenWithoutUserId = jwt.sign(
        { email: testUser.email },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tokenWithoutUserId}`);

      expect(response.status).toBe(401);
    });

    test('should reject tokens for non-existent users', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
      const tokenForNonExistentUser = generateToken({
        userId: nonExistentUserId,
        email: 'nonexistent@test.com'
      });

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tokenForNonExistentUser}`);

      expect(response.status).toBe(401);
    });

    test('should handle token refresh security', async () => {
      // Login to get refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123'
        });

      const refreshToken = loginResponse.body.refreshToken;

      // Use refresh token multiple times (should only work once)
      const firstRefresh = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(firstRefresh.status).toBe(200);

      // Second use should fail (token rotation)
      const secondRefresh = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(secondRefresh.status).toBe(401);
    });
  });

  describe('Password Security', () => {
    test('should enforce strong password requirements', async () => {
      const weakPasswords = [
        '123',
        'password',
        '12345678',
        'abcdefgh',
        'ABCDEFGH',
        'Password', // Missing number and special char
        'password123', // Missing uppercase and special char
        'PASSWORD123' // Missing lowercase and special char
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `weak${Math.random()}@test.com`,
            password,
            firstName: 'Weak',
            lastName: 'Password'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('password');
      }
    });

    test('should hash passwords securely', async () => {
      const password = 'SecurePassword123!';
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'hash@test.com',
          password,
          firstName: 'Hash',
          lastName: 'Test'
        });

      expect(response.status).toBe(201);

      // Verify password is hashed in database
      const user = await User.query().findOne({ email: 'hash@test.com' });
      expect(user?.password).not.toBe(password);
      expect(user?.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
    });

    test('should prevent password brute force attacks', async () => {
      const user = await User.query().insert({
        email: 'bruteforce@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Brute',
        lastName: 'Force',
        emailVerified: true
      });

      // Attempt multiple failed logins
      const failedAttempts = Array(10).fill(0).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'wrongpassword'
          })
      );

      const results = await Promise.all(failedAttempts);
      
      // Later attempts should be rate limited
      const rateLimited = results.some(result => result.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Authorization Security', () => {
    let user1: User;
    let user2: User;
    let user1Token: string;
    let user2Token: string;
    let user1Chatbot: Chatbot;

    beforeEach(async () => {
      // Create two users
      user1 = await User.query().insert({
        email: 'user1@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'User',
        lastName: 'One',
        emailVerified: true
      });

      user2 = await User.query().insert({
        email: 'user2@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'User',
        lastName: 'Two',
        emailVerified: true
      });

      user1Token = generateToken({ userId: user1.id, email: user1.email });
      user2Token = generateToken({ userId: user2.id, email: user2.email });

      // Create chatbot for user1
      user1Chatbot = await Chatbot.query().insert({
        userId: user1.id,
        name: 'User 1 Bot',
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
    });

    test('should prevent unauthorized access to other users chatbots', async () => {
      // User2 tries to access User1's chatbot
      const response = await request(app)
        .get(`/api/chatbots/${user1Chatbot.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(404); // Should not reveal existence
    });

    test('should prevent unauthorized chatbot modifications', async () => {
      // User2 tries to modify User1's chatbot
      const response = await request(app)
        .put(`/api/chatbots/${user1Chatbot.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'Hacked Bot'
        });

      expect(response.status).toBe(404);
    });

    test('should prevent unauthorized chatbot deletion', async () => {
      // User2 tries to delete User1's chatbot
      const response = await request(app)
        .delete(`/api/chatbots/${user1Chatbot.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(404);

      // Verify chatbot still exists
      const chatbot = await Chatbot.query().findById(user1Chatbot.id);
      expect(chatbot).toBeDefined();
    });

    test('should prevent unauthorized access to analytics', async () => {
      // User2 tries to access User1's chatbot analytics
      const response = await request(app)
        .get(`/api/analytics/chatbot/${user1Chatbot.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(404);
    });

    test('should prevent unauthorized access to conversation history', async () => {
      // User2 tries to access User1's conversation history
      const response = await request(app)
        .get(`/api/analytics/conversations/${user1Chatbot.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(404);
    });

    test('should prevent privilege escalation', async () => {
      // Try to access admin endpoints with regular user token
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/system/health',
        '/api/admin/analytics'
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${user1Token}`);

        expect([401, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('Input Validation Security', () => {
    let testUser: User;
    let authToken: string;

    beforeEach(async () => {
      testUser = await User.query().insert({
        email: 'validation@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Validation',
        lastName: 'Test',
        emailVerified: true
      });

      authToken = generateToken({ userId: testUser.id, email: testUser.email });
    });

    test('should prevent SQL injection in chatbot creation', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
        "' UNION SELECT * FROM users --"
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/api/chatbots')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: maliciousInput,
            description: 'Test bot',
            personality: 'Helpful',
            knowledgeBase: ['test'],
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

        // Should either reject or sanitize the input
        if (response.status === 201) {
          expect(response.body.name).not.toContain('DROP TABLE');
          expect(response.body.name).not.toContain('INSERT INTO');
        }
      }

      // Verify users table still exists and is intact
      const users = await User.query();
      expect(users.length).toBeGreaterThan(0);
    });

    test('should prevent XSS in chatbot messages', async () => {
      // Create test chatbot
      const chatbotResponse = await request(app)
        .post('/api/chatbots')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'XSS Test Bot',
          description: 'Testing XSS prevention',
          personality: 'Helpful',
          knowledgeBase: ['test'],
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

      const chatbot = chatbotResponse.body;

      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">',
        '"><script>alert("XSS")</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post(`/api/chatbots/${chatbot.id}/chat`)
          .send({
            message: payload,
            sessionId: 'xss-test-session'
          });

        // Should not execute script or return dangerous content
        if (response.status === 200) {
          expect(response.body.response).not.toContain('<script>');
          expect(response.body.response).not.toContain('javascript:');
          expect(response.body.response).not.toContain('onerror=');
        }
      }
    });

    test('should validate and sanitize file uploads', async () => {
      // Test with various malicious file types/content
      const maliciousFiles = [
        { name: 'test.exe', content: 'MZ\x90\x00' }, // Executable header
        { name: 'test.php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'test.js', content: 'eval(atob("YWxlcnQoIlhTUyIp"))' }, // Base64 encoded alert
        { name: '../../../etc/passwd', content: 'root:x:0:0:root:/root:/bin/bash' }
      ];

      for (const file of maliciousFiles) {
        // Attempt to upload through profile update (if file upload exists)
        const response = await request(app)
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .field('firstName', 'Test')
          .attach('avatar', Buffer.from(file.content), file.name);

        // Should reject malicious files
        expect([400, 415, 422]).toContain(response.status);
      }
    });

    test('should prevent NoSQL injection', async () => {
      const noSQLPayloads = [
        { $ne: null },
        { $gt: '' },
        { $regex: '.*' },
        { $where: 'this.password.length > 0' }
      ];

      for (const payload of noSQLPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'anypassword'
          });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Session Security', () => {
    test('should invalidate sessions on logout', async () => {
      // Register and login
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'session@test.com',
          password: 'SecurePassword123!',
          firstName: 'Session',
          lastName: 'Test'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'session@test.com',
          password: 'SecurePassword123!'
        });

      const token = loginResponse.body.token;

      // Verify token works
      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(profileResponse.status).toBe(200);

      // Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutResponse.status).toBe(200);

      // Verify token no longer works
      const postLogoutResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(postLogoutResponse.status).toBe(401);
    });

    test('should handle concurrent sessions securely', async () => {
      const user = await User.query().insert({
        email: 'concurrent@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Concurrent',
        lastName: 'Test',
        emailVerified: true
      });

      // Create multiple sessions
      const loginPromises = Array(3).fill(0).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'password123'
          })
      );

      const loginResults = await Promise.all(loginPromises);
      const tokens = loginResults.map(r => r.body.token);

      // All tokens should work initially
      for (const token of tokens) {
        const response = await request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
      }

      // Logout from one session
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokens[0]}`);

      // First token should be invalid, others should still work
      const firstTokenResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tokens[0]}`);

      expect(firstTokenResponse.status).toBe(401);

      const secondTokenResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tokens[1]}`);

      expect(secondTokenResponse.status).toBe(200);
    });
  });

  describe('Rate Limiting Security', () => {
    test('should rate limit authentication attempts', async () => {
      const attempts = Array(15).fill(0).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'wrongpassword'
          })
      );

      const results = await Promise.all(attempts);
      
      // Some requests should be rate limited
      const rateLimited = results.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('should rate limit API requests per user', async () => {
      const user = await User.query().insert({
        email: 'ratelimit@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Rate',
        lastName: 'Limit',
        emailVerified: true
      });

      const token = generateToken({ userId: user.id, email: user.email });

      // Make many requests rapidly
      const requests = Array(50).fill(0).map(() =>
        request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${token}`)
      );

      const results = await Promise.all(requests);
      
      // Some should be rate limited
      const rateLimited = results.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('should implement progressive rate limiting', async () => {
      const user = await User.query().insert({
        email: 'progressive@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Progressive',
        lastName: 'Rate',
        emailVerified: true
      });

      const token = generateToken({ userId: user.id, email: user.email });

      // First batch of requests should mostly succeed
      const firstBatch = Array(10).fill(0).map(() =>
        request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${token}`)
      );

      const firstResults = await Promise.all(firstBatch);
      const firstSuccessful = firstResults.filter(r => r.status === 200);
      
      // Wait a bit then send second batch
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const secondBatch = Array(20).fill(0).map(() =>
        request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${token}`)
      );

      const secondResults = await Promise.all(secondBatch);
      const secondRateLimited = secondResults.filter(r => r.status === 429);

      // Rate limiting should become more aggressive
      expect(firstSuccessful.length).toBeGreaterThan(5);
      expect(secondRateLimited.length).toBeGreaterThan(5);
    });

    test('should handle distributed rate limiting', async () => {
      // Test rate limiting across multiple IPs/sessions
      const users = await Promise.all([
        User.query().insert({
          email: 'distributed1@test.com',
          password: '$2a$10$hashedpassword',
          firstName: 'Distributed',
          lastName: 'One',
          emailVerified: true
        }),
        User.query().insert({
          email: 'distributed2@test.com',
          password: '$2a$10$hashedpassword',
          firstName: 'Distributed',
          lastName: 'Two',
          emailVerified: true
        })
      ]);

      const tokens = users.map(user => 
        generateToken({ userId: user.id, email: user.email })
      );

      // Each user should have their own rate limit
      const user1Requests = Array(15).fill(0).map(() =>
        request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${tokens[0]}`)
      );

      const user2Requests = Array(15).fill(0).map(() =>
        request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${tokens[1]}`)
      );

      const [user1Results, user2Results] = await Promise.all([
        Promise.all(user1Requests),
        Promise.all(user2Requests)
      ]);

      // Both users should experience rate limiting independently
      const user1RateLimited = user1Results.filter(r => r.status === 429);
      const user2RateLimited = user2Results.filter(r => r.status === 429);

      expect(user1RateLimited.length).toBeGreaterThan(0);
      expect(user2RateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Advanced Security Threats', () => {
    test('should prevent timing attacks on authentication', async () => {
      const existingUser = await User.query().insert({
        email: 'timing@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Timing',
        lastName: 'Test',
        emailVerified: true
      });

      // Measure response times for existing vs non-existing users
      const existingUserTimes: number[] = [];
      const nonExistingUserTimes: number[] = [];

      for (let i = 0; i < 5; i++) {
        // Test existing user
        const startExisting = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({
            email: existingUser.email,
            password: 'wrongpassword'
          });
        existingUserTimes.push(Date.now() - startExisting);

        // Test non-existing user
        const startNonExisting = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'wrongpassword'
          });
        nonExistingUserTimes.push(Date.now() - startNonExisting);
      }

      const avgExisting = existingUserTimes.reduce((a, b) => a + b, 0) / existingUserTimes.length;
      const avgNonExisting = nonExistingUserTimes.reduce((a, b) => a + b, 0) / nonExistingUserTimes.length;

      // Response times should be similar to prevent timing attacks
      const timeDifference = Math.abs(avgExisting - avgNonExisting);
      expect(timeDifference).toBeLessThan(100); // Less than 100ms difference
    });

    test('should prevent account enumeration through registration', async () => {
      const existingUser = await User.query().insert({
        email: 'enumeration@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Enumeration',
        lastName: 'Test',
        emailVerified: true
      });

      // Try to register with existing email
      const existingEmailResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: existingUser.email,
          password: 'NewPassword123!',
          firstName: 'New',
          lastName: 'User'
        });

      // Try to register with new email
      const newEmailResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newemail@test.com',
          password: 'NewPassword123!',
          firstName: 'New',
          lastName: 'User'
        });

      // Response patterns should not reveal if email exists
      expect(existingEmailResponse.status).toBe(400);
      expect(newEmailResponse.status).toBe(201);
      
      // Error messages should be generic
      if (existingEmailResponse.body.error) {
        expect(existingEmailResponse.body.error).not.toContain('exists');
        expect(existingEmailResponse.body.error).not.toContain('taken');
        expect(existingEmailResponse.body.error).not.toContain('already');
      }
    });

    test('should prevent session fixation attacks', async () => {
      // Create user
      const user = await User.query().insert({
        email: 'sessionfix@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Session',
        lastName: 'Fix',
        emailVerified: true
      });

      // Login and get initial token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'password123'
        });

      const initialToken = loginResponse.body.token;

      // Use token
      const profileResponse1 = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${initialToken}`);

      expect(profileResponse1.status).toBe(200);

      // Login again - should get new token
      const secondLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'password123'
        });

      const secondToken = secondLoginResponse.body.token;

      // Tokens should be different
      expect(secondToken).not.toBe(initialToken);

      // Both tokens should work (unless session invalidation is implemented)
      const profileResponse2 = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${secondToken}`);

      expect(profileResponse2.status).toBe(200);
    });

    test('should prevent CSRF attacks', async () => {
      const user = await User.query().insert({
        email: 'csrf@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'CSRF',
        lastName: 'Test',
        emailVerified: true
      });

      const token = generateToken({ userId: user.id, email: user.email });

      // Attempt state-changing operation without proper headers
      const maliciousResponse = await request(app)
        .post('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .set('Origin', 'https://malicious-site.com')
        .send({
          firstName: 'Hacked'
        });

      // Should be rejected due to CORS or CSRF protection
      expect([400, 403, 405]).toContain(maliciousResponse.status);
    });

    test('should prevent clickjacking attacks', async () => {
      const response = await request(app)
        .get('/api/health');

      // Should have X-Frame-Options header
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(['DENY', 'SAMEORIGIN']).toContain(response.headers['x-frame-options']);
    });
  });
});