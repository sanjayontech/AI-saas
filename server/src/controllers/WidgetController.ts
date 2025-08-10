import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ChatbotService } from '../services/ChatbotService';
import { ValidationError, NotFoundError } from '../utils/errors';
import path from 'path';
import fs from 'fs';

export interface WidgetConfig {
  chatbotId: string;
  position?: 'bottom-right' | 'bottom-left' | 'center';
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    textColor?: string;
    backgroundColor?: string;
    borderRadius?: string;
    fontFamily?: string;
  };
  title?: string;
  welcomeMessage?: string;
  serverUrl?: string;
}

export class WidgetController {
  private chatbotService: ChatbotService;

  constructor() {
    this.chatbotService = new ChatbotService();
  }

  /**
   * Generate embed code for a chatbot
   */
  generateEmbedCode = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { chatbotId } = req.params;
      const config: Partial<WidgetConfig> = req.body;

      // Verify chatbot exists and is active
      if (!req.user?.id) {
        throw new ValidationError('User ID is required');
      }
      const chatbot = await this.chatbotService.getChatbotById(chatbotId, req.user.id);

      if (!chatbot.isActive) {
        throw new ValidationError('Chatbot is not active');
      }

      // Generate the embed code
      const embedCode = this.generateEmbedScript({
        chatbotId,
        position: config.position || 'bottom-right',
        theme: {
          primaryColor: config.theme?.primaryColor || chatbot.appearance.primaryColor,
          secondaryColor: config.theme?.secondaryColor || chatbot.appearance.secondaryColor,
          textColor: config.theme?.textColor || '#1F2937',
          backgroundColor: config.theme?.backgroundColor || '#FFFFFF',
          borderRadius: config.theme?.borderRadius || chatbot.appearance.borderRadius + 'px',
          fontFamily: config.theme?.fontFamily || chatbot.appearance.fontFamily || 'system-ui, -apple-system, sans-serif'
        },
        title: config.title || chatbot.name,
        welcomeMessage: config.welcomeMessage || 'Hello! How can I help you today?',
        serverUrl: process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`
      });

      res.json({
        success: true,
        data: {
          embedCode,
          chatbotId,
          config: {
            ...config,
            chatbotId
          }
        }
      });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        console.error('Error generating embed code:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to generate embed code'
        });
      }
    }
  };

  /**
   * Get widget configuration for a chatbot
   */
  getWidgetConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { chatbotId } = req.params;

      // Get chatbot (no user validation needed for public widget config)
      const chatbot = await this.chatbotService.getChatbotById(chatbotId, req.user?.id || '');

      if (!chatbot.isActive) {
        throw new NotFoundError('Chatbot not found or inactive');
      }

      const config = {
        chatbotId,
        title: chatbot.name,
        welcomeMessage: 'Hello! How can I help you today?',
        theme: {
          primaryColor: chatbot.appearance.primaryColor,
          secondaryColor: chatbot.appearance.secondaryColor,
          textColor: '#1F2937',
          backgroundColor: '#FFFFFF',
          borderRadius: chatbot.appearance.borderRadius + 'px',
          fontFamily: chatbot.appearance.fontFamily || 'system-ui, -apple-system, sans-serif'
        },
        settings: {
          maxTokens: chatbot.settings.maxTokens,
          responseDelay: chatbot.settings.responseDelay,
          collectUserInfo: chatbot.settings.collectUserInfo
        }
      };

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        console.error('Error getting widget config:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get widget configuration'
        });
      }
    }
  };

  /**
   * Serve the widget JavaScript file
   */
  serveWidget = async (req: Request, res: Response): Promise<void> => {
    try {
      const widgetPath = path.join(__dirname, '../../dist/widget/chat-widget.iife.js');
      
      if (!fs.existsSync(widgetPath)) {
        res.status(404).json({
          success: false,
          error: 'Widget file not found'
        });
        return;
      }

      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      
      const widgetContent = fs.readFileSync(widgetPath, 'utf8');
      res.send(widgetContent);
    } catch (error) {
      console.error('Error serving widget:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to serve widget'
      });
    }
  };

  /**
   * Get widget analytics for a chatbot
   */
  getWidgetAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { chatbotId } = req.params;
      const { timeRange = '7d' } = req.query;

      // Verify chatbot ownership
      if (!req.user?.id) {
        throw new ValidationError('User ID is required');
      }
      await this.chatbotService.getChatbotById(chatbotId, req.user.id);

      // Get conversation history for analytics
      const conversations = await this.chatbotService.getConversationHistory(
        chatbotId,
        req.user.id,
        100,
        0
      );

      // Calculate analytics - simplified for now since we need to query messages separately
      let totalMessages = 0;
      for (const conv of conversations) {
        if (conv.id) {
          const messages = await conv.getContext(1000); // Get all messages for this conversation
          totalMessages += messages.length;
        }
      }

      const analytics = {
        totalConversations: conversations.length,
        totalMessages,
        averageMessagesPerConversation: conversations.length > 0 
          ? totalMessages / conversations.length 
          : 0,
        timeRange,
        lastUpdated: new Date().toISOString()
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        console.error('Error getting widget analytics:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get widget analytics'
        });
      }
    }
  };

  /**
   * Generate embed script HTML
   */
  private generateEmbedScript(config: WidgetConfig): string {
    const dataAttributes = [
      `data-chatbot-id="${config.chatbotId}"`,
      `data-position="${config.position}"`,
      `data-server-url="${config.serverUrl}"`,
      `data-primary-color="${config.theme?.primaryColor}"`,
      `data-secondary-color="${config.theme?.secondaryColor}"`,
      `data-text-color="${config.theme?.textColor}"`,
      `data-background-color="${config.theme?.backgroundColor}"`,
      `data-border-radius="${config.theme?.borderRadius}"`,
      `data-font-family="${config.theme?.fontFamily}"`,
      `data-title="${config.title}"`,
      `data-welcome-message="${config.welcomeMessage}"`
    ].join('\n    ');

    return `<!-- AI Chatbot Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${config.serverUrl}/api/v1/widget/chat-widget.js';
    ${dataAttributes.split('\n').map(attr => `    script.setAttribute('${attr.split('=')[0].replace('data-', '')}', '${attr.split('=')[1].replace(/"/g, '')}');`).join('\n')}
    script.onload = function() {
      console.log('AI Chatbot Widget loaded successfully');
    };
    script.onerror = function() {
      console.error('Failed to load AI Chatbot Widget');
    };
    document.head.appendChild(script);
  })();
</script>`;
  }
}