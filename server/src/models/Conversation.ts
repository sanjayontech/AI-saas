import Joi from 'joi';
import { db } from '../database/connection';
import { Message } from './Message';

export interface UserInfo {
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

export interface ConversationData {
  id?: string;
  chatbotId: string;
  sessionId: string;
  userInfo?: UserInfo;
  startedAt?: Date;
  endedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Conversation {
  public id?: string;
  public chatbotId: string;
  public sessionId: string;
  public userInfo?: UserInfo;
  public startedAt: Date;
  public endedAt?: Date;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(data: ConversationData) {
    this.id = data.id;
    this.chatbotId = data.chatbotId;
    this.sessionId = data.sessionId;
    this.userInfo = data.userInfo;
    this.startedAt = data.startedAt || new Date();
    this.endedAt = data.endedAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Validation schema
  static getValidationSchema() {
    return {
      create: Joi.object({
        chatbotId: Joi.string().uuid().required(),
        sessionId: Joi.string().min(1).required(),
        userInfo: Joi.object({
          name: Joi.string().optional(),
          email: Joi.string().email().optional(),
          phone: Joi.string().optional()
        }).optional()
      })
    };
  }

  // Database operations
  static async create(conversationData: ConversationData): Promise<Conversation> {
    const [conversation] = await db('conversations')
      .insert({
        chatbot_id: conversationData.chatbotId,
        session_id: conversationData.sessionId,
        user_info: conversationData.userInfo ? JSON.stringify(conversationData.userInfo) : null,
        started_at: conversationData.startedAt || new Date()
      })
      .returning('*');

    return new Conversation({
      id: conversation.id,
      chatbotId: conversation.chatbot_id,
      sessionId: conversation.session_id,
      userInfo: conversation.user_info ? JSON.parse(conversation.user_info) : undefined,
      startedAt: conversation.started_at,
      endedAt: conversation.ended_at,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at
    });
  }

  static async findById(id: string): Promise<Conversation | null> {
    const conversation = await db('conversations').where({ id }).first();
    
    if (!conversation) return null;

    return new Conversation({
      id: conversation.id,
      chatbotId: conversation.chatbot_id,
      sessionId: conversation.session_id,
      userInfo: conversation.user_info ? JSON.parse(conversation.user_info) : undefined,
      startedAt: conversation.started_at,
      endedAt: conversation.ended_at,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at
    });
  }

  static async findBySessionId(chatbotId: string, sessionId: string): Promise<Conversation | null> {
    const conversation = await db('conversations')
      .where({ 
        chatbot_id: chatbotId, 
        session_id: sessionId 
      })
      .whereNull('ended_at')
      .first();
    
    if (!conversation) return null;

    return new Conversation({
      id: conversation.id,
      chatbotId: conversation.chatbot_id,
      sessionId: conversation.session_id,
      userInfo: conversation.user_info ? JSON.parse(conversation.user_info) : undefined,
      startedAt: conversation.started_at,
      endedAt: conversation.ended_at,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at
    });
  }

  static async findByChatbotId(chatbotId: string, limit: number = 50, offset: number = 0): Promise<Conversation[]> {
    const conversations = await db('conversations')
      .where({ chatbot_id: chatbotId })
      .orderBy('started_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    return conversations.map(conversation => new Conversation({
      id: conversation.id,
      chatbotId: conversation.chatbot_id,
      sessionId: conversation.session_id,
      userInfo: conversation.user_info ? JSON.parse(conversation.user_info) : undefined,
      startedAt: conversation.started_at,
      endedAt: conversation.ended_at,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at
    }));
  }

  async save(): Promise<Conversation> {
    const [updatedConversation] = await db('conversations')
      .where({ id: this.id })
      .update({
        user_info: this.userInfo ? JSON.stringify(this.userInfo) : null,
        ended_at: this.endedAt,
        updated_at: new Date()
      })
      .returning('*');

    return new Conversation({
      id: updatedConversation.id,
      chatbotId: updatedConversation.chatbot_id,
      sessionId: updatedConversation.session_id,
      userInfo: updatedConversation.user_info ? JSON.parse(updatedConversation.user_info) : undefined,
      startedAt: updatedConversation.started_at,
      endedAt: updatedConversation.ended_at,
      createdAt: updatedConversation.created_at,
      updatedAt: updatedConversation.updated_at
    });
  }

  // Helper method to get conversation context for AI
  async getContext(limit: number = 10): Promise<Message[]> {
    if (!this.id) return [];
    return await Message.getConversationContext(this.id, limit);
  }

  // Helper method to add a message to the conversation
  async addMessage(role: 'user' | 'assistant', content: string, metadata?: Record<string, any>): Promise<Message> {
    if (!this.id) {
      throw new Error('Cannot add message to unsaved conversation');
    }

    return await Message.create({
      conversationId: this.id,
      role,
      content,
      metadata
    });
  }

  // Helper method to end the conversation
  async end(): Promise<Conversation> {
    this.endedAt = new Date();
    return await this.save();
  }
}