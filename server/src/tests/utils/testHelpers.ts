import { db } from '../../database/connection';
import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { Conversation } from '../../models/Conversation';
import { Message } from '../../models/Message';
import { UserProfile } from '../../models/UserProfile';
import { UsageStats } from '../../models/UsageStats';
import { CryptoUtils } from '../../utils/crypto';

export class TestDataFactory {
  static async createTestUser(overrides: Partial<any> = {}): Promise<{ user: User; password: string }> {
    const password = overrides.password || 'testpassword123';
    
    const userData = {
      id: CryptoUtils.generateUUID(),
      email: overrides.email || `test-${Date.now()}@example.com`,
      password: password,
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'User',
      emailVerified: overrides.emailVerified !== undefined ? overrides.emailVerified : true,
      role: overrides.role || 'user',
      emailVerificationToken: overrides.emailVerificationToken || null,
      passwordResetToken: overrides.passwordResetToken || null,
      passwordResetExpires: overrides.passwordResetExpires || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };

    const user = await User.create(userData);
    
    // Create associated user profile
    await UserProfile.create({
      userId: user.id!,
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en',
        timezone: 'UTC'
      }
    });

    // Create associated usage stats
    await UsageStats.create({
      userId: user.id!,
      messagesThisMonth: 0,
      totalMessages: 0,
      chatbotsCreated: 0,
      storageUsed: 0,
      lastActive: new Date()
    });

    return { user, password };
  }

  static async createTestChatbot(userId: string, overrides: Partial<any> = {}): Promise<Chatbot> {
    const chatbotData = {
      id: CryptoUtils.generateUUID(),
      userId,
      name: overrides.name || 'Test Chatbot',
      description: overrides.description || 'A test chatbot for testing purposes',
      personality: overrides.personality || 'Helpful and friendly',
      knowledgeBase: overrides.knowledgeBase || ['Test knowledge base entry'],
      appearance: overrides.appearance || {
        primaryColor: '#3B82F6',
        secondaryColor: '#F3F4F6',
        fontFamily: 'Arial',
        borderRadius: 12,
        position: 'bottom-right'
      },
      settings: overrides.settings || {
        maxTokens: 150,
        temperature: 0.7,
        responseDelay: 1000,
        fallbackMessage: 'I apologize, but I cannot help with that.',
        collectUserInfo: false
      },
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };

    return await Chatbot.create(chatbotData);
  }

  static async createTestConversation(chatbotId: string, overrides: Partial<any> = {}): Promise<Conversation> {
    const conversationData = {
      id: CryptoUtils.generateUUID(),
      chatbotId,
      sessionId: overrides.sessionId || `session-${Date.now()}`,
      userInfo: overrides.userInfo || { name: 'Test Visitor' },
      startedAt: overrides.startedAt || new Date(),
      endedAt: overrides.endedAt || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };

    return await Conversation.create(conversationData);
  }

  static async createTestMessage(conversationId: string, overrides: Partial<any> = {}): Promise<Message> {
    const messageData = {
      id: CryptoUtils.generateUUID(),
      conversationId,
      role: overrides.role || 'user',
      content: overrides.content || 'Test message content',
      timestamp: overrides.timestamp || new Date(),
      metadata: overrides.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };

    return await Message.create(messageData);
  }

  static async createTestUserProfile(userId: string, overrides: Partial<any> = {}): Promise<UserProfile> {
    const profileData = {
      userId,
      preferences: overrides.preferences || {
        theme: 'light',
        notifications: true,
        language: 'en',
        timezone: 'UTC'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };

    return await UserProfile.create(profileData);
  }

  static async createTestUsageStats(userId: string, overrides: Partial<any> = {}): Promise<UsageStats> {
    const statsData = {
      userId,
      messagesThisMonth: overrides.messagesThisMonth || 0,
      totalMessages: overrides.totalMessages || 0,
      chatbotsCreated: overrides.chatbotsCreated || 0,
      storageUsed: overrides.storageUsed || 0,
      lastActive: overrides.lastActive || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };

    return await UsageStats.create(statsData);
  }
}

export class TestCleanup {
  static async cleanupAll(): Promise<void> {
    // Clean up all tables in reverse order to avoid foreign key constraints
    const tables = [
      'performance_metrics',
      'conversation_metrics',
      'analytics',
      'messages',
      'conversations',
      'chatbots',
      'usage_stats',
      'user_profiles',
      'users'
    ];

    for (const table of tables) {
      try {
        await db(table).del();
      } catch (error) {
        // Ignore errors for tables that don't exist
        console.warn(`Warning: Could not clean table ${table}:`, error);
      }
    }
  }

  static async cleanupUsers(): Promise<void> {
    await db('usage_stats').del();
    await db('user_profiles').del();
    await db('users').del();
  }

  static async cleanupChatbots(): Promise<void> {
    await db('messages').del();
    await db('conversations').del();
    await db('chatbots').del();
  }

  static async cleanupConversations(): Promise<void> {
    await db('messages').del();
    await db('conversations').del();
  }

  static async cleanupAnalytics(): Promise<void> {
    await db('performance_metrics').del();
    await db('conversation_metrics').del();
    await db('analytics').del();
  }
}

export class TestAssertions {
  static expectValidUser(user: any): void {
    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.firstName).toBeDefined();
    expect(user.lastName).toBeDefined();
    expect(user.createdAt).toBeDefined();
    expect(user.updatedAt).toBeDefined();
    expect(typeof user.emailVerified).toBe('boolean');
  }

  static expectValidChatbot(chatbot: any): void {
    expect(chatbot).toBeDefined();
    expect(chatbot.id).toBeDefined();
    expect(chatbot.userId).toBeDefined();
    expect(chatbot.name).toBeDefined();
    expect(chatbot.description).toBeDefined();
    expect(chatbot.personality).toBeDefined();
    expect(Array.isArray(chatbot.knowledgeBase)).toBe(true);
    expect(chatbot.appearance).toBeDefined();
    expect(chatbot.settings).toBeDefined();
    expect(typeof chatbot.isActive).toBe('boolean');
    expect(chatbot.createdAt).toBeDefined();
    expect(chatbot.updatedAt).toBeDefined();
  }

  static expectValidConversation(conversation: any): void {
    expect(conversation).toBeDefined();
    expect(conversation.id).toBeDefined();
    expect(conversation.chatbotId).toBeDefined();
    expect(conversation.sessionId).toBeDefined();
    expect(conversation.startedAt).toBeDefined();
    expect(conversation.createdAt).toBeDefined();
    expect(conversation.updatedAt).toBeDefined();
  }

  static expectValidMessage(message: any): void {
    expect(message).toBeDefined();
    expect(message.id).toBeDefined();
    expect(message.conversationId).toBeDefined();
    expect(message.role).toBeDefined();
    expect(['user', 'assistant'].includes(message.role)).toBe(true);
    expect(message.content).toBeDefined();
    expect(message.timestamp).toBeDefined();
    expect(message.createdAt).toBeDefined();
    expect(message.updatedAt).toBeDefined();
  }

  static expectValidTokens(tokens: any): void {
    expect(tokens).toBeDefined();
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(typeof tokens.accessToken).toBe('string');
    expect(typeof tokens.refreshToken).toBe('string');
    expect(tokens.accessToken.length).toBeGreaterThan(0);
    expect(tokens.refreshToken.length).toBeGreaterThan(0);
  }

  static expectValidUsageStats(stats: any): void {
    expect(stats).toBeDefined();
    expect(stats.userId).toBeDefined();
    expect(typeof stats.messagesThisMonth).toBe('number');
    expect(typeof stats.totalMessages).toBe('number');
    expect(typeof stats.chatbotsCreated).toBe('number');
    expect(typeof stats.storageUsed).toBe('number');
    expect(stats.lastActive).toBeDefined();
    expect(stats.createdAt).toBeDefined();
    expect(stats.updatedAt).toBeDefined();
  }
}

export class TestMocks {
  static mockGoogleAIResponse(content: string = 'Mock AI response', usage: any = { promptTokens: 10, completionTokens: 15, totalTokens: 25 }) {
    return {
      content,
      usage
    };
  }

  static mockEmailService() {
    return {
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
      sendWelcomeEmail: jest.fn().mockResolvedValue(true),
      sendNotificationEmail: jest.fn().mockResolvedValue(true)
    };
  }

  static mockAnalyticsData() {
    return {
      totalConversations: 100,
      totalMessages: 500,
      averageResponseTime: 1.5,
      userSatisfactionScore: 4.2,
      topQueries: ['How can I help?', 'What are your hours?', 'Tell me about your services'],
      conversationsByDay: [
        { date: '2024-01-01', count: 10 },
        { date: '2024-01-02', count: 15 },
        { date: '2024-01-03', count: 12 }
      ]
    };
  }
}