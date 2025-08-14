import { TestSession, TestMessage, TestDebugInfo } from '../models/TestSession';
import { Chatbot } from '../models/Chatbot';
import { logger } from './LoggingService';

export interface TestResponse {
  message: string;
  debugInfo?: TestDebugInfo;
}

export interface CreateTestSessionRequest {
  chatbotId: string;
  userId: string;
  debugMode?: boolean;
}

export interface ProcessTestMessageRequest {
  sessionId: string;
  message: string;
  userId: string;
}

export class TestSessionService {
  /**
   * Create a new test session
   */
  static async createTestSession(request: CreateTestSessionRequest): Promise<TestSession> {
    try {
      // Validate that the chatbot exists and belongs to the user
      const chatbot = await Chatbot.findByIdAndUserId(request.chatbotId, request.userId);
      if (!chatbot) {
        throw new Error('Chatbot not found or access denied');
      }

      // Check for existing active sessions for this chatbot/user combination
      const existingSessions = await TestSession.findByUserIdAndChatbotId(
        request.userId, 
        request.chatbotId
      );

      // Limit to 3 concurrent test sessions per chatbot per user
      if (existingSessions.length >= 3) {
        // Clean up the oldest session
        const oldestSession = existingSessions[existingSessions.length - 1];
        await oldestSession.delete();
        
        logger.info('Cleaned up oldest test session due to limit', {
          userId: request.userId,
          chatbotId: request.chatbotId,
          deletedSessionId: oldestSession.id
        });
      }

      const session = await TestSession.create({
        chatbotId: request.chatbotId,
        userId: request.userId,
        debugMode: request.debugMode || false
      });

      logger.info('Test session created', {
        sessionId: session.id,
        userId: request.userId,
        chatbotId: request.chatbotId,
        debugMode: session.debugMode
      });

      return session;
    } catch (error) {
      logger.error('Failed to create test session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId,
        chatbotId: request.chatbotId
      });
      throw error;
    }
  }

  /**
   * Get a test session by ID with security validation
   */
  static async getTestSession(sessionId: string, userId: string): Promise<TestSession | null> {
    try {
      const session = await TestSession.findById(sessionId);
      
      if (!session) {
        return null;
      }

      // Security check: ensure the session belongs to the requesting user
      if (session.userId !== userId) {
        logger.warn('Unauthorized test session access attempt', {
          sessionId,
          requestingUserId: userId,
          sessionUserId: session.userId
        });
        throw new Error('Access denied');
      }

      // Check if session is expired
      if (session.isExpired()) {
        logger.info('Expired test session accessed, cleaning up', {
          sessionId,
          userId
        });
        await session.delete();
        return null;
      }

      return session;
    } catch (error) {
      logger.error('Failed to get test session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
        userId
      });
      throw error;
    }
  }

  /**
   * Process a test message and generate AI response
   */
  static async processTestMessage(request: ProcessTestMessageRequest): Promise<TestResponse> {
    try {
      // Get and validate session
      const session = await this.getTestSession(request.sessionId, request.userId);
      if (!session) {
        throw new Error('Test session not found or expired');
      }

      // Get chatbot configuration
      const chatbot = await Chatbot.findById(session.chatbotId);
      if (!chatbot) {
        throw new Error('Chatbot not found');
      }

      // Add user message to session
      await session.addMessage('user', request.message);

      // Generate AI response (this would integrate with the existing ChatbotService)
      const startTime = Date.now();
      
      // For now, create a mock response - this will be replaced with actual AI integration
      const mockResponse = await this.generateMockResponse(request.message, chatbot, session.debugMode);
      
      const responseTime = Date.now() - startTime;

      // Create debug info if debug mode is enabled
      let debugInfo: TestDebugInfo | undefined;
      if (session.debugMode) {
        debugInfo = {
          responseTime,
          tokensUsed: mockResponse.tokensUsed || 0,
          knowledgeBaseHits: mockResponse.knowledgeBaseHits || [],
          confidence: mockResponse.confidence || 0.8,
          modelUsed: 'gemini-pro',
          errorInfo: mockResponse.errorInfo
        };
      }

      // Add assistant message to session
      await session.addMessage('assistant', mockResponse.message, debugInfo);

      logger.info('Test message processed', {
        sessionId: request.sessionId,
        userId: request.userId,
        responseTime,
        debugMode: session.debugMode
      });

      return {
        message: mockResponse.message,
        debugInfo
      };
    } catch (error) {
      logger.error('Failed to process test message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: request.sessionId,
        userId: request.userId
      });
      throw error;
    }
  }

  /**
   * Reset a test session (clear all messages)
   */
  static async resetTestSession(sessionId: string, userId: string): Promise<void> {
    try {
      const session = await this.getTestSession(sessionId, userId);
      if (!session) {
        throw new Error('Test session not found or expired');
      }

      await session.reset();

      logger.info('Test session reset', {
        sessionId,
        userId
      });
    } catch (error) {
      logger.error('Failed to reset test session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete a test session
   */
  static async deleteTestSession(sessionId: string, userId: string): Promise<void> {
    try {
      const session = await this.getTestSession(sessionId, userId);
      if (!session) {
        return; // Already deleted or doesn't exist
      }

      await session.delete();

      logger.info('Test session deleted', {
        sessionId,
        userId
      });
    } catch (error) {
      logger.error('Failed to delete test session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
        userId
      });
      throw error;
    }
  }

  /**
   * Get test session messages
   */
  static async getTestSessionMessages(sessionId: string, userId: string, limit?: number): Promise<TestMessage[]> {
    try {
      const session = await this.getTestSession(sessionId, userId);
      if (!session) {
        throw new Error('Test session not found or expired');
      }

      return await session.getMessages(limit);
    } catch (error) {
      logger.error('Failed to get test session messages', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
        userId
      });
      throw error;
    }
  }

  /**
   * Get all active test sessions for a user
   */
  static async getUserTestSessions(userId: string, chatbotId?: string): Promise<TestSession[]> {
    try {
      if (chatbotId) {
        return await TestSession.findByUserIdAndChatbotId(userId, chatbotId);
      }

      // If no specific chatbot, get all user's sessions
      // This would require a new method in TestSession model
      // For now, we'll throw an error to indicate chatbotId is required
      throw new Error('ChatbotId is required for getting user test sessions');
    } catch (error) {
      logger.error('Failed to get user test sessions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        chatbotId
      });
      throw error;
    }
  }

  /**
   * Cleanup expired test sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const deletedCount = await TestSession.cleanupExpiredSessions();
      
      if (deletedCount > 0) {
        logger.info('Cleaned up expired test sessions', {
          deletedCount
        });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired test sessions', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Validate session ownership and access
   */
  static async validateSessionAccess(sessionId: string, userId: string): Promise<boolean> {
    try {
      const session = await TestSession.findById(sessionId);
      
      if (!session) {
        return false;
      }

      if (session.userId !== userId) {
        return false;
      }

      if (session.isExpired()) {
        // Clean up expired session
        await session.delete();
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate session access', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
        userId
      });
      return false;
    }
  }

  /**
   * Mock response generator (to be replaced with actual AI integration)
   */
  private static async generateMockResponse(
    message: string, 
    chatbot: Chatbot, 
    debugMode: boolean
  ): Promise<{
    message: string;
    tokensUsed?: number;
    knowledgeBaseHits?: string[];
    confidence?: number;
    errorInfo?: string;
  }> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Mock knowledge base hits
    const knowledgeBaseHits = chatbot.knowledgeBase.filter(kb => 
      message.toLowerCase().includes(kb.toLowerCase().substring(0, 5))
    );

    // Mock response based on chatbot personality
    const responses = [
      `Based on my understanding and personality as ${chatbot.personality}, I'd say: ${message.split(' ').reverse().join(' ')}`,
      `Thank you for your message! As configured, I'm ${chatbot.personality}. How can I help you further?`,
      `I understand you're asking about "${message}". Let me help you with that based on my knowledge base.`,
      `That's an interesting question! Given my personality (${chatbot.personality}), here's what I think...`
    ];

    const mockMessage = responses[Math.floor(Math.random() * responses.length)];

    return {
      message: mockMessage,
      tokensUsed: debugMode ? Math.floor(Math.random() * 100) + 20 : undefined,
      knowledgeBaseHits: debugMode ? knowledgeBaseHits : undefined,
      confidence: debugMode ? Math.random() * 0.3 + 0.7 : undefined
    };
  }
}