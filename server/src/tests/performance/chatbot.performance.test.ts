import request from 'supertest';
import { app } from '../../index';
import { knex } from '../../database/connection';
import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { generateToken } from '../../utils/jwt';

describe('Chatbot Performance Tests', () => {
  let testUser: User;
  let authToken: string;
  let testChatbot: Chatbot;

  beforeAll(async () => {
    expect(process.env.NODE_ENV).toBe('test');
    await knex.migrate.latest();

    // Create test user and chatbot
    testUser = await User.query().insert({
      email: 'performance@test.com',
      password: '$2a$10$hashedpassword',
      firstName: 'Performance',
      lastName: 'Test',
      emailVerified: true
    });

    authToken = generateToken({ userId: testUser.id, email: testUser.email });

    testChatbot = await Chatbot.query().insert({
      userId: testUser.id,
      name: 'Performance Test Bot',
      description: 'Bot for performance testing',
      personality: 'Quick and efficient assistant',
      knowledgeBase: ['performance', 'testing', 'speed'],
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
  });

  beforeEach(async () => {
    // Clean conversation data before each test
    await knex('messages').del();
    await knex('conversations').del();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  describe('Response Time Performance', () => {
    test('should respond to single message within acceptable time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post(`/api/chatbots/${testChatbot.id}/chat`)
        .send({
          message: 'Hello, how are you?',
          sessionId: 'perf-session-1'
        });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
      
      console.log(`Single message response time: ${responseTime}ms`);
    });

    test('should handle conversation context efficiently', async () => {
      const sessionId = 'context-perf-session';
      let conversationId: string;

      // First message
      const firstResponse = await request(app)
        .post(`/api/chatbots/${testChatbot.id}/chat`)
        .send({
          message: 'My name is John',
          sessionId
        });

      conversationId = firstResponse.body.conversationId;

      // Measure subsequent messages with context
      const contextMessages = [
        'What is my name?',
        'Can you remember what I told you?',
        'Tell me about yourself',
        'What can you help me with?'
      ];

      const responseTimes: number[] = [];

      for (const message of contextMessages) {
        const startTime = Date.now();

        const response = await request(app)
          .post(`/api/chatbots/${testChatbot.id}/chat`)
          .send({
            message,
            sessionId,
            conversationId
          });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(response.status).toBe(200);
        responseTimes.push(responseTime);
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(averageResponseTime).toBeLessThan(6000); // Average under 6 seconds
      expect(maxResponseTime).toBeLessThan(10000); // Max under 10 seconds

      console.log(`Context conversation - Average: ${averageResponseTime.toFixed(2)}ms, Max: ${maxResponseTime}ms`);
    });

    test('should maintain performance with long conversation history', async () => {
      const sessionId = 'long-conversation-session';
      let conversationId: string;

      // Create a long conversation (20 exchanges)
      const messages = Array.from({ length: 20 }, (_, i) => `Message number ${i + 1}`);
      
      // First message to establish conversation
      const firstResponse = await request(app)
        .post(`/api/chatbots/${testChatbot.id}/chat`)
        .send({
          message: messages[0],
          sessionId
        });

      conversationId = firstResponse.body.conversationId;

      // Add messages to build context
      for (let i = 1; i < 15; i++) {
        await request(app)
          .post(`/api/chatbots/${testChatbot.id}/chat`)
          .send({
            message: messages[i],
            sessionId,
            conversationId
          });
      }

      // Measure performance of messages with long context
      const performanceTestMessages = messages.slice(15);
      const responseTimes: number[] = [];

      for (const message of performanceTestMessages) {
        const startTime = Date.now();

        const response = await request(app)
          .post(`/api/chatbots/${testChatbot.id}/chat`)
          .send({
            message,
            sessionId,
            conversationId
          });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(response.status).toBe(200);
        responseTimes.push(responseTime);
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      // Performance should not degrade significantly with long context
      expect(averageResponseTime).toBeLessThan(8000); // Allow slightly longer for complex context

      console.log(`Long conversation performance - Average: ${averageResponseTime.toFixed(2)}ms`);
    }, 60000); // Extended timeout for long conversation test
  });

  describe('Concurrent Request Performance', () => {
    test('should handle multiple concurrent conversations', async () => {
      const concurrentUsers = 5;
      const messagesPerUser = 3;

      const startTime = Date.now();

      const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
        const sessionId = `concurrent-session-${userIndex}`;
        const userMessages = Array.from({ length: messagesPerUser }, (_, msgIndex) => 
          `User ${userIndex} message ${msgIndex + 1}`
        );

        let conversationId: string;
        const userResponseTimes: number[] = [];

        for (const message of userMessages) {
          const messageStartTime = Date.now();

          const response = await request(app)
            .post(`/api/chatbots/${testChatbot.id}/chat`)
            .send({
              message,
              sessionId,
              ...(conversationId && { conversationId })
            });

          const messageEndTime = Date.now();
          const messageResponseTime = messageEndTime - messageStartTime;

          expect(response.status).toBe(200);
          userResponseTimes.push(messageResponseTime);

          if (!conversationId) {
            conversationId = response.body.conversationId;
          }
        }

        return {
          userIndex,
          responseTimes: userResponseTimes,
          averageResponseTime: userResponseTimes.reduce((a, b) => a + b, 0) / userResponseTimes.length
        };
      });

      const results = await Promise.all(userPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all users completed successfully
      expect(results).toHaveLength(concurrentUsers);

      const allResponseTimes = results.flatMap(r => r.responseTimes);
      const overallAverage = allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;
      const maxResponseTime = Math.max(...allResponseTimes);

      // Performance expectations for concurrent requests
      expect(overallAverage).toBeLessThan(10000); // Average under 10 seconds
      expect(maxResponseTime).toBeLessThan(15000); // Max under 15 seconds
      expect(totalTime).toBeLessThan(30000); // Total test under 30 seconds

      console.log(`Concurrent performance - Users: ${concurrentUsers}, Average: ${overallAverage.toFixed(2)}ms, Max: ${maxResponseTime}ms, Total: ${totalTime}ms`);
    }, 45000);

    test('should handle burst traffic efficiently', async () => {
      const burstSize = 10;
      const sessionId = 'burst-session';

      const startTime = Date.now();

      // Send burst of messages simultaneously
      const burstPromises = Array.from({ length: burstSize }, (_, index) =>
        request(app)
          .post(`/api/chatbots/${testChatbot.id}/chat`)
          .send({
            message: `Burst message ${index + 1}`,
            sessionId: `${sessionId}-${index}`
          })
      );

      const results = await Promise.allSettled(burstPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Count successful responses
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      ).length;

      const failed = results.length - successful;

      // At least 80% should succeed
      expect(successful / burstSize).toBeGreaterThanOrEqual(0.8);
      expect(totalTime).toBeLessThan(20000); // Burst should complete within 20 seconds

      console.log(`Burst traffic - Total: ${burstSize}, Successful: ${successful}, Failed: ${failed}, Time: ${totalTime}ms`);
    }, 30000);
  });

  describe('Database Performance', () => {
    test('should efficiently query conversation history', async () => {
      // Create test data
      const conversationCount = 50;
      const messagesPerConversation = 10;

      // Create conversations with messages
      for (let i = 0; i < conversationCount; i++) {
        const response = await request(app)
          .post(`/api/chatbots/${testChatbot.id}/chat`)
          .send({
            message: `Initial message for conversation ${i}`,
            sessionId: `db-perf-session-${i}`
          });

        const conversationId = response.body.conversationId;

        // Add additional messages to each conversation
        for (let j = 1; j < messagesPerConversation; j++) {
          await request(app)
            .post(`/api/chatbots/${testChatbot.id}/chat`)
            .send({
              message: `Message ${j} in conversation ${i}`,
              sessionId: `db-perf-session-${i}`,
              conversationId
            });
        }
      }

      // Test conversation history query performance
      const startTime = Date.now();

      const historyResponse = await request(app)
        .get(`/api/analytics/conversations/${testChatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          limit: 20,
          search: 'conversation'
        });

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.conversations).toBeDefined();
      expect(queryTime).toBeLessThan(2000); // Query should complete within 2 seconds

      console.log(`Conversation history query time: ${queryTime}ms`);
    }, 120000); // Extended timeout for data creation

    test('should efficiently generate analytics', async () => {
      // Use existing data from previous test or create minimal data
      const startTime = Date.now();

      const analyticsResponse = await request(app)
        .get(`/api/analytics/chatbot/${testChatbot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.totalConversations).toBeDefined();
      expect(queryTime).toBeLessThan(3000); // Analytics should generate within 3 seconds

      console.log(`Analytics generation time: ${queryTime}ms`);
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should handle large message content efficiently', async () => {
      const largeMessage = 'A'.repeat(5000); // 5KB message
      
      const startTime = Date.now();
      const initialMemory = process.memoryUsage();

      const response = await request(app)
        .post(`/api/chatbots/${testChatbot.id}/chat`)
        .send({
          message: largeMessage,
          sessionId: 'large-message-session'
        });

      const endTime = Date.now();
      const finalMemory = process.memoryUsage();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(8000); // Should handle large message within 8 seconds

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      console.log(`Large message - Time: ${responseTime}ms, Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    test('should maintain stable memory usage over multiple requests', async () => {
      const requestCount = 20;
      const initialMemory = process.memoryUsage();

      for (let i = 0; i < requestCount; i++) {
        const response = await request(app)
          .post(`/api/chatbots/${testChatbot.id}/chat`)
          .send({
            message: `Memory test message ${i}`,
            sessionId: `memory-test-session-${i}`
          });

        expect(response.status).toBe(200);

        // Force garbage collection periodically if available
        if (global.gc && i % 5 === 0) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable for 20 requests (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      console.log(`Memory stability test - Requests: ${requestCount}, Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    }, 60000);

    test('should handle memory pressure gracefully', async () => {
      const largeDataSets = Array(10).fill(0).map((_, index) => ({
        sessionId: `pressure-session-${index}`,
        message: 'X'.repeat(10000), // 10KB per message
        context: Array(50).fill(0).map((_, i) => `Context item ${i}: ${'Y'.repeat(100)}`)
      }));

      const initialMemory = process.memoryUsage();
      const responseTimes: number[] = [];

      for (const dataset of largeDataSets) {
        const startTime = Date.now();
        
        const response = await request(app)
          .post(`/api/chatbots/${testChatbot.id}/chat`)
          .send({
            message: dataset.message,
            sessionId: dataset.sessionId
          });

        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        expect(response.status).toBe(200);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      // Performance should not degrade significantly under memory pressure
      expect(averageResponseTime).toBeLessThan(10000);
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // Less than 200MB increase

      console.log(`Memory pressure test - Average response: ${averageResponseTime.toFixed(2)}ms, Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    }, 120000);
  });

  describe('Scalability Performance', () => {
    test('should handle increasing load gracefully', async () => {
      const loadLevels = [5, 10, 15, 20]; // Concurrent users
      const results: Array<{ level: number; averageTime: number; successRate: number }> = [];

      for (const level of loadLevels) {
        const promises = Array(level).fill(0).map(async (_, index) => {
          const startTime = Date.now();
          
          try {
            const response = await request(app)
              .post(`/api/chatbots/${testChatbot.id}/chat`)
              .send({
                message: `Load test message from user ${index}`,
                sessionId: `load-session-${level}-${index}`
              });

            const responseTime = Date.now() - startTime;
            return { success: response.status === 200, responseTime };
          } catch (error) {
            return { success: false, responseTime: Date.now() - startTime };
          }
        });

        const responses = await Promise.all(promises);
        const successful = responses.filter(r => r.success);
        const averageTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
        const successRate = successful.length / responses.length;

        results.push({
          level,
          averageTime,
          successRate
        });

        console.log(`Load level ${level}: ${(successRate * 100).toFixed(1)}% success, ${averageTime.toFixed(2)}ms average`);

        // Success rate should remain high
        expect(successRate).toBeGreaterThan(0.8);
        
        // Response time should not increase dramatically
        if (results.length > 1) {
          const previousResult = results[results.length - 2];
          const timeIncrease = averageTime / previousResult.averageTime;
          expect(timeIncrease).toBeLessThan(3); // Should not triple response time
        }
      }
    }, 180000);

    test('should handle sustained load over time', async () => {
      const duration = 30000; // 30 seconds
      const requestInterval = 1000; // 1 request per second
      const startTime = Date.now();
      const responseTimes: number[] = [];
      const errors: number[] = [];

      while (Date.now() - startTime < duration) {
        const requestStart = Date.now();
        
        try {
          const response = await request(app)
            .post(`/api/chatbots/${testChatbot.id}/chat`)
            .send({
              message: `Sustained load test at ${new Date().toISOString()}`,
              sessionId: `sustained-session-${Date.now()}`
            });

          const responseTime = Date.now() - requestStart;
          responseTimes.push(responseTime);

          if (response.status !== 200) {
            errors.push(response.status);
          }
        } catch (error) {
          errors.push(500);
        }

        // Wait for next interval
        const elapsed = Date.now() - requestStart;
        if (elapsed < requestInterval) {
          await new Promise(resolve => setTimeout(resolve, requestInterval - elapsed));
        }
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const errorRate = errors.length / (responseTimes.length + errors.length);

      console.log(`Sustained load test - Requests: ${responseTimes.length}, Errors: ${errors.length}, Average time: ${averageResponseTime.toFixed(2)}ms, Error rate: ${(errorRate * 100).toFixed(2)}%`);

      // System should maintain performance under sustained load
      expect(averageResponseTime).toBeLessThan(8000);
      expect(errorRate).toBeLessThan(0.1); // Less than 10% error rate
    }, 45000);
  });
});