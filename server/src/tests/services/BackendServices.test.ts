import { AuthService } from '../../services/AuthService';
import { ChatbotService } from '../../services/ChatbotService';
import { UserManagementService } from '../../services/UserManagementService';
import { AnalyticsService } from '../../services/AnalyticsService';
import { GoogleAIService } from '../../services/GoogleAIService';
import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { TestCleanup, TestAssertions } from '../utils/testHelpers';
import { 
  ValidationError, 
  AuthenticationError, 
  ConflictError, 
  NotFoundError,
  AuthorizationError 
} from '../../utils/errors';
import { mockEmailService } from '../mocks/email';
import { mockGoogleAIService } from '../mocks/googleAI';

describe('Backend Services - Comprehensive Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmailService.clearSentEmails();
  });

  afterEach(async () => {
    await TestCleanup.cleanupAll();
  });

  describe('AuthService', () => {
    describe('register', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User'
        };

        const result = await AuthService.register(userData);

        TestAssertions.expectValidUser(result.user);
        expect(result.user.email).toBe(userData.email);
        expect(result.user.firstName).toBe(userData.firstName);
        expect(result.user.lastName).toBe(userData.lastName);
        expect(result.user.emailVerified).toBe(false);
        TestAssertions.expectValidTokens(result.tokens);
        
        // Verify email verification was sent
        const sentEmails = mockEmailService.getSentEmails();
        expect(sentEmails).toHaveLength(1);
        expect(sentEmails[0].to).toBe(userData.email);
        expect(sentEmails[0].type).toBe('verification');
      });

      it('should throw ConflictError for duplicate email', async () => {
        const userData = {
          email: 'duplicate@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User'
        };

        // Register first user
        await AuthService.register(userData);

        // Try to register with same email
        await expect(AuthService.register(userData))
          .rejects
          .toThrow(ConflictError);
      });

      it('should throw ValidationError for invalid email', async () => {
        const userData = {
          email: 'invalid-email',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User'
        };

        await expect(AuthService.register(userData))
          .rejects
          .toThrow(ValidationError);
      });

      it('should throw ValidationError for weak password', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User'
        };

        await expect(AuthService.register(userData))
          .rejects
          .toThrow(ValidationError);
      });
    });

    describe('login', () => {
      it('should login user successfully with valid credentials', async () => {
        // Create test user
        const userData = {
          email: 'login@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
          emailVerified: true
        };
        await User.create(userData);

        const result = await AuthService.login('login@example.com', 'TestPassword123!');

        TestAssertions.expectValidUser(result.user);
        expect(result.user.email).toBe('login@example.com');
        TestAssertions.expectValidTokens(result.tokens);
      });

      it('should throw AuthenticationError for invalid email', async () => {
        await expect(AuthService.login('nonexistent@example.com', 'password'))
          .rejects
          .toThrow(AuthenticationError);
      });

      it('should throw AuthenticationError for invalid password', async () => {
        // Create test user
        await User.create({
          email: 'wrongpass@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
          emailVerified: true
        });

        await expect(AuthService.login('wrongpass@example.com', 'wrongpassword'))
          .rejects
          .toThrow(AuthenticationError);
      });
    });

    describe('refreshToken', () => {
      it('should refresh token successfully', async () => {
        // Create test user and get tokens
        const userData = {
          email: 'refresh@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
          emailVerified: true
        };
        const user = await User.create(userData);
        const tokens = user.generateTokens();

        const result = await AuthService.refreshToken(tokens.refreshToken);

        TestAssertions.expectValidTokens(result);
        expect(result.accessToken).not.toBe(tokens.accessToken);
      });

      it('should throw AuthenticationError for invalid refresh token', async () => {
        await expect(AuthService.refreshToken('invalid-token'))
          .rejects
          .toThrow(AuthenticationError);
      });
    });
  });

  describe('ChatbotService', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'chatbot@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true
      });
    });

    describe('createChatbot', () => {
      it('should create a new chatbot successfully', async () => {
        const chatbotData = {
          name: 'Test Bot',
          description: 'A test chatbot',
          personality: 'Helpful and friendly',
          knowledgeBase: ['Test knowledge'],
          appearance: {
            primaryColor: '#3B82F6',
            secondaryColor: '#F3F4F6',
            fontFamily: 'Arial',
            borderRadius: 12,
            position: 'bottom-right' as const
          },
          settings: {
            maxTokens: 150,
            temperature: 0.7,
            responseDelay: 1000,
            fallbackMessage: 'I apologize, but I cannot help with that.',
            collectUserInfo: false
          }
        };

        const result = await ChatbotService.createChatbot(testUser.id!, chatbotData);

        TestAssertions.expectValidChatbot(result);
        expect(result.name).toBe(chatbotData.name);
        expect(result.description).toBe(chatbotData.description);
        expect(result.personality).toBe(chatbotData.personality);
        expect(result.userId).toBe(testUser.id);
        expect(result.isActive).toBe(true);
      });

      it('should throw ValidationError for invalid data', async () => {
        const invalidData = {
          name: '', // Empty name should fail validation
          description: 'A test chatbot'
        };

        await expect(ChatbotService.createChatbot(testUser.id!, invalidData as any))
          .rejects
          .toThrow(ValidationError);
      });
    });

    describe('getChatbotById', () => {
      it('should return chatbot for owner', async () => {
        const chatbot = await Chatbot.create({
          userId: testUser.id!,
          name: 'Test Bot',
          description: 'A test chatbot',
          personality: 'Helpful',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        });

        const result = await ChatbotService.getChatbotById(chatbot.id!, testUser.id!);

        TestAssertions.expectValidChatbot(result);
        expect(result!.id).toBe(chatbot.id);
        expect(result!.name).toBe(chatbot.name);
      });

      it('should throw NotFoundError for non-existent chatbot', async () => {
        await expect(ChatbotService.getChatbotById('non-existent-id', testUser.id!))
          .rejects
          .toThrow(NotFoundError);
      });
    });

    describe('processMessage', () => {
      it('should process message and return AI response', async () => {
        const chatbot = await Chatbot.create({
          userId: testUser.id!,
          name: 'Test Bot',
          description: 'A test chatbot',
          personality: 'Helpful',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        });

        const messageData = {
          chatbotId: chatbot.id!,
          sessionId: 'test-session-123',
          message: 'Hello, how are you?',
          userInfo: {}
        };

        const result = await ChatbotService.processMessage(messageData);

        expect(result).toBeDefined();
        expect(result.response).toBe('This is a mock AI response for testing purposes.');
        expect(result.conversationId).toBeDefined();
        expect(result.messageId).toBeDefined();
        
        // Verify Google AI service was called
        expect(mockGoogleAIService.generateResponse).toHaveBeenCalledTimes(1);
      });

      it('should throw NotFoundError for non-existent chatbot', async () => {
        const messageData = {
          chatbotId: 'non-existent-id',
          sessionId: 'session-123',
          message: 'Hello',
          userInfo: {}
        };

        await expect(ChatbotService.processMessage(messageData))
          .rejects
          .toThrow(NotFoundError);
      });
    });

    describe('getUserChatbots', () => {
      it('should return all chatbots for user', async () => {
        await Chatbot.create({
          userId: testUser.id!,
          name: 'Bot 1',
          description: 'First bot',
          personality: 'Helpful',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        });

        await Chatbot.create({
          userId: testUser.id!,
          name: 'Bot 2',
          description: 'Second bot',
          personality: 'Friendly',
          knowledgeBase: ['Test'],
          appearance: {},
          settings: {},
          isActive: true
        });

        const result = await ChatbotService.getUserChatbots(testUser.id!);

        expect(result).toHaveLength(2);
        expect(result.map(c => c.name)).toContain('Bot 1');
        expect(result.map(c => c.name)).toContain('Bot 2');
      });

      it('should return empty array for user with no chatbots', async () => {
        const result = await ChatbotService.getUserChatbots(testUser.id!);
        expect(result).toHaveLength(0);
      });
    });
  });

  describe('UserManagementService', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'usermgmt@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true
      });
    });

    describe('getUserProfile', () => {
      it('should return user profile if exists', async () => {
        const result = await UserManagementService.getUserProfile(testUser.id!);

        expect(result).toBeDefined();
        expect(result.userId).toBe(testUser.id);
        expect(result.preferences).toBeDefined();
      });

      it('should create default profile if none exists', async () => {
        const result = await UserManagementService.getUserProfile(testUser.id!);

        expect(result).toBeDefined();
        expect(result.userId).toBe(testUser.id);
        expect(result.preferences.theme).toBe('light');
        expect(result.preferences.notifications).toBe(true);
      });
    });

    describe('updateUserProfile', () => {
      it('should update existing profile successfully', async () => {
        const updateData = {
          preferences: {
            theme: 'dark' as const,
            notifications: false,
            language: 'es',
            timezone: 'America/New_York'
          }
        };

        const result = await UserManagementService.updateUserProfile(
          testUser.id!,
          updateData
        );

        expect(result).toBeDefined();
        expect(result.preferences.theme).toBe('dark');
        expect(result.preferences.notifications).toBe(false);
        expect(result.preferences.language).toBe('es');
        expect(result.preferences.timezone).toBe('America/New_York');
      });
    });

    describe('getUserUsageStats', () => {
      it('should return usage stats if exists', async () => {
        const result = await UserManagementService.getUserUsageStats(testUser.id!);

        expect(result).toBeDefined();
        TestAssertions.expectValidUsageStats(result);
        expect(result.userId).toBe(testUser.id);
      });
    });

    describe('exportUserData', () => {
      it('should export complete user data', async () => {
        const result = await UserManagementService.exportUserData(testUser.id!);

        expect(result).toBeDefined();
        expect(result.user).toBeDefined();
        expect(result.user.email).toBe(testUser.email);
        expect(result.profile).toBeDefined();
        expect(result.usageStats).toBeDefined();
        expect(result.chatbots).toBeDefined();
        expect(result.exportedAt).toBeDefined();
      });

      it('should throw NotFoundError for non-existent user', async () => {
        await expect(UserManagementService.exportUserData('non-existent-id'))
          .rejects
          .toThrow(NotFoundError);
      });
    });

    describe('deleteUserAccount', () => {
      it('should delete user account and all related data', async () => {
        const result = await UserManagementService.deleteUserAccount(testUser.id!);

        expect(result).toBe(true);
      });

      it('should throw NotFoundError for non-existent user', async () => {
        await expect(UserManagementService.deleteUserAccount('non-existent-id'))
          .rejects
          .toThrow(NotFoundError);
      });
    });
  });

  describe('AnalyticsService', () => {
    let testUser: User;
    let testChatbot: Chatbot;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'analytics@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true
      });

      testChatbot = await Chatbot.create({
        userId: testUser.id!,
        name: 'Analytics Bot',
        description: 'A test chatbot for analytics',
        personality: 'Helpful',
        knowledgeBase: ['Test'],
        appearance: {},
        settings: {},
        isActive: true
      });
    });

    describe('getUserAnalyticsSummary', () => {
      it('should return analytics summary for user', async () => {
        const result = await AnalyticsService.getUserAnalyticsSummary(testUser.id!);

        expect(result).toBeDefined();
        expect(typeof result.totalConversations).toBe('number');
        expect(typeof result.totalMessages).toBe('number');
        expect(typeof result.averageResponseTime).toBe('number');
        expect(typeof result.userSatisfactionScore).toBe('number');
      });
    });

    describe('getChatbotAnalytics', () => {
      it('should return analytics for chatbot owner', async () => {
        const result = await AnalyticsService.getChatbotAnalytics(
          testChatbot.id!,
          testUser.id!
        );

        expect(result).toBeDefined();
        expect(typeof result.totalConversations).toBe('number');
        expect(typeof result.totalMessages).toBe('number');
        expect(typeof result.averageResponseTime).toBe('number');
        expect(typeof result.userSatisfactionScore).toBe('number');
      });

      it('should throw AuthorizationError for non-owner', async () => {
        const otherUser = await User.create({
          email: 'other@example.com',
          password: 'TestPassword123!',
          firstName: 'Other',
          lastName: 'User',
          emailVerified: true
        });

        await expect(AnalyticsService.getChatbotAnalytics(
          testChatbot.id!,
          otherUser.id!
        )).rejects.toThrow(AuthorizationError);
      });

      it('should throw NotFoundError for non-existent chatbot', async () => {
        await expect(AnalyticsService.getChatbotAnalytics(
          'non-existent-id',
          testUser.id!
        )).rejects.toThrow(NotFoundError);
      });
    });

    describe('getConversationMetrics', () => {
      it('should return conversation metrics for time range', async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const endDate = new Date();

        const result = await AnalyticsService.getConversationMetrics(
          testUser.id!,
          startDate,
          endDate
        );

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('getPerformanceMetrics', () => {
      it('should return performance metrics for time range', async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const endDate = new Date();

        const result = await AnalyticsService.getPerformanceMetrics(
          testUser.id!,
          startDate,
          endDate
        );

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('GoogleAIService', () => {
    let googleAIService: GoogleAIService;
    let testChatbot: Chatbot;

    beforeEach(async () => {
      googleAIService = new GoogleAIService();
      
      const testUser = await User.create({
        email: 'googleai@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true
      });

      testChatbot = await Chatbot.create({
        userId: testUser.id!,
        name: 'AI Test Bot',
        description: 'A test chatbot for AI testing',
        personality: 'Helpful and friendly',
        knowledgeBase: ['Test knowledge'],
        appearance: {},
        settings: {
          maxTokens: 150,
          temperature: 0.7
        },
        isActive: true
      });
    });

    describe('generateResponse', () => {
      it('should generate AI response successfully', async () => {
        const result = await googleAIService.generateResponse(
          testChatbot,
          'Hello, how are you?',
          []
        );

        expect(result).toBeDefined();
        expect(result.content).toBe('This is a mock AI response for testing purposes.');
        expect(result.usage).toBeDefined();
        expect(result.usage.totalTokens).toBe(25);
      });

      it('should handle conversation context', async () => {
        const conversationHistory = [
          { role: 'user' as const, content: 'Hello' },
          { role: 'assistant' as const, content: 'Hi there!' }
        ];

        const result = await googleAIService.generateResponse(
          testChatbot,
          'Can you tell me more?',
          conversationHistory
        );

        expect(result).toBeDefined();
        expect(result.content).toBe('This is a mock AI response for testing purposes.');
      });

      it('should apply chatbot personality and settings', async () => {
        const result = await googleAIService.generateResponse(
          testChatbot,
          'Hello',
          []
        );

        expect(result).toBeDefined();
        expect(result.content).toBe('This is a mock AI response for testing purposes.');
      });
    });

    describe('error handling', () => {
      it('should handle API errors gracefully', async () => {
        // Mock an API error
        mockGoogleAIService.generateResponse.mockRejectedValueOnce(
          new Error('API Error')
        );

        await expect(googleAIService.generateResponse(
          testChatbot,
          'Hello',
          []
        )).rejects.toThrow('API Error');
      });

      it('should handle rate limiting', async () => {
        // Mock rate limit error
        mockGoogleAIService.generateResponse.mockRejectedValueOnce(
          new Error('Rate limit exceeded')
        );

        await expect(googleAIService.generateResponse(
          testChatbot,
          'Hello',
          []
        )).rejects.toThrow('Rate limit exceeded');
      });
    });

    describe('input validation', () => {
      it('should handle empty messages', async () => {
        await expect(googleAIService.generateResponse(
          testChatbot,
          '',
          []
        )).rejects.toThrow();
      });

      it('should handle very long messages', async () => {
        const longMessage = 'A'.repeat(10000);
        
        const result = await googleAIService.generateResponse(
          testChatbot,
          longMessage,
          []
        );

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      });
    });
  });
});