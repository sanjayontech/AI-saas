import request from 'supertest';
import { app } from '../../index';
import { knex } from '../../database/connection';
import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { generateToken } from '../../utils/jwt';

describe('Load Testing and Stress Testing', () => {
  let testUsers: User[] = [];
  let testChatbots: Chatbot[] = [];
  let authTokens: string[] = [];

  beforeAll(async () => {
    expect(process.env.NODE_ENV).toBe('test');
    await knex.migrate.latest();

    // Create multiple test users and chatbots for load testing
    for (let i = 0; i < 5; i++) {
      const user = await User.query().insert({
        email: `loadtest${i}@test.com`,
        password: '$2a$10$hashedpassword',
        firstName: `LoadTest${i}`,
        lastName: 'User',
        emailVerified: true
      });

      testUsers.push(user);
      authTokens.push(generateToken({ userId: user.id, email: user.email }));

      const chatbot = await Chatbot.query().insert({
        userId: user.id,
        name: `Load Test Bot ${i}`,
        description: `Bot ${i} for load testing`,
        personality: 'Efficient load testing assistant',
        knowledgeBase: ['load testing', 'performance', 'stress testing'],
        appearance: {
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
          fontFamily: 'Arial',
          borderRadius: 8,
          position: 'bottom-right'
        },
        settings: {
          maxTokens: 100, // Smaller for faster responses
          temperature: 0.5,
          responseDelay: 100,
          fallbackMessage: 'Load test response',
          collectUserInfo: false
        }
      });

      testChatbots.push(chatbot);
    }
  });

  beforeEach(async () => {
    // Clean conversation data before each test
    await knex('messages').del();
    await knex('conversations').del();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  describe('Concurrent User Load Testing', () => {
    test('should handle 50 concurrent authentication requests', async () => {
      const concurrentRequests = 50;
      const startTime = Date.now();

      const promises = Array(concurrentRequests).fill(0).map(async (_, index) => {
        const userIndex = index % testUsers.length;
        const startRequestTime = Date.now();

        try {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: testUsers[userIndex].email,
              password: 'password123'
            });

          const requestTime = Date.now() - startRequestTime;
          return {
            success: response.status === 200,
            responseTime: requestTime,
            status: response.status
          };
        } catch (error) {
          return {
            success: false,
            responseTime: Date.now() - startRequestTime,
            status: 500
          };
        }
      });

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      const successful = results.filter(r => r.success);
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      const successRate = successful.length / results.length;

      console.log(`Concurrent Auth Load Test:
        - Requests: ${concurrentRequests}
        - Success Rate: ${(successRate * 100).toFixed(2)}%
        - Average Response Time: ${averageResponseTime.toFixed(2)}ms
        - Max Response Time: ${maxResponseTime}ms
        - Total Time: ${totalTime}ms`);

      // Performance expectations
      expect(successRate).toBeGreaterThan(0.9); // 90% success rate
      expect(averageResponseTime).toBeLessThan(2000); // Average under 2 seconds
      expect(maxResponseTime).toBeLessThan(5000); // Max under 5 seconds
    }, 30000);

    test('should handle 100 concurrent chatbot conversations', async () => {
      const concurrentConversations = 100;
      const messagesPerConversation = 3;
      const startTime = Date.now();

      const promises = Array(concurrentConversations).fill(0).map(async (_, index) => {
        const userIndex = index % testUsers.length;
        const chatbotIndex = index % testChatbots.length;
        const sessionId = `load-session-${index}`;
        
        const conversationResults = [];
        let conversationId: string | undefined;

        for (let msgIndex = 0; msgIndex < messagesPerConversation; msgIndex++) {
          const messageStartTime = Date.now();
          
          try {
            const response = await request(app)
              .post(`/api/chatbots/${testChatbots[chatbotIndex].id}/chat`)
              .send({
                message: `Load test message ${msgIndex + 1} from user ${index}`,
                sessionId,
                ...(conversationId && { conversationId })
              });

            const messageTime = Date.now() - messageStartTime;
            
            if (response.status === 200 && !conversationId) {
              conversationId = response.body.conversationId;
            }

            conversationResults.push({
              success: response.status === 200,
              responseTime: messageTime,
              status: response.status
            });
          } catch (error) {
            conversationResults.push({
              success: false,
              responseTime: Date.now() - messageStartTime,
              status: 500
            });
          }
        }

        return conversationResults;
      });

      const allResults = (await Promise.all(promises)).flat();
      const totalTime = Date.now() - startTime;

      const successful = allResults.filter(r => r.success);
      const averageResponseTime = allResults.reduce((sum, r) => sum + r.responseTime, 0) / allResults.length;
      const maxResponseTime = Math.max(...allResults.map(r => r.responseTime));
      const successRate = successful.length / allResults.length;

      console.log(`Concurrent Chat Load Test:
        - Total Messages: ${allResults.length}
        - Success Rate: ${(successRate * 100).toFixed(2)}%
        - Average Response Time: ${averageResponseTime.toFixed(2)}ms
        - Max Response Time: ${maxResponseTime}ms
        - Total Time: ${totalTime}ms
        - Throughput: ${(allResults.length / (totalTime / 1000)).toFixed(2)} messages/second`);

      // Performance expectations
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate
      expect(averageResponseTime).toBeLessThan(5000); // Average under 5 seconds
      expect(maxResponseTime).toBeLessThan(15000); // Max under 15 seconds
    }, 120000);

    test('should handle sustained high load over time', async () => {
      const duration = 60000; // 1 minute
      const requestsPerSecond = 10;
      const interval = 1000 / requestsPerSecond;
      
      const startTime = Date.now();
      const results: Array<{ success: boolean; responseTime: number; timestamp: number }> = [];
      let requestCount = 0;

      while (Date.now() - startTime < duration) {
        const requestStartTime = Date.now();
        const userIndex = requestCount % testUsers.length;
        const chatbotIndex = requestCount % testChatbots.length;

        try {
          const response = await request(app)
            .post(`/api/chatbots/${testChatbots[chatbotIndex].id}/chat`)
            .send({
              message: `Sustained load message ${requestCount}`,
              sessionId: `sustained-session-${requestCount}`
            });

          results.push({
            success: response.status === 200,
            responseTime: Date.now() - requestStartTime,
            timestamp: Date.now()
          });
        } catch (error) {
          results.push({
            success: false,
            responseTime: Date.now() - requestStartTime,
            timestamp: Date.now()
          });
        }

        requestCount++;

        // Wait for next interval
        const elapsed = Date.now() - requestStartTime;
        if (elapsed < interval) {
          await new Promise(resolve => setTimeout(resolve, interval - elapsed));
        }
      }

      const totalTime = Date.now() - startTime;
      const successful = results.filter(r => r.success);
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const successRate = successful.length / results.length;
      const actualThroughput = results.length / (totalTime / 1000);

      // Analyze performance degradation over time
      const firstHalf = results.slice(0, Math.floor(results.length / 2));
      const secondHalf = results.slice(Math.floor(results.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.responseTime, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.responseTime, 0) / secondHalf.length;
      const performanceDegradation = secondHalfAvg / firstHalfAvg;

      console.log(`Sustained Load Test:
        - Duration: ${totalTime}ms
        - Total Requests: ${results.length}
        - Success Rate: ${(successRate * 100).toFixed(2)}%
        - Average Response Time: ${averageResponseTime.toFixed(2)}ms
        - Actual Throughput: ${actualThroughput.toFixed(2)} req/sec
        - Performance Degradation: ${performanceDegradation.toFixed(2)}x`);

      // Performance expectations
      expect(successRate).toBeGreaterThan(0.85); // 85% success rate
      expect(averageResponseTime).toBeLessThan(3000); // Average under 3 seconds
      expect(performanceDegradation).toBeLessThan(2); // Performance shouldn't degrade more than 2x
      expect(actualThroughput).toBeGreaterThan(5); // At least 5 requests per second
    }, 90000);
  });

  describe('Database Load Testing', () => {
    test('should handle high-volume data queries efficiently', async () => {
      // Create a large dataset
      const conversationCount = 100;
      const messagesPerConversation = 20;

      console.log('Creating test dataset...');
      
      // Create conversations and messages
      for (let i = 0; i < conversationCount; i++) {
        const userIndex = i % testUsers.length;
        const chatbotIndex = i % testChatbots.length;

        const response = await request(app)
          .post(`/api/chatbots/${testChatbots[chatbotIndex].id}/chat`)
          .send({
            message: `Initial message for conversation ${i}`,
            sessionId: `db-load-session-${i}`
          });

        if (response.status === 200) {
          const conversationId = response.body.conversationId;

          // Add more messages to the conversation
          for (let j = 1; j < messagesPerConversation; j++) {
            await request(app)
              .post(`/api/chatbots/${testChatbots[chatbotIndex].id}/chat`)
              .send({
                message: `Message ${j} in conversation ${i}`,
                sessionId: `db-load-session-${i}`,
                conversationId
              });
          }
        }
      }

      console.log('Dataset created. Testing queries...');

      // Test concurrent analytics queries
      const queryPromises = testUsers.map(async (user, index) => {
        const startTime = Date.now();
        
        const response = await request(app)
          .get(`/api/analytics/chatbot/${testChatbots[index].id}`)
          .set('Authorization', `Bearer ${authTokens[index]}`)
          .query({
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString()
          });

        const queryTime = Date.now() - startTime;
        
        return {
          success: response.status === 200,
          queryTime,
          dataSize: JSON.stringify(response.body).length
        };
      });

      const queryResults = await Promise.all(queryPromises);
      const averageQueryTime = queryResults.reduce((sum, r) => sum + r.queryTime, 0) / queryResults.length;
      const maxQueryTime = Math.max(...queryResults.map(r => r.queryTime));
      const successRate = queryResults.filter(r => r.success).length / queryResults.length;

      console.log(`Database Load Test:
        - Conversations Created: ${conversationCount}
        - Messages Created: ${conversationCount * messagesPerConversation}
        - Query Success Rate: ${(successRate * 100).toFixed(2)}%
        - Average Query Time: ${averageQueryTime.toFixed(2)}ms
        - Max Query Time: ${maxQueryTime}ms`);

      // Performance expectations
      expect(successRate).toBe(1); // All queries should succeed
      expect(averageQueryTime).toBeLessThan(2000); // Average under 2 seconds
      expect(maxQueryTime).toBeLessThan(5000); // Max under 5 seconds
    }, 180000);

    test('should handle database connection pool under stress', async () => {
      const concurrentQueries = 50;
      const queriesPerConnection = 5;

      const promises = Array(concurrentQueries).fill(0).map(async (_, index) => {
        const results = [];
        
        for (let i = 0; i < queriesPerConnection; i++) {
          const startTime = Date.now();
          
          try {
            // Mix different types of queries
            const queryType = i % 3;
            let response;
            
            switch (queryType) {
              case 0:
                response = await request(app).get('/api/health');
                break;
              case 1:
                response = await request(app)
                  .get('/api/users/profile')
                  .set('Authorization', `Bearer ${authTokens[index % authTokens.length]}`);
                break;
              case 2:
                response = await request(app)
                  .get(`/api/chatbots/${testChatbots[index % testChatbots.length].id}`)
                  .set('Authorization', `Bearer ${authTokens[index % authTokens.length]}`);
                break;
            }

            results.push({
              success: response.status < 400,
              queryTime: Date.now() - startTime,
              queryType
            });
          } catch (error) {
            results.push({
              success: false,
              queryTime: Date.now() - startTime,
              queryType: -1
            });
          }
        }
        
        return results;
      });

      const allResults = (await Promise.all(promises)).flat();
      const successful = allResults.filter(r => r.success);
      const averageQueryTime = allResults.reduce((sum, r) => sum + r.queryTime, 0) / allResults.length;
      const successRate = successful.length / allResults.length;

      console.log(`Connection Pool Stress Test:
        - Total Queries: ${allResults.length}
        - Success Rate: ${(successRate * 100).toFixed(2)}%
        - Average Query Time: ${averageQueryTime.toFixed(2)}ms`);

      // Performance expectations
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(averageQueryTime).toBeLessThan(1000); // Average under 1 second
    }, 60000);
  });

  describe('Memory and Resource Stress Testing', () => {
    test('should handle memory-intensive operations', async () => {
      const initialMemory = process.memoryUsage();
      const largeDataOperations = 20;

      const results = [];

      for (let i = 0; i < largeDataOperations; i++) {
        const operationStartTime = Date.now();
        const operationMemoryStart = process.memoryUsage();

        // Create large payload
        const largeMessage = 'X'.repeat(50000); // 50KB message
        const userIndex = i % testUsers.length;
        const chatbotIndex = i % testChatbots.length;

        try {
          const response = await request(app)
            .post(`/api/chatbots/${testChatbots[chatbotIndex].id}/chat`)
            .send({
              message: largeMessage,
              sessionId: `memory-stress-${i}`
            });

          const operationTime = Date.now() - operationStartTime;
          const operationMemoryEnd = process.memoryUsage();
          const memoryIncrease = operationMemoryEnd.heapUsed - operationMemoryStart.heapUsed;

          results.push({
            success: response.status === 200,
            operationTime,
            memoryIncrease,
            heapUsed: operationMemoryEnd.heapUsed
          });

          // Force garbage collection if available
          if (global.gc && i % 5 === 0) {
            global.gc();
          }
        } catch (error) {
          results.push({
            success: false,
            operationTime: Date.now() - operationStartTime,
            memoryIncrease: 0,
            heapUsed: process.memoryUsage().heapUsed
          });
        }
      }

      const finalMemory = process.memoryUsage();
      const totalMemoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const averageOperationTime = results.reduce((sum, r) => sum + r.operationTime, 0) / results.length;
      const successRate = results.filter(r => r.success).length / results.length;
      const maxHeapUsed = Math.max(...results.map(r => r.heapUsed));

      console.log(`Memory Stress Test:
        - Operations: ${largeDataOperations}
        - Success Rate: ${(successRate * 100).toFixed(2)}%
        - Average Operation Time: ${averageOperationTime.toFixed(2)}ms
        - Total Memory Increase: ${(totalMemoryIncrease / 1024 / 1024).toFixed(2)}MB
        - Max Heap Used: ${(maxHeapUsed / 1024 / 1024).toFixed(2)}MB`);

      // Performance expectations
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate
      expect(averageOperationTime).toBeLessThan(5000); // Average under 5 seconds
      expect(totalMemoryIncrease).toBeLessThan(500 * 1024 * 1024); // Less than 500MB increase
    }, 120000);

    test('should recover from resource exhaustion', async () => {
      // Simulate resource exhaustion by creating many concurrent requests
      const exhaustionRequests = 100;
      const recoveryRequests = 10;

      console.log('Simulating resource exhaustion...');

      // Create exhaustion load
      const exhaustionPromises = Array(exhaustionRequests).fill(0).map(async (_, index) => {
        try {
          const response = await request(app)
            .post(`/api/chatbots/${testChatbots[index % testChatbots.length].id}/chat`)
            .send({
              message: `Exhaustion message ${index}`,
              sessionId: `exhaustion-session-${index}`
            });

          return { success: response.status === 200, status: response.status };
        } catch (error) {
          return { success: false, status: 500 };
        }
      });

      const exhaustionResults = await Promise.all(exhaustionPromises);
      const exhaustionSuccessRate = exhaustionResults.filter(r => r.success).length / exhaustionResults.length;

      console.log(`Exhaustion phase success rate: ${(exhaustionSuccessRate * 100).toFixed(2)}%`);

      // Wait for system to recover
      await new Promise(resolve => setTimeout(resolve, 5000));

      console.log('Testing recovery...');

      // Test recovery
      const recoveryPromises = Array(recoveryRequests).fill(0).map(async (_, index) => {
        const startTime = Date.now();
        
        try {
          const response = await request(app)
            .post(`/api/chatbots/${testChatbots[index % testChatbots.length].id}/chat`)
            .send({
              message: `Recovery message ${index}`,
              sessionId: `recovery-session-${index}`
            });

          return {
            success: response.status === 200,
            responseTime: Date.now() - startTime,
            status: response.status
          };
        } catch (error) {
          return {
            success: false,
            responseTime: Date.now() - startTime,
            status: 500
          };
        }
      });

      const recoveryResults = await Promise.all(recoveryPromises);
      const recoverySuccessRate = recoveryResults.filter(r => r.success).length / recoveryResults.length;
      const averageRecoveryTime = recoveryResults.reduce((sum, r) => sum + r.responseTime, 0) / recoveryResults.length;

      console.log(`Resource Exhaustion Recovery Test:
        - Exhaustion Success Rate: ${(exhaustionSuccessRate * 100).toFixed(2)}%
        - Recovery Success Rate: ${(recoverySuccessRate * 100).toFixed(2)}%
        - Average Recovery Time: ${averageRecoveryTime.toFixed(2)}ms`);

      // System should recover
      expect(recoverySuccessRate).toBeGreaterThan(0.8); // 80% recovery success rate
      expect(averageRecoveryTime).toBeLessThan(3000); // Recovery should be fast
    }, 180000);
  });
});