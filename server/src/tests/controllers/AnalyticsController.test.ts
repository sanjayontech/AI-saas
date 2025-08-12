import request from 'supertest';
import { app } from '../testApp';
import { TestDataFactory, TestCleanup } from '../utils/testHelpers';

describe('AnalyticsController - Integration Tests', () => {
  let testUser: any;
  let testChatbot: any;

  beforeEach(async () => {
    testUser = await TestDataFactory.createTestUser();
    testChatbot = await TestDataFactory.createTestChatbot({ userId: testUser.user.id! });
  });

  afterEach(async () => {
    await TestCleanup.cleanupAll();
  });

  describe('GET /api/v1/analytics/overview