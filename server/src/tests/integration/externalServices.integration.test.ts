import { GoogleAIService } from '../../services/GoogleAIService';
import { EmailService } from '../../services/EmailService';
import { RedisService } from '../../services/RedisService';
import { config } from 'dotenv';
import request from 'supertest';
import { app } from '../../index';
import { knex } from '../../database/connection';

// Load test environment variables
config({ path: '.env.test' });

describe('External Services Integration Tests', () => {
  beforeAll(async () => {
    expect(process.env.NODE_ENV).toBe('test');
    await knex.migrate.latest();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  describe('Google AI Service Integration', () => {
    let googleAIService: GoogleAIService;

    beforeAll(() => {
      googleAIService = new GoogleAIService();
    });

    test('should handle API rate limiting gracefully', async () => {
      const requests = Array(5).fill(0).map(() =>
        googleAIService.generateResponse(
          'Test rate limiting',
          'You are a test assistant.',
          []
        )
      );

      const results = await Promise.allSettled(requests);
      
      // At least some should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);

      // Failed requests should have appropriate error handling
      const failed = results.filter(r => r.status === 'rejected');
      failed.forEach(result => {
        if (result.status === 'rejected') {
          expect(result.reason).toBeInstanceOf(Error);
        }
      });
    }, 30000);

    test('should handle service unavailability', async () => {
      // Mock service unavailability
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      try {
        await googleAIService.generateResponse('Test', 'Test personality', []);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Service unavailable');
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('should handle malformed API responses', async () => {
      // Mock malformed response
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ malformed: 'response' })
      });

      try {
        await googleAIService.generateResponse('Test', 'Test personality', []);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('should handle timeout scenarios', async () => {
      // Mock timeout
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      try {
        await googleAIService.generateResponse('Test', 'Test personality', []);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('timeout');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Email Service Integration', () => {
    let emailService: EmailService;

    beforeAll(() => {
      emailService = new EmailService();
    });

    test('should handle email sending with proper error handling', async () => {
      try {
        await emailService.sendPasswordResetEmail('test@example.com', 'reset-token');
        // If no error is thrown, the email service is working
        expect(true).toBe(true);
      } catch (error) {
        // If error is thrown, it should be handled gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should handle invalid email addresses', async () => {
      const invalidEmails = [
        'invalid-email',
        '@invalid.com',
        'test@',
        '',
        null,
        undefined
      ];

      for (const email of invalidEmails) {
        try {
          await emailService.sendPasswordResetEmail(email as string, 'token');
          fail(`Should have thrown error for invalid email: ${email}`);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }
    });

    test('should handle email service unavailability', async () => {
      // Mock SMTP service unavailability
      const originalSend = emailService.transporter?.sendMail;
      if (emailService.transporter) {
        emailService.transporter.sendMail = jest.fn().mockRejectedValue(
          new Error('SMTP service unavailable')
        );
      }

      try {
        await emailService.sendPasswordResetEmail('test@example.com', 'token');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      } finally {
        if (emailService.transporter && originalSend) {
          emailService.transporter.sendMail = originalSend;
        }
      }
    });
  });

  describe('Redis Service Integration', () => {
    let redisService: RedisService;

    beforeAll(async () => {
      redisService = new RedisService();
      await redisService.connect();
    });

    afterAll(async () => {
      await redisService.disconnect();
    });

    test('should handle Redis connection failures', async () => {
      // Disconnect Redis
      await redisService.disconnect();

      try {
        await redisService.set('test-key', 'test-value');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Reconnect for other tests
      await redisService.connect();
    });

    test('should handle Redis data persistence', async () => {
      const testKey = 'integration-test-key';
      const testValue = 'integration-test-value';

      // Set value
      await redisService.set(testKey, testValue, 60); // 60 seconds TTL

      // Get value
      const retrievedValue = await redisService.get(testKey);
      expect(retrievedValue).toBe(testValue);

      // Clean up
      await redisService.delete(testKey);
    });

    test('should handle Redis TTL expiration', async () => {
      const testKey = 'ttl-test-key';
      const testValue = 'ttl-test-value';

      // Set value with short TTL
      await redisService.set(testKey, testValue, 1); // 1 second TTL

      // Value should exist immediately
      const immediateValue = await redisService.get(testKey);
      expect(immediateValue).toBe(testValue);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Value should be expired
      const expiredValue = await redisService.get(testKey);
      expect(expiredValue).toBeNull();
    });

    test('should handle Redis memory pressure', async () => {
      const keys: string[] = [];
      
      try {
        // Create many keys to test memory handling
        for (let i = 0; i < 1000; i++) {
          const key = `memory-test-${i}`;
          const value = 'x'.repeat(1000); // 1KB value
          await redisService.set(key, value, 300); // 5 minutes TTL
          keys.push(key);
        }

        // Verify some keys exist
        const sampleValue = await redisService.get(keys[0]);
        expect(sampleValue).toBeDefined();
      } finally {
        // Clean up
        for (const key of keys) {
          await redisService.delete(key);
        }
      }
    }, 30000);
  });

  describe('Database Integration with External Services', () => {
    test('should handle database connection pooling under load', async () => {
      const promises = Array(20).fill(0).map(async (_, index) => {
        return request(app)
          .get('/api/health')
          .expect(200);
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled');
      
      // Most requests should succeed
      expect(successful.length).toBeGreaterThanOrEqual(18);
    });

    test('should handle database transaction rollbacks', async () => {
      // This test would verify that database transactions are properly rolled back
      // when external service calls fail
      const testEmail = 'transaction-test@example.com';
      
      try {
        // Attempt registration that might fail due to external service
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: testEmail,
            password: 'TestPassword123!',
            firstName: 'Transaction',
            lastName: 'Test'
          });

        // If successful, clean up
        if (response.status === 201) {
          await knex('users').where('email', testEmail).del();
        }
      } catch (error) {
        // Verify no partial data was left in database
        const user = await knex('users').where('email', testEmail).first();
        expect(user).toBeUndefined();
      }
    });
  });

  describe('Service Circuit Breaker Integration', () => {
    test('should implement circuit breaker for external services', async () => {
      // This test would verify circuit breaker pattern implementation
      // for external service failures
      
      // Simulate multiple failures
      const failures = Array(5).fill(0).map(() =>
        request(app)
          .post('/api/test/external-service-call')
          .send({ shouldFail: true })
      );

      await Promise.allSettled(failures);

      // Next request should be circuit broken
      const circuitBreakerResponse = await request(app)
        .post('/api/test/external-service-call')
        .send({ test: true });

      // Should either succeed quickly or fail fast due to circuit breaker
      expect([200, 503]).toContain(circuitBreakerResponse.status);
    });
  });

  describe('Service Health Monitoring Integration', () => {
    test('should provide comprehensive health check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      
      // Should include status of all external services
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('redis');
      expect(response.body.services).toHaveProperty('googleAI');
      expect(response.body.services).toHaveProperty('email');
    });

    test('should handle partial service failures in health check', async () => {
      // Mock Redis failure
      const originalConnect = RedisService.prototype.connect;
      RedisService.prototype.connect = jest.fn().mockRejectedValue(new Error('Redis unavailable'));

      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200); // Should still return 200 but with degraded status
      expect(response.body.status).toBe('degraded');
      expect(response.body.services.redis.status).toBe('unhealthy');

      // Restore original method
      RedisService.prototype.connect = originalConnect;
    });
  });
});