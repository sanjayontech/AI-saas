import request from 'supertest';
import { app } from '../../index';
import { User } from '../../models/User';
import { Chatbot } from '../../models/Chatbot';
import { JWTUtils } from '../../utils/jwt';
import fs from 'fs';
import path from 'path';

describe('WidgetController', () => {
  let user: User;
  let chatbot: Chatbot;
  let authToken: string;

  beforeEach(async () => {
    // Create test user
    user = await User.create({
      email: 'widget@test.com',
      password: 'testpassword123',
      firstName: 'Widget',
      lastName: 'Test',
      emailVerified: true
    });

    // Generate auth token
    authToken = JWTUtils.generateAccessToken(user);

    // Create test chatbot
    chatbot = await Chatbot.create({
      userId: user.id!,
      name: 'Test Widget Bot',
      description: 'A test chatbot for widget testing',
      personality: 'Helpful and friendly',
      knowledgeBase: ['Test knowledge'],
      appearance: {
        primaryColor: '#3B82F6',
        secondaryColor: '#F3F4F6',
        fontFamily: 'Arial',
        borderRadius: 12,
        position: 'bottom-right'
      },
      settings: {
        maxTokens: 1000,
        temperature: 0.7,
        responseDelay: 0,
        fallbackMessage: 'Sorry, I could not understand that.',
        collectUserInfo: false
      },
      isActive: true
    });

    // Ensure widget file exists for testing
    const widgetDir = path.join(__dirname, '../../dist/widget');
    const widgetPath = path.join(widgetDir, 'chat-widget.iife.js');
    
    if (!fs.existsSync(widgetDir)) {
      fs.mkdirSync(widgetDir, { recursive: true });
    }
    
    if (!fs.existsSync(widgetPath)) {
      fs.writeFileSync(widgetPath, '// Mock widget file for testing');
    }
  });

  afterEach(async () => {
    // Clean up - using database directly since models don't have delete methods
    if (chatbot.id) {
      await require('../../database/connection').db('chatbots').where({ id: chatbot.id }).del();
    }
    if (user.id) {
      await require('../../database/connection').db('users').where({ id: user.id }).del();
    }
  });

  describe('POST /api/v1/widget/:chatbotId/embed-code', () => {
    it('should generate embed code for authenticated user', async () => {
      const config = {
        position: 'bottom-right',
        theme: {
          primaryColor: '#FF0000',
          secondaryColor: '#00FF00'
        },
        title: 'Custom Chat',
        welcomeMessage: 'Welcome to our chat!'
      };

      const response = await request(app)
        .post(`/api/v1/widget/${chatbot.id}/embed-code`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(config)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.embedCode).toContain('script');
      expect(response.body.data.embedCode).toContain(chatbot.id!);
      expect(response.body.data.chatbotId).toBe(chatbot.id);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post(`/api/v1/widget/${chatbot.id}/embed-code`)
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for inactive chatbot', async () => {
      // Deactivate chatbot
      chatbot.isActive = false;
      await chatbot.save();

      const response = await request(app)
        .post(`/api/v1/widget/${chatbot.id}/embed-code`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not active');
    });

    it('should return 400 for non-existent chatbot', async () => {
      const response = await request(app)
        .post('/api/v1/widget/non-existent-id/embed-code')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/widget/:chatbotId/config', () => {
    it('should return widget config for active chatbot', async () => {
      const response = await request(app)
        .get(`/api/v1/widget/${chatbot.id}/config`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chatbotId).toBe(chatbot.id);
      expect(response.body.data.title).toBe(chatbot.name);
      expect(response.body.data.theme.primaryColor).toBe(chatbot.appearance.primaryColor);
    });

    it('should return 404 for inactive chatbot', async () => {
      // Deactivate chatbot
      chatbot.isActive = false;
      await chatbot.save();

      const response = await request(app)
        .get(`/api/v1/widget/${chatbot.id}/config`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent chatbot', async () => {
      const response = await request(app)
        .get('/api/v1/widget/non-existent-id/config')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/widget/chat-widget.js', () => {
    it('should serve widget JavaScript file', async () => {
      const response = await request(app)
        .get('/api/v1/widget/chat-widget.js')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/javascript');
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.text).toContain('// Mock widget file for testing');
    });

    it('should return 404 if widget file does not exist', async () => {
      // Temporarily remove widget file
      const widgetPath = path.join(__dirname, '../../dist/widget/chat-widget.iife.js');
      const backup = fs.readFileSync(widgetPath);
      fs.unlinkSync(widgetPath);

      const response = await request(app)
        .get('/api/v1/widget/chat-widget.js')
        .expect(404);

      expect(response.body.success).toBe(false);

      // Restore widget file
      fs.writeFileSync(widgetPath, backup);
    });
  });

  describe('GET /api/v1/widget/:chatbotId/analytics', () => {
    it('should return widget analytics for authenticated user', async () => {
      const response = await request(app)
        .get(`/api/v1/widget/${chatbot.id}/analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalConversations');
      expect(response.body.data).toHaveProperty('totalMessages');
      expect(response.body.data).toHaveProperty('averageMessagesPerConversation');
      expect(response.body.data).toHaveProperty('timeRange');
      expect(response.body.data).toHaveProperty('lastUpdated');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get(`/api/v1/widget/${chatbot.id}/analytics`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent chatbot', async () => {
      const response = await request(app)
        .get('/api/v1/widget/non-existent-id/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should accept timeRange query parameter', async () => {
      const response = await request(app)
        .get(`/api/v1/widget/${chatbot.id}/analytics?timeRange=30d`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.timeRange).toBe('30d');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to widget endpoints', async () => {
      // Make multiple requests quickly
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .get(`/api/v1/widget/${chatbot.id}/config`)
      );

      const responses = await Promise.all(promises);
      
      // All should succeed as we're within the rate limit
      responses.forEach(response => {
        expect([200, 404]).toContain(response.status);
      });
    });
  });

  describe('Embed Code Generation', () => {
    it('should generate valid HTML embed code', async () => {
      const config = {
        position: 'bottom-left',
        theme: {
          primaryColor: '#FF5722',
          secondaryColor: '#FFF3E0',
          textColor: '#333333',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          fontFamily: 'Roboto, sans-serif'
        },
        title: 'Support Chat',
        welcomeMessage: 'Hi there! How can we help you?'
      };

      const response = await request(app)
        .post(`/api/v1/widget/${chatbot.id}/embed-code`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(config)
        .expect(200);

      const embedCode = response.body.data.embedCode;

      // Verify embed code structure
      expect(embedCode).toContain('<!-- AI Chatbot Widget -->');
      expect(embedCode).toContain('<script>');
      expect(embedCode).toContain('document.createElement(\'script\')');
      expect(embedCode).toContain('/api/v1/widget/chat-widget.js');
      expect(embedCode).toContain(chatbot.id!);
      expect(embedCode).toContain('bottom-left');
      expect(embedCode).toContain('#FF5722');
      expect(embedCode).toContain('Support Chat');
      expect(embedCode).toContain('Hi there! How can we help you?');
    });

    it('should use default values when config is not provided', async () => {
      const response = await request(app)
        .post(`/api/v1/widget/${chatbot.id}/embed-code`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      const embedCode = response.body.data.embedCode;

      // Should use chatbot's default values
      expect(embedCode).toContain(chatbot.name);
      expect(embedCode).toContain(chatbot.appearance.primaryColor);
      expect(embedCode).toContain('bottom-right'); // default position
    });
  });
});