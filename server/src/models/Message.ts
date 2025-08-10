import Joi from 'joi';
import { db } from '../database/connection';

export interface MessageData {
  id?: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Message {
  public id?: string;
  public conversationId: string;
  public role: 'user' | 'assistant';
  public content: string;
  public timestamp: Date;
  public metadata?: Record<string, any>;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(data: MessageData) {
    this.id = data.id;
    this.conversationId = data.conversationId;
    this.role = data.role;
    this.content = data.content;
    this.timestamp = data.timestamp || new Date();
    this.metadata = data.metadata;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Validation schema
  static getValidationSchema() {
    return {
      create: Joi.object({
        conversationId: Joi.string().uuid().required(),
        role: Joi.string().valid('user', 'assistant').required(),
        content: Joi.string().min(1).required(),
        metadata: Joi.object().optional()
      })
    };
  }

  // Database operations
  static async create(messageData: MessageData): Promise<Message> {
    const [message] = await db('messages')
      .insert({
        conversation_id: messageData.conversationId,
        role: messageData.role,
        content: messageData.content,
        timestamp: messageData.timestamp || new Date(),
        metadata: messageData.metadata ? JSON.stringify(messageData.metadata) : null
      })
      .returning('*');

    return new Message({
      id: message.id,
      conversationId: message.conversation_id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      metadata: message.metadata ? JSON.parse(message.metadata) : undefined,
      createdAt: message.created_at,
      updatedAt: message.updated_at
    });
  }

  static async findById(id: string): Promise<Message | null> {
    const message = await db('messages').where({ id }).first();
    
    if (!message) return null;

    return new Message({
      id: message.id,
      conversationId: message.conversation_id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      metadata: message.metadata ? JSON.parse(message.metadata) : undefined,
      createdAt: message.created_at,
      updatedAt: message.updated_at
    });
  }

  static async findByConversationId(conversationId: string, limit?: number): Promise<Message[]> {
    let query = db('messages')
      .where({ conversation_id: conversationId })
      .orderBy('timestamp', 'asc');

    if (limit) {
      query = query.limit(limit);
    }

    const messages = await query;
    
    return messages.map(message => new Message({
      id: message.id,
      conversationId: message.conversation_id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      metadata: message.metadata ? JSON.parse(message.metadata) : undefined,
      createdAt: message.created_at,
      updatedAt: message.updated_at
    }));
  }

  static async getConversationContext(conversationId: string, limit: number = 10): Promise<Message[]> {
    const messages = await db('messages')
      .where({ conversation_id: conversationId })
      .orderBy('timestamp', 'desc')
      .limit(limit);

    // Return in chronological order for context
    return messages.reverse().map(message => new Message({
      id: message.id,
      conversationId: message.conversation_id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      metadata: message.metadata ? JSON.parse(message.metadata) : undefined,
      createdAt: message.created_at,
      updatedAt: message.updated_at
    }));
  }
}