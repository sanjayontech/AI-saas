import { Chatbot, ChatbotAppearance, ChatbotSettings } from '../models/Chatbot';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { GoogleAIService, ChatResponse, ConversationContext } from './GoogleAIService';
import { ValidationError, NotFoundError } from '../utils/errors';

export interface ChatbotConfig {
  name: string;
  description?: string;
  personality: string;
  knowledgeBase: string[];
  appearance: ChatbotAppearance;
  settings: ChatbotSettings;
}

export interface ProcessMessageRequest {
  chatbotId: string;
  sessionId: string;
  message: string;
  userInfo?: Record<string, any>;
}

export interface ProcessMessageResponse {
  response: string;
  conversationId: string;
  messageId: string;
  metadata?: Record<string, any>;
}

export class ChatbotService {
  private googleAI: GoogleAIService;

  constructor() {
    this.googleAI = new GoogleAIService();
  }

  /**
   * Create a new chatbot for a user
   */
  async createChatbot(userId: string, config: ChatbotConfig): Promise<Chatbot> {
    // Validate the configuration
    const validation = this.validateChatbotConfig(config);
    if (!validation.valid) {
      throw new ValidationError(`Invalid chatbot configuration: ${validation.errors.join(', ')}`);
    }

    try {
      const chatbot = await Chatbot.create({
        userId,
        name: config.name,
        description: config.description,
        personality: config.personality,
        knowledgeBase: config.knowledgeBase,
        appearance: config.appearance,
        settings: config.settings,
        isActive: true
      });

      return chatbot;
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new ValidationError('A chatbot with this name already exists');
      }
      throw error;
    }
  }

  /**
   * Update an existing chatbot
   */
  async updateChatbot(chatbotId: string, userId: string, config: Partial<ChatbotConfig>): Promise<Chatbot> {
    const chatbot = await this.getChatbotById(chatbotId, userId);

    // Update chatbot properties
    if (config.name !== undefined) chatbot.name = config.name;
    if (config.description !== undefined) chatbot.description = config.description;
    if (config.personality !== undefined) chatbot.personality = config.personality;
    if (config.knowledgeBase !== undefined) chatbot.knowledgeBase = config.knowledgeBase;
    if (config.appearance !== undefined) chatbot.appearance = config.appearance;
    if (config.settings !== undefined) chatbot.settings = config.settings;

    // Validate the updated configuration
    const validation = this.validateChatbotConfig(chatbot);
    if (!validation.valid) {
      throw new ValidationError(`Invalid chatbot configuration: ${validation.errors.join(', ')}`);
    }

    return await chatbot.save();
  }

  /**
   * Get a chatbot by ID, ensuring it belongs to the user
   */
  async getChatbotById(chatbotId: string, userId: string): Promise<Chatbot> {
    const chatbot = await Chatbot.findByIdAndUserId(chatbotId, userId);

    if (!chatbot) {
      throw new NotFoundError('Chatbot not found');
    }

    return chatbot;
  }

  /**
   * Get all chatbots for a user
   */
  async getUserChatbots(userId: string): Promise<Chatbot[]> {
    return await Chatbot.findByUserId(userId);
  }

  /**
   * Delete a chatbot
   */
  async deleteChatbot(chatbotId: string, userId: string): Promise<void> {
    const chatbot = await this.getChatbotById(chatbotId, userId);
    
    if (chatbot.id) {
      await Chatbot.delete(chatbot.id);
    }
  }

  /**
   * Process a message and generate AI response
   */
  async processMessage(request: ProcessMessageRequest): Promise<ProcessMessageResponse> {
    // Get the chatbot (no user validation needed for public API)
    const chatbot = await Chatbot.findById(request.chatbotId);

    if (!chatbot || !chatbot.isActive) {
      throw new NotFoundError('Chatbot not found or inactive');
    }

    // Find or create conversation
    let conversation = await Conversation.findBySessionId(request.chatbotId, request.sessionId);

    if (!conversation) {
      conversation = await Conversation.create({
        chatbotId: request.chatbotId,
        sessionId: request.sessionId,
        userInfo: request.userInfo
      });
    }

    // Add user message to conversation
    const userMessage = await conversation.addMessage('user', request.message);

    // Get conversation context
    const messages = await conversation.getContext(10);
    const context: ConversationContext = {
      messages,
      userInfo: conversation.userInfo,
      sessionId: request.sessionId
    };

    // Generate AI response
    const aiResponse = await this.googleAI.generateResponse(
      chatbot,
      request.message,
      context
    );

    // Add AI response to conversation
    const assistantMessage = await conversation.addMessage(
      'assistant',
      aiResponse.content,
      aiResponse.metadata
    );

    // Apply response delay if configured
    if (chatbot.settings.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, chatbot.settings.responseDelay));
    }

    return {
      response: aiResponse.content,
      conversationId: conversation.id!,
      messageId: assistantMessage.id!,
      metadata: aiResponse.metadata
    };
  }

  /**
   * Get conversation history for a chatbot
   */
  async getConversationHistory(
    chatbotId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Conversation[]> {
    // Verify chatbot ownership
    await this.getChatbotById(chatbotId, userId);

    return await Conversation.findByChatbotId(chatbotId, limit, offset);
  }

  /**
   * End a conversation
   */
  async endConversation(conversationId: string): Promise<void> {
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      await conversation.end();
    }
  }

  /**
   * Train chatbot with new knowledge
   */
  async trainChatbot(chatbotId: string, userId: string, trainingData: string[]): Promise<Chatbot> {
    const chatbot = await this.getChatbotById(chatbotId, userId);

    // Merge new training data with existing knowledge base
    const updatedKnowledgeBase = [...chatbot.knowledgeBase, ...trainingData];

    return await this.updateChatbot(chatbotId, userId, {
      knowledgeBase: updatedKnowledgeBase
    });
  }

  /**
   * Validate chatbot configuration
   */
  private validateChatbotConfig(config: Partial<ChatbotConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.name !== undefined) {
      if (!config.name || config.name.trim().length === 0) {
        errors.push('Chatbot name is required');
      } else if (config.name.length > 255) {
        errors.push('Chatbot name must be less than 255 characters');
      }
    }

    if (config.description !== undefined && config.description && config.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }

    if (config.personality !== undefined) {
      if (!config.personality || config.personality.trim().length === 0) {
        errors.push('Personality is required');
      }
    }

    if (config.knowledgeBase !== undefined) {
      if (!Array.isArray(config.knowledgeBase)) {
        errors.push('Knowledge base must be an array');
      }
    }

    if (config.settings !== undefined) {
      const settings = config.settings;
      if (settings.maxTokens < 100 || settings.maxTokens > 4000) {
        errors.push('Max tokens must be between 100 and 4000');
      }
      if (settings.temperature < 0 || settings.temperature > 2) {
        errors.push('Temperature must be between 0 and 2');
      }
      if (settings.responseDelay < 0 || settings.responseDelay > 5000) {
        errors.push('Response delay must be between 0 and 5000ms');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Test AI service connection
   */
  async testAIConnection(): Promise<{ success: boolean; error?: string }> {
    return await this.googleAI.testConnection();
  }
}