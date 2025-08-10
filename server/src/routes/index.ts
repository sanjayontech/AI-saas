import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import adminRoutes from './admin';
import chatbotRoutes from './chatbots';
import widgetRoutes from './widget';
import analyticsRoutes from './analytics';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/chatbots', chatbotRoutes);
router.use('/widget', widgetRoutes);
router.use('/analytics', analyticsRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Chatbot SaaS API v1',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      admin: '/api/v1/admin',
      chatbots: '/api/v1/chatbots',
      widget: '/api/v1/widget',
      analytics: '/api/v1/analytics',
      health: '/api/v1/health'
    }
  });
});

export default router;