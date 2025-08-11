import { User, UserRole } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { UserProfile } from '../../models/UserProfile';
import { UsageStats } from '../../models/UsageStats';
import { JWTUtils } from '../../utils/jwt';

// Lazy-load database connection to ensure environment is set up first
function getDb() {
  const { db } = require('../../database/connection');
  return db;
}

export interface TestUser {
  user: User;
  token: string;
  profile?: UserProfile;
  usageStats?: UsageStats;
}

export interface TestChatbot {
  chatbot: Chatbot;
  user: User;
  token: string;
}

export class TestDataFactory {
  static async createTestUser(overrides: Partial<User> = {}): Promise<TestUser> {
    const userData = {
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User',
      emailVerified: true,
      ...overrides
    };

    const user = await User.create(userData);
    const token = JWTUtils.generateAccessToken(user);

    return { user, token };
  }

  static async createTestAdmin(overrides: Partial<User> = {}): Promise<TestUser> {
    const userData = {
      email: `admin-${Date.now()}@example.com`,
      password: 'adminpassword123',
      firstName: 'Admin',
      lastName: 'User',
      emailVerified: true,
      role: 'admin' as UserRole,
      ...overrides
    };

    const user = await User.create(userData);
    const token = JWTUtils.generateAccessToken(user);

    return { user, token };
  }

  static async createTestChatbot(userId: string, overrides: Partial<Chatbot> = {}): Promise<Chatbot> {
    const chatbotData = {
      userId,
      name: `Test Bot ${Date.now()}`,
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
      },
      isActive: true,
      ...overrides
    };

    return await Chatbot.create(chatbotData);
  }

  static async createTestUserProfile(userId: string, overrides: Partial<UserProfile> = {}): Promise<UserProfile> {
    const profileData = {
      userId,
      preferences: {
        theme: 'light' as const,
        notifications: true,
        language: 'en',
        timezone: 'UTC'
      },
      ...overrides
    };

    return await UserProfile.create(profileData);
  }

  static async createTestUsageStats(userId: string, overrides: Partial<UsageStats> = {}): Promise<UsageStats> {
    const statsData = {
      userId,
      messagesThisMonth: 0,
      totalMessages: 0,
      chatbotsCreated: 0,
      storageUsed: 0,
      lastActive: new Date(),
      ...overrides
    };

    return await UsageStats.create(statsData);
  }
}

export class TestCleanup {
  static async cleanupUser(userId: string): Promise<void> {
    if (!userId) return;
    
    const db = getDb();
    try {
      // Clean up in reverse order of dependencies
      await db('performance_metrics').where({ user_id: userId }).del();
      await db('conversation_metrics').where({ user_id: userId }).del();
      await db('analytics').where({ user_id: userId }).del();
      await db('messages').whereIn('conversation_id', 
        db('conversations').select('id').where({ user_id: userId })
      ).del();
      await db('conversations').where({ user_id: userId }).del();
      await db('chatbots').where({ user_id: userId }).del();
      await db('usage_stats').where({ user_id: userId }).del();
      await db('user_profiles').where({ user_id: userId }).del();
      await db('users').where({ id: userId }).del();
    } catch (error) {
      console.error('Error cleaning up test user:', error);
    }
  }

  static async cleanupChatbot(chatbotId: string): Promise<void> {
    if (!chatbotId) return;
    
    const db = getDb();
    try {
      await db('messages').whereIn('conversation_id', 
        db('conversations').select('id').where({ chatbot_id: chatbotId })
      ).del();
      await db('conversations').where({ chatbot_id: chatbotId }).del();
      await db('chatbots').where({ id: chatbotId }).del();
    } catch (error) {
      console.error('Error cleaning up test chatbot:', error);
    }
  }

  static async cleanupAll(): Promise<void> {
    const db = getDb();
    try {
      // Clean up all test data
      await db('performance_metrics').del();
      await db('conversation_metrics').del();
      await db('analytics').del();
      await db('messages').del();
      await db('conversations').del();
      await db('chatbots').del();
      await db('usage_stats').del();
      await db('user_profiles').del();
      await db('users').del();
    } catch (error) {
      console.error('Error cleaning up all test data:', error);
    }
  }
}

export function createMockRequest(overrides: any = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides
  };
}

export function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    locals: {}
  };
  return res;
}

export function expectValidationError(response: any, field?: string) {
  expect(response.status).toBe(400);
  expect(response.body.error).toBeDefined();
  if (field) {
    expect(response.body.error.message).toContain(field);
  }
}

export function expectAuthenticationError(response: any) {
  expect(response.status).toBe(401);
  expect(response.body.error).toBeDefined();
}

export function expectAuthorizationError(response: any) {
  expect(response.status).toBe(403);
  expect(response.body.error).toBeDefined();
}

export function expectNotFoundError(response: any) {
  expect(response.status).toBe(404);
  expect(response.body.error).toBeDefined();
}