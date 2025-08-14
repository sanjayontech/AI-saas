import Joi from 'joi';
import { db } from '../database/connection';
import { redisClient } from '../config/redis';

export interface TestDebugInfo {
  responseTime: number;
  tokensUsed: number;
  knowledgeBaseHits: string[];
  confidence: number;
  modelUsed: string;
  errorInfo?: string;
}

export interface TestMessageData {
  id?: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  debugInfo?: TestDebugInfo;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestSessionData {
  id?: string;
  chatbotId: string;
  userId: string;
  debugMode?: boolean;
  createdAt?: Date;
  lastActivity?: Date;
  expiresAt?: Date;
  updatedAt?: Date;
}

export class TestMessage {
  public id?: string;
  public sessionId: string;
  public role: 'user' | 'assistant';
  public content: string;
  public timestamp: Date;
  public debugInfo?: TestDebugInfo;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(data: TestMessageData) {
    this.id = data.id;
    this.sessionId = data.sessionId;
    this.role = data.role;
    this.content = data.content;
    this.timestamp = data.timestamp || new Date();
    this.debugInfo = data.debugInfo;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Validation schema
  static getValidationSchema() {
    return {
      create: Joi.object({
        sessionId: Joi.string().uuid().required(),
        role: Joi.string().valid('user', 'assistant').required(),
        content: Joi.string().min(1).required(),
        debugInfo: Joi.object({
          responseTime: Joi.number().min(0).required(),
          tokensUsed: Joi.number().min(0).required(),
          knowledgeBaseHits: Joi.array().items(Joi.string()).default([]),
          confidence: Joi.number().min(0).max(1).required(),
          modelUsed: Joi.string().required(),
          errorInfo: Joi.string().optional()
        }).optional()
      })
    };
  }

  // Database operations
  static async create(messageData: TestMessageData): Promise<TestMessage> {
    const [message] = await db('test_messages')
      .insert({
        session_id: messageData.sessionId,
        role: messageData.role,
        content: messageData.content,
        timestamp: messageData.timestamp || new Date(),
        debug_info: messageData.debugInfo ? JSON.stringify(messageData.debugInfo) : null
      })
      .returning('*');

    return new TestMessage({
      id: message.id,
      sessionId: message.session_id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      debugInfo: message.debug_info ? JSON.parse(message.debug_info) : undefined,
      createdAt: message.created_at,
      updatedAt: message.updated_at
    });
  }

  static async findBySessionId(sessionId: string, limit?: number): Promise<TestMessage[]> {
    let query = db('test_messages')
      .where({ session_id: sessionId })
      .orderBy('timestamp', 'asc');

    if (limit) {
      query = query.limit(limit);
    }

    const messages = await query;
    
    return messages.map(message => new TestMessage({
      id: message.id,
      sessionId: message.session_id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      debugInfo: message.debug_info ? JSON.parse(message.debug_info) : undefined,
      createdAt: message.created_at,
      updatedAt: message.updated_at
    }));
  }

  static async deleteBySessionId(sessionId: string): Promise<void> {
    await db('test_messages').where({ session_id: sessionId }).del();
  }
}

export class TestSession {
  public id?: string;
  public chatbotId: string;
  public userId: string;
  public debugMode: boolean;
  public createdAt?: Date;
  public lastActivity: Date;
  public expiresAt: Date;
  public updatedAt?: Date;

  constructor(data: TestSessionData) {
    this.id = data.id;
    this.chatbotId = data.chatbotId;
    this.userId = data.userId;
    this.debugMode = data.debugMode || false;
    this.createdAt = data.createdAt;
    this.lastActivity = data.lastActivity || new Date();
    // Default expiration: 2 hours from creation
    this.expiresAt = data.expiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000);
    this.updatedAt = data.updatedAt;
  }

  // Validation schema
  static getValidationSchema() {
    return {
      create: Joi.object({
        chatbotId: Joi.string().uuid().required(),
        userId: Joi.string().uuid().required(),
        debugMode: Joi.boolean().default(false)
      })
    };
  }

  // Database operations
  static async create(sessionData: TestSessionData): Promise<TestSession> {
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    
    const [session] = await db('test_sessions')
      .insert({
        chatbot_id: sessionData.chatbotId,
        user_id: sessionData.userId,
        debug_mode: sessionData.debugMode || false,
        last_activity: new Date(),
        expires_at: expiresAt
      })
      .returning('*');

    const testSession = new TestSession({
      id: session.id,
      chatbotId: session.chatbot_id,
      userId: session.user_id,
      debugMode: session.debug_mode,
      createdAt: session.created_at,
      lastActivity: session.last_activity,
      expiresAt: session.expires_at,
      updatedAt: session.updated_at
    });

    // Store session in Redis for quick access
    await testSession.storeInRedis();

    return testSession;
  }

  static async findById(id: string): Promise<TestSession | null> {
    // Try Redis first
    const redisSession = await TestSession.getFromRedis(id);
    if (redisSession) {
      return redisSession;
    }

    // Fallback to database
    const session = await db('test_sessions').where({ id }).first();
    
    if (!session) return null;

    const testSession = new TestSession({
      id: session.id,
      chatbotId: session.chatbot_id,
      userId: session.user_id,
      debugMode: session.debug_mode,
      createdAt: session.created_at,
      lastActivity: session.last_activity,
      expiresAt: session.expires_at,
      updatedAt: session.updated_at
    });

    // Store in Redis for future access
    await testSession.storeInRedis();

    return testSession;
  }

  static async findByUserIdAndChatbotId(userId: string, chatbotId: string): Promise<TestSession[]> {
    const sessions = await db('test_sessions')
      .where({ 
        user_id: userId, 
        chatbot_id: chatbotId 
      })
      .where('expires_at', '>', new Date())
      .orderBy('last_activity', 'desc');
    
    return sessions.map(session => new TestSession({
      id: session.id,
      chatbotId: session.chatbot_id,
      userId: session.user_id,
      debugMode: session.debug_mode,
      createdAt: session.created_at,
      lastActivity: session.last_activity,
      expiresAt: session.expires_at,
      updatedAt: session.updated_at
    }));
  }

  async updateLastActivity(): Promise<TestSession> {
    this.lastActivity = new Date();
    
    const [updatedSession] = await db('test_sessions')
      .where({ id: this.id })
      .update({
        last_activity: this.lastActivity,
        updated_at: new Date()
      })
      .returning('*');

    const updated = new TestSession({
      id: updatedSession.id,
      chatbotId: updatedSession.chatbot_id,
      userId: updatedSession.user_id,
      debugMode: updatedSession.debug_mode,
      createdAt: updatedSession.created_at,
      lastActivity: updatedSession.last_activity,
      expiresAt: updatedSession.expires_at,
      updatedAt: updatedSession.updated_at
    });

    // Update Redis
    await updated.storeInRedis();

    return updated;
  }

  async delete(): Promise<void> {
    if (!this.id) return;

    // Delete messages first
    await TestMessage.deleteBySessionId(this.id);
    
    // Delete session from database
    await db('test_sessions').where({ id: this.id }).del();
    
    // Delete from Redis
    await this.removeFromRedis();
  }

  // Redis operations
  private async storeInRedis(): Promise<void> {
    if (!this.id) return;

    try {
      const sessionData = {
        id: this.id,
        chatbotId: this.chatbotId,
        userId: this.userId,
        debugMode: this.debugMode,
        createdAt: this.createdAt?.toISOString(),
        lastActivity: this.lastActivity.toISOString(),
        expiresAt: this.expiresAt.toISOString(),
        updatedAt: this.updatedAt?.toISOString()
      };

      const ttl = Math.floor((this.expiresAt.getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        await redisClient.setEx(
          `test_session:${this.id}`, 
          ttl, 
          JSON.stringify(sessionData)
        );
      }
    } catch (error) {
      console.warn('Failed to store test session in Redis:', error);
    }
  }

  private static async getFromRedis(id: string): Promise<TestSession | null> {
    try {
      const sessionData = await redisClient.get(`test_session:${id}`);
      if (!sessionData) return null;

      const data = JSON.parse(sessionData);
      return new TestSession({
        id: data.id,
        chatbotId: data.chatbotId,
        userId: data.userId,
        debugMode: data.debugMode,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        lastActivity: new Date(data.lastActivity),
        expiresAt: new Date(data.expiresAt),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
      });
    } catch (error) {
      console.warn('Failed to get test session from Redis:', error);
      return null;
    }
  }

  private async removeFromRedis(): Promise<void> {
    if (!this.id) return;

    try {
      await redisClient.del(`test_session:${this.id}`);
    } catch (error) {
      console.warn('Failed to remove test session from Redis:', error);
    }
  }

  // Helper methods
  async getMessages(limit?: number): Promise<TestMessage[]> {
    if (!this.id) return [];
    return await TestMessage.findBySessionId(this.id, limit);
  }

  async addMessage(role: 'user' | 'assistant', content: string, debugInfo?: TestDebugInfo): Promise<TestMessage> {
    if (!this.id) {
      throw new Error('Cannot add message to unsaved test session');
    }

    const message = await TestMessage.create({
      sessionId: this.id,
      role,
      content,
      debugInfo
    });

    // Update last activity
    await this.updateLastActivity();

    return message;
  }

  async reset(): Promise<void> {
    if (!this.id) return;
    
    // Delete all messages for this session
    await TestMessage.deleteBySessionId(this.id);
    
    // Update last activity
    await this.updateLastActivity();
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // Static cleanup methods
  static async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    
    // Get expired sessions
    const expiredSessions = await db('test_sessions')
      .where('expires_at', '<', now)
      .select('id');

    if (expiredSessions.length === 0) {
      return 0;
    }

    const sessionIds = expiredSessions.map(s => s.id);

    // Delete messages for expired sessions
    await db('test_messages')
      .whereIn('session_id', sessionIds)
      .del();

    // Delete expired sessions
    const deletedCount = await db('test_sessions')
      .where('expires_at', '<', now)
      .del();

    // Clean up Redis keys
    try {
      const redisKeys = sessionIds.map(id => `test_session:${id}`);
      if (redisKeys.length > 0) {
        await redisClient.del(redisKeys);
      }
    } catch (error) {
      console.warn('Failed to cleanup Redis keys:', error);
    }

    return deletedCount;
  }
}