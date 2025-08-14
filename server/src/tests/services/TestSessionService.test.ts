import { TestSessionService } from '../../services/TestSessionService';
import { TestSession, TestMessage } from '../../models/TestSession';
import { Chatbot } from '../../models/Chatbot';
import { logger } from '../../services/LoggingService';
import { db } from '../../database/connection';

// Mock dependencies
jest.mock('../../models/TestSession');
jest.mock('../../models/Chatbot');
jest.mock('../../services/LoggingService');

const MockTestSession = TestSession as jest.MockedClass<typeof TestSession>;
const MockTestMessage = TestMessage as jest.MockedClass<typeof TestMessage>;
const MockChatbot = Chatbot as jest.MockedClass<typeof Chatbot>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock static methods
(MockTestSession.findById as jest.Mock) = jest.fn();
(MockTestSession.create as jest.Mock) = jest.fn();
(MockTestSession.findByUserIdAndChatbotId as jest.Mock) = jest.fn();
(MockTestSession.cleanupExpiredSessions as jest.Mock) = jest.fn();
(MockChatbot.findByIdAndUserId as jest.Mock) = jest.fn();
(MockChatbot.findById as jest.Mock) = jest.fn();

describe('TestSessionService', () => {
  const mockUserId = 'user-123';
  const mockChatbotId = 'chatbot-456';
  const mockSessionId = 'session-789';

  const mockChatbot = {
    id: mockChatbotId,
    userId: mockUserId,
    name: 'Test Bot',
    personality: 'helpful and friendly',
    knowledgeBase: ['help', 'support', 'faq'],
    appearance: {},
    settings: {}
  } as any;

  const mockSession = {
    id: mockSessionId,
    chatbotId: mockChatbotId,
    userId: mockUserId,
    debugMode: false,
    createdAt: new Date(),
    lastActivity: new Date(),
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    isExpired: jest.fn().mockReturnValue(false),
    addMessage: jest.fn(),
    getMessages: jest.fn(),
    reset: jest.fn(),
    delete: jest.fn(),
    updateLastActivity: jest.fn()
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTestSession', () => {
    it('should create a new test session successfully', async () => {
      (MockChatbot.findByIdAndUserId as jest.Mock).mockResolvedValue(mockChatbot);
      (MockTestSession.findByUserIdAndChatbotId as jest.Mock).mockResolvedValue([]);
      (MockTestSession.create as jest.Mock).mockResolvedValue(mockSession);

      const result = await TestSessionService.createTestSession({
        chatbotId: mockChatbotId,
        userId: mockUserId,
        debugMode: true
      });

      expect(MockChatbot.findByIdAndUserId).toHaveBeenCalledWith(mockChatbotId, mockUserId);
      expect(MockTestSession.create).toHaveBeenCalledWith({
        chatbotId: mockChatbotId,
        userId: mockUserId,
        debugMode: true
      });
      expect(result).toBe(mockSession);
      expect(mockLogger.info).toHaveBeenCalledWith('Test session created', expect.any(Object));
    });

    it('should throw error if chatbot not found', async () => {
      MockChatbot.findByIdAndUserId.mockResolvedValue(null);

      await expect(TestSessionService.createTestSession({
        chatbotId: mockChatbotId,
        userId: mockUserId
      })).rejects.toThrow('Chatbot not found or access denied');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should clean up oldest session when limit exceeded', async () => {
      const oldSession = { ...mockSession, id: 'old-session', delete: jest.fn() };
      const existingSessions = [mockSession, mockSession, oldSession];

      MockChatbot.findByIdAndUserId.mockResolvedValue(mockChatbot);
      MockTestSession.findByUserIdAndChatbotId.mockResolvedValue(existingSessions);
      MockTestSession.create.mockResolvedValue(mockSession);

      await TestSessionService.createTestSession({
        chatbotId: mockChatbotId,
        userId: mockUserId
      });

      expect(oldSession.delete).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cleaned up oldest test session due to limit',
        expect.any(Object)
      );
    });
  });

  describe('getTestSession', () => {
    it('should return session for valid user', async () => {
      MockTestSession.findById.mockResolvedValue(mockSession);

      const result = await TestSessionService.getTestSession(mockSessionId, mockUserId);

      expect(MockTestSession.findById).toHaveBeenCalledWith(mockSessionId);
      expect(result).toBe(mockSession);
    });

    it('should return null if session not found', async () => {
      MockTestSession.findById.mockResolvedValue(null);

      const result = await TestSessionService.getTestSession(mockSessionId, mockUserId);

      expect(result).toBeNull();
    });

    it('should throw error for unauthorized access', async () => {
      const unauthorizedSession = { ...mockSession, userId: 'other-user' };
      MockTestSession.findById.mockResolvedValue(unauthorizedSession);

      await expect(TestSessionService.getTestSession(mockSessionId, mockUserId))
        .rejects.toThrow('Access denied');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unauthorized test session access attempt',
        expect.any(Object)
      );
    });

    it('should delete and return null for expired session', async () => {
      const expiredSession = { ...mockSession, isExpired: jest.fn().mockReturnValue(true) };
      MockTestSession.findById.mockResolvedValue(expiredSession);

      const result = await TestSessionService.getTestSession(mockSessionId, mockUserId);

      expect(expiredSession.delete).toHaveBeenCalled();
      expect(result).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Expired test session accessed, cleaning up',
        expect.any(Object)
      );
    });
  });

  describe('processTestMessage', () => {
    beforeEach(() => {
      MockTestSession.findById.mockResolvedValue(mockSession);
      MockChatbot.findById.mockResolvedValue(mockChatbot);
    });

    it('should process message and return response', async () => {
      const message = 'Hello, I need help';
      
      const result = await TestSessionService.processTestMessage({
        sessionId: mockSessionId,
        message,
        userId: mockUserId
      });

      expect(mockSession.addMessage).toHaveBeenCalledWith('user', message);
      expect(mockSession.addMessage).toHaveBeenCalledWith('assistant', expect.any(String), undefined);
      expect(result).toHaveProperty('message');
      expect(result.debugInfo).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Test message processed', expect.any(Object));
    });

    it('should include debug info when debug mode is enabled', async () => {
      const debugSession = { ...mockSession, debugMode: true };
      MockTestSession.findById.mockResolvedValue(debugSession);

      const result = await TestSessionService.processTestMessage({
        sessionId: mockSessionId,
        message: 'Test message',
        userId: mockUserId
      });

      expect(result.debugInfo).toBeDefined();
      expect(result.debugInfo).toHaveProperty('responseTime');
      expect(result.debugInfo).toHaveProperty('tokensUsed');
      expect(result.debugInfo).toHaveProperty('knowledgeBaseHits');
      expect(result.debugInfo).toHaveProperty('confidence');
      expect(result.debugInfo).toHaveProperty('modelUsed');
    });

    it('should throw error if session not found', async () => {
      MockTestSession.findById.mockResolvedValue(null);

      await expect(TestSessionService.processTestMessage({
        sessionId: mockSessionId,
        message: 'Test',
        userId: mockUserId
      })).rejects.toThrow('Test session not found or expired');
    });

    it('should throw error if chatbot not found', async () => {
      MockChatbot.findById.mockResolvedValue(null);

      await expect(TestSessionService.processTestMessage({
        sessionId: mockSessionId,
        message: 'Test',
        userId: mockUserId
      })).rejects.toThrow('Chatbot not found');
    });
  });

  describe('resetTestSession', () => {
    it('should reset session successfully', async () => {
      MockTestSession.findById.mockResolvedValue(mockSession);

      await TestSessionService.resetTestSession(mockSessionId, mockUserId);

      expect(mockSession.reset).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Test session reset', expect.any(Object));
    });

    it('should throw error if session not found', async () => {
      MockTestSession.findById.mockResolvedValue(null);

      await expect(TestSessionService.resetTestSession(mockSessionId, mockUserId))
        .rejects.toThrow('Test session not found or expired');
    });
  });

  describe('deleteTestSession', () => {
    it('should delete session successfully', async () => {
      MockTestSession.findById.mockResolvedValue(mockSession);

      await TestSessionService.deleteTestSession(mockSessionId, mockUserId);

      expect(mockSession.delete).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Test session deleted', expect.any(Object));
    });

    it('should handle non-existent session gracefully', async () => {
      MockTestSession.findById.mockResolvedValue(null);

      await expect(TestSessionService.deleteTestSession(mockSessionId, mockUserId))
        .resolves.not.toThrow();
    });
  });

  describe('getTestSessionMessages', () => {
    it('should return session messages', async () => {
      const mockMessages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ] as any[];

      MockTestSession.findById.mockResolvedValue(mockSession);
      mockSession.getMessages.mockResolvedValue(mockMessages);

      const result = await TestSessionService.getTestSessionMessages(mockSessionId, mockUserId, 10);

      expect(mockSession.getMessages).toHaveBeenCalledWith(10);
      expect(result).toBe(mockMessages);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions and return count', async () => {
      MockTestSession.cleanupExpiredSessions.mockResolvedValue(5);

      const result = await TestSessionService.cleanupExpiredSessions();

      expect(MockTestSession.cleanupExpiredSessions).toHaveBeenCalled();
      expect(result).toBe(5);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cleaned up expired test sessions',
        { deletedCount: 5 }
      );
    });

    it('should not log if no sessions were deleted', async () => {
      MockTestSession.cleanupExpiredSessions.mockResolvedValue(0);

      const result = await TestSessionService.cleanupExpiredSessions();

      expect(result).toBe(0);
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        'Cleaned up expired test sessions',
        expect.any(Object)
      );
    });
  });

  describe('validateSessionAccess', () => {
    it('should return true for valid session access', async () => {
      MockTestSession.findById.mockResolvedValue(mockSession);

      const result = await TestSessionService.validateSessionAccess(mockSessionId, mockUserId);

      expect(result).toBe(true);
    });

    it('should return false if session not found', async () => {
      MockTestSession.findById.mockResolvedValue(null);

      const result = await TestSessionService.validateSessionAccess(mockSessionId, mockUserId);

      expect(result).toBe(false);
    });

    it('should return false for unauthorized user', async () => {
      const unauthorizedSession = { ...mockSession, userId: 'other-user' };
      MockTestSession.findById.mockResolvedValue(unauthorizedSession);

      const result = await TestSessionService.validateSessionAccess(mockSessionId, mockUserId);

      expect(result).toBe(false);
    });

    it('should return false and cleanup expired session', async () => {
      const expiredSession = { ...mockSession, isExpired: jest.fn().mockReturnValue(true) };
      MockTestSession.findById.mockResolvedValue(expiredSession);

      const result = await TestSessionService.validateSessionAccess(mockSessionId, mockUserId);

      expect(expiredSession.delete).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false and log error on exception', async () => {
      MockTestSession.findById.mockRejectedValue(new Error('Database error'));

      const result = await TestSessionService.validateSessionAccess(mockSessionId, mockUserId);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getUserTestSessions', () => {
    it('should return user sessions for specific chatbot', async () => {
      const mockSessions = [mockSession];
      MockTestSession.findByUserIdAndChatbotId.mockResolvedValue(mockSessions);

      const result = await TestSessionService.getUserTestSessions(mockUserId, mockChatbotId);

      expect(MockTestSession.findByUserIdAndChatbotId).toHaveBeenCalledWith(mockUserId, mockChatbotId);
      expect(result).toBe(mockSessions);
    });

    it('should throw error if chatbotId not provided', async () => {
      await expect(TestSessionService.getUserTestSessions(mockUserId))
        .rejects.toThrow('ChatbotId is required for getting user test sessions');
    });
  });
});