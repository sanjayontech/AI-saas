import Joi from 'joi';
import { db } from '../database/connection';

export interface ChatbotAppearance {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  borderRadius: number;
  position: 'bottom-right' | 'bottom-left' | 'center';
  avatar?: string;
}

export interface ChatbotSettings {
  maxTokens: number;
  temperature: number;
  responseDelay: number;
  fallbackMessage: string;
  collectUserInfo: boolean;
}

export interface ChatbotData {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  personality: string;
  knowledgeBase: string[];
  appearance: ChatbotAppearance;
  settings: ChatbotSettings;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Chatbot {
  public id?: string;
  public userId: string;
  public name: string;
  public description?: string;
  public personality: string;
  public knowledgeBase: string[];
  public appearance: ChatbotAppearance;
  public settings: ChatbotSettings;
  public isActive: boolean;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(data: ChatbotData) {
    this.id = data.id;
    this.userId = data.userId;
    this.name = data.name;
    this.description = data.description;
    this.personality = data.personality || 'helpful and friendly';
    this.knowledgeBase = data.knowledgeBase || [];
    this.appearance = data.appearance || {
      primaryColor: '#3B82F6',
      secondaryColor: '#F3F4F6',
      fontFamily: 'Inter, sans-serif',
      borderRadius: 8,
      position: 'bottom-right'
    };
    this.settings = data.settings || {
      maxTokens: 1000,
      temperature: 0.7,
      responseDelay: 1000,
      fallbackMessage: 'I apologize, but I\'m having trouble understanding. Could you please rephrase your question?',
      collectUserInfo: false
    };
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Validation schema
  static getValidationSchema() {
    return {
      create: Joi.object({
        name: Joi.string().min(1).max(255).required().messages({
          'string.min': 'Chatbot name is required',
          'string.max': 'Chatbot name cannot exceed 255 characters',
          'any.required': 'Chatbot name is required'
        }),
        description: Joi.string().max(1000).optional().messages({
          'string.max': 'Description cannot exceed 1000 characters'
        }),
        personality: Joi.string().min(1).required().messages({
          'string.min': 'Personality is required',
          'any.required': 'Personality is required'
        }),
        knowledgeBase: Joi.array().items(Joi.string()).default([]),
        appearance: Joi.object({
          primaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
          secondaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#F3F4F6'),
          fontFamily: Joi.string().default('Inter, sans-serif'),
          borderRadius: Joi.number().min(0).max(50).default(8),
          position: Joi.string().valid('bottom-right', 'bottom-left', 'center').default('bottom-right'),
          avatar: Joi.string().optional()
        }).default(),
        settings: Joi.object({
          maxTokens: Joi.number().min(100).max(4000).default(1000),
          temperature: Joi.number().min(0).max(2).default(0.7),
          responseDelay: Joi.number().min(0).max(5000).default(1000),
          fallbackMessage: Joi.string().default('I apologize, but I\'m having trouble understanding. Could you please rephrase your question?'),
          collectUserInfo: Joi.boolean().default(false)
        }).default()
      }),
      update: Joi.object({
        name: Joi.string().min(1).max(255).optional(),
        description: Joi.string().max(1000).optional(),
        personality: Joi.string().min(1).optional(),
        knowledgeBase: Joi.array().items(Joi.string()).optional(),
        appearance: Joi.object({
          primaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
          secondaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
          fontFamily: Joi.string(),
          borderRadius: Joi.number().min(0).max(50),
          position: Joi.string().valid('bottom-right', 'bottom-left', 'center'),
          avatar: Joi.string().optional()
        }).optional(),
        settings: Joi.object({
          maxTokens: Joi.number().min(100).max(4000),
          temperature: Joi.number().min(0).max(2),
          responseDelay: Joi.number().min(0).max(5000),
          fallbackMessage: Joi.string(),
          collectUserInfo: Joi.boolean()
        }).optional(),
        isActive: Joi.boolean().optional()
      })
    };
  }

  // Database operations
  static async create(chatbotData: ChatbotData): Promise<Chatbot> {
    const [chatbot] = await db('chatbots')
      .insert({
        user_id: chatbotData.userId,
        name: chatbotData.name,
        description: chatbotData.description,
        personality: chatbotData.personality,
        knowledge_base: JSON.stringify(chatbotData.knowledgeBase),
        appearance: JSON.stringify(chatbotData.appearance),
        settings: JSON.stringify(chatbotData.settings),
        is_active: chatbotData.isActive !== undefined ? chatbotData.isActive : true
      })
      .returning('*');

    return new Chatbot({
      id: chatbot.id,
      userId: chatbot.user_id,
      name: chatbot.name,
      description: chatbot.description,
      personality: chatbot.personality,
      knowledgeBase: JSON.parse(chatbot.knowledge_base),
      appearance: JSON.parse(chatbot.appearance),
      settings: JSON.parse(chatbot.settings),
      isActive: chatbot.is_active,
      createdAt: chatbot.created_at,
      updatedAt: chatbot.updated_at
    });
  }

  static async findById(id: string): Promise<Chatbot | null> {
    const chatbot = await db('chatbots').where({ id }).first();
    
    if (!chatbot) return null;

    return new Chatbot({
      id: chatbot.id,
      userId: chatbot.user_id,
      name: chatbot.name,
      description: chatbot.description,
      personality: chatbot.personality,
      knowledgeBase: JSON.parse(chatbot.knowledge_base),
      appearance: JSON.parse(chatbot.appearance),
      settings: JSON.parse(chatbot.settings),
      isActive: chatbot.is_active,
      createdAt: chatbot.created_at,
      updatedAt: chatbot.updated_at
    });
  }

  static async findByUserId(userId: string): Promise<Chatbot[]> {
    const chatbots = await db('chatbots').where({ user_id: userId }).orderBy('created_at', 'desc');
    
    return chatbots.map(chatbot => new Chatbot({
      id: chatbot.id,
      userId: chatbot.user_id,
      name: chatbot.name,
      description: chatbot.description,
      personality: chatbot.personality,
      knowledgeBase: JSON.parse(chatbot.knowledge_base),
      appearance: JSON.parse(chatbot.appearance),
      settings: JSON.parse(chatbot.settings),
      isActive: chatbot.is_active,
      createdAt: chatbot.created_at,
      updatedAt: chatbot.updated_at
    }));
  }

  static async findByIdAndUserId(id: string, userId: string): Promise<Chatbot | null> {
    const chatbot = await db('chatbots').where({ id, user_id: userId }).first();
    
    if (!chatbot) return null;

    return new Chatbot({
      id: chatbot.id,
      userId: chatbot.user_id,
      name: chatbot.name,
      description: chatbot.description,
      personality: chatbot.personality,
      knowledgeBase: JSON.parse(chatbot.knowledge_base),
      appearance: JSON.parse(chatbot.appearance),
      settings: JSON.parse(chatbot.settings),
      isActive: chatbot.is_active,
      createdAt: chatbot.created_at,
      updatedAt: chatbot.updated_at
    });
  }

  async save(): Promise<Chatbot> {
    const [updatedChatbot] = await db('chatbots')
      .where({ id: this.id })
      .update({
        name: this.name,
        description: this.description,
        personality: this.personality,
        knowledge_base: JSON.stringify(this.knowledgeBase),
        appearance: JSON.stringify(this.appearance),
        settings: JSON.stringify(this.settings),
        is_active: this.isActive,
        updated_at: new Date()
      })
      .returning('*');

    return new Chatbot({
      id: updatedChatbot.id,
      userId: updatedChatbot.user_id,
      name: updatedChatbot.name,
      description: updatedChatbot.description,
      personality: updatedChatbot.personality,
      knowledgeBase: JSON.parse(updatedChatbot.knowledge_base),
      appearance: JSON.parse(updatedChatbot.appearance),
      settings: JSON.parse(updatedChatbot.settings),
      isActive: updatedChatbot.is_active,
      createdAt: updatedChatbot.created_at,
      updatedAt: updatedChatbot.updated_at
    });
  }

  static async delete(id: string): Promise<void> {
    await db('chatbots').where({ id }).del();
  }
}