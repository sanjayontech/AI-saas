import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { Message } from '../models/Message';
import { Chatbot } from '../models/Chatbot';

export interface ChatResponse {
  content: string;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  messages: Message[];
  userInfo?: Record<string, any>;
  sessionId: string;
}

export class GoogleAIService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  /**
   * Generate a response from the AI model based on chatbot configuration and conversation context
   */
  async generateResponse(
    chatbot: Chatbot,
    userMessage: string,
    context: ConversationContext
  ): Promise<ChatResponse> {
    try {
      // Build the conversation history for context
      const conversationHistory = this.buildConversationHistory(context.messages);
      
      // Create the system prompt based on chatbot configuration
      const systemPrompt = this.buildSystemPrompt(chatbot);
      
      // Combine system prompt, conversation history, and current message
      const fullPrompt = `${systemPrompt}\n\nConversation History:\n${conversationHistory}\n\nUser: ${userMessage}\n\nAssistant:`;

      // Generate response using Google AI
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          maxOutputTokens: chatbot.settings.maxTokens,
          temperature: chatbot.settings.temperature,
        },
      });

      const response = await result.response;
      const content = response.text();

      if (!content || content.trim().length === 0) {
        return {
          content: chatbot.settings.fallbackMessage,
          metadata: { fallback: true, reason: 'empty_response' }
        };
      }

      return {
        content: content.trim(),
        metadata: {
          model: 'gemini-pro',
          finish_reason: response.candidates?.[0]?.finishReason || 'unknown'
        }
      };
    } catch (error) {
      console.error('Google AI Service Error:', error);
      
      // Return fallback message on error
      return {
        content: chatbot.settings.fallbackMessage,
        metadata: { 
          fallback: true, 
          reason: 'ai_service_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Build system prompt based on chatbot configuration
   */
  private buildSystemPrompt(chatbot: Chatbot): string {
    let prompt = `You are an AI assistant named "${chatbot.name}".`;
    
    if (chatbot.description) {
      prompt += ` ${chatbot.description}`;
    }

    prompt += ` Your personality is: ${chatbot.personality}.`;

    if (chatbot.knowledgeBase && chatbot.knowledgeBase.length > 0) {
      prompt += `\n\nKnowledge Base:\n${chatbot.knowledgeBase.join('\n')}`;
      prompt += '\n\nUse the knowledge base above to answer questions when relevant.';
    }

    prompt += `\n\nInstructions:
- Be helpful, accurate, and engaging
- Stay in character based on your personality
- If you don't know something, admit it honestly
- Keep responses concise but informative
- Be respectful and professional at all times`;

    return prompt;
  }

  /**
   * Build conversation history string from messages
   */
  private buildConversationHistory(messages: Message[]): string {
    if (!messages || messages.length === 0) {
      return 'No previous conversation.';
    }

    return messages
      .slice(-10) // Only use last 10 messages for context
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Validate chatbot configuration for AI generation
   */
  validateChatbotConfig(chatbot: Chatbot): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!chatbot.name || chatbot.name.trim().length === 0) {
      errors.push('Chatbot name is required');
    }

    if (!chatbot.personality || chatbot.personality.trim().length === 0) {
      errors.push('Chatbot personality is required');
    }

    if (chatbot.settings.maxTokens < 100 || chatbot.settings.maxTokens > 4000) {
      errors.push('Max tokens must be between 100 and 4000');
    }

    if (chatbot.settings.temperature < 0 || chatbot.settings.temperature > 2) {
      errors.push('Temperature must be between 0 and 2');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Test the AI service connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Hello, please respond with "Connection successful"' }] }],
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.1,
        },
      });

      const response = await result.response;
      const content = response.text();

      return {
        success: content.toLowerCase().includes('connection successful'),
        error: content.toLowerCase().includes('connection successful') ? undefined : 'Unexpected response'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}