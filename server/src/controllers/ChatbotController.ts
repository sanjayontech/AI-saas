import { Request, Response, NextFunction } from 'express';
import { ChatbotService, ChatbotConfig, ProcessMessageRequest } from '../services/ChatbotService';
import { ValidationError, NotFoundError } from '../utils/errors';
import Joi from 'joi';

export class ChatbotController {
  private static chatbotService = new ChatbotService();

  /**
   * Create a new chatbot
   */
  static async createChatbot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const config: ChatbotConfig = req.body;

      // Validate request body
      const schema = Joi.object({
        name: Joi.string().min(1).max(255).required(),
        description: Joi.string().max(1000).optional(),
        personality: Joi.string().min(1).required(),
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
      });

      const { error, value } = schema.validate(config);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const chatbot = await ChatbotController.chatbotService.createChatbot(userId, value);

      res.status(201).json({
        success: true,
        message: 'Chatbot created successfully',
        data: { chatbot }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all chatbots for the authenticated user
   */
  static async getUserChatbots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;

      const chatbots = await ChatbotController.chatbotService.getUserChatbots(userId);

      res.status(200).json({
        success: true,
        data: { chatbots }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific chatbot by ID
   */
  static async getChatbotById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { chatbotId } = req.params;

      if (!chatbotId) {
        throw new ValidationError('Chatbot ID is required');
      }

      const chatbot = await ChatbotController.chatbotService.getChatbotById(chatbotId, userId);

      res.status(200).json({
        success: true,
        data: { chatbot }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a chatbot
   */
  static async updateChatbot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { chatbotId } = req.params;
      const updates: Partial<ChatbotConfig> = req.body;

      if (!chatbotId) {
        throw new ValidationError('Chatbot ID is required');
      }

      // Validate request body
      const schema = Joi.object({
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
      });

      const { error, value } = schema.validate(updates);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const chatbot = await ChatbotController.chatbotService.updateChatbot(chatbotId, userId, value);

      res.status(200).json({
        success: true,
        message: 'Chatbot updated successfully',
        data: { chatbot }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a chatbot
   */
  static async deleteChatbot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { chatbotId } = req.params;

      if (!chatbotId) {
        throw new ValidationError('Chatbot ID is required');
      }

      await ChatbotController.chatbotService.deleteChatbot(chatbotId, userId);

      res.status(200).json({
        success: true,
        message: 'Chatbot deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process a message (public endpoint for embedded widgets)
   */
  static async processMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chatbotId } = req.params;
      const { message, sessionId, userInfo } = req.body;

      if (!chatbotId) {
        throw new ValidationError('Chatbot ID is required');
      }

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        throw new ValidationError('Message is required and must be a non-empty string');
      }

      if (!sessionId || typeof sessionId !== 'string') {
        throw new ValidationError('Session ID is required');
      }

      const request: ProcessMessageRequest = {
        chatbotId,
        sessionId,
        message: message.trim(),
        userInfo
      };

      const response = await ChatbotController.chatbotService.processMessage(request);

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get conversation history for a chatbot
   */
  static async getConversationHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { chatbotId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      if (!chatbotId) {
        throw new ValidationError('Chatbot ID is required');
      }

      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new ValidationError('Limit must be a number between 1 and 100');
      }

      if (isNaN(offsetNum) || offsetNum < 0) {
        throw new ValidationError('Offset must be a non-negative number');
      }

      const conversations = await ChatbotController.chatbotService.getConversationHistory(
        chatbotId,
        userId,
        limitNum,
        offsetNum
      );

      res.status(200).json({
        success: true,
        data: { conversations }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Train a chatbot with new knowledge
   */
  static async trainChatbot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { chatbotId } = req.params;
      const { trainingData } = req.body;

      if (!chatbotId) {
        throw new ValidationError('Chatbot ID is required');
      }

      if (!Array.isArray(trainingData) || trainingData.length === 0) {
        throw new ValidationError('Training data must be a non-empty array of strings');
      }

      // Validate training data items
      for (const item of trainingData) {
        if (typeof item !== 'string' || item.trim().length === 0) {
          throw new ValidationError('All training data items must be non-empty strings');
        }
      }

      const chatbot = await ChatbotController.chatbotService.trainChatbot(
        chatbotId,
        userId,
        trainingData.map(item => item.trim())
      );

      res.status(200).json({
        success: true,
        message: 'Chatbot trained successfully',
        data: { chatbot }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * End a conversation
   */
  static async endConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversationId } = req.params;

      if (!conversationId) {
        throw new ValidationError('Conversation ID is required');
      }

      await ChatbotController.chatbotService.endConversation(conversationId);

      res.status(200).json({
        success: true,
        message: 'Conversation ended successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test AI service connection
   */
  static async testAIConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ChatbotController.chatbotService.testAIConnection();

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}