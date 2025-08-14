// Mock Redis to prevent connection attempts during testing
jest.mock('../../config/redis', () => ({
  redisClient: {
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn()
  }
}));

import { TestSessionService } from '../../services/TestSessionService';

describe('TestSessionService - Basic Tests', () => {
  describe('Service Structure', () => {
    it('should have all required static methods', () => {
      expect(typeof TestSessionService.createTestSession).toBe('function');
      expect(typeof TestSessionService.getTestSession).toBe('function');
      expect(typeof TestSessionService.processTestMessage).toBe('function');
      expect(typeof TestSessionService.resetTestSession).toBe('function');
      expect(typeof TestSessionService.deleteTestSession).toBe('function');
      expect(typeof TestSessionService.getTestSessionMessages).toBe('function');
      expect(typeof TestSessionService.getUserTestSessions).toBe('function');
      expect(typeof TestSessionService.cleanupExpiredSessions).toBe('function');
      expect(typeof TestSessionService.validateSessionAccess).toBe('function');
    });

    it('should have proper method signatures', () => {
      // Test that methods exist and are callable
      expect(TestSessionService.createTestSession).toBeDefined();
      expect(TestSessionService.getTestSession).toBeDefined();
      expect(TestSessionService.processTestMessage).toBeDefined();
      expect(TestSessionService.resetTestSession).toBeDefined();
      expect(TestSessionService.deleteTestSession).toBeDefined();
      expect(TestSessionService.getTestSessionMessages).toBeDefined();
      expect(TestSessionService.getUserTestSessions).toBeDefined();
      expect(TestSessionService.cleanupExpiredSessions).toBeDefined();
      expect(TestSessionService.validateSessionAccess).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for getUserTestSessions without chatbotId', async () => {
      await expect(TestSessionService.getUserTestSessions('user-123'))
        .rejects.toThrow('ChatbotId is required for getting user test sessions');
    });
  });
});