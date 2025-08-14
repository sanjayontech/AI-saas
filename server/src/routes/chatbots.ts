import { Router } from 'express';
import { ChatbotController } from '../controllers/ChatbotController';
import { authenticate, requireEmailVerification } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for chatbot management endpoints
const chatbotManagementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs for management endpoints
  message: {
    error: {
      code: 429,
      message: 'Too many chatbot management requests, please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for message processing (more generous for public API)
const messageProcessingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 messages per minute
  message: {
    error: {
      code: 429,
      message: 'Too many messages, please slow down.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for training endpoints (more restrictive)
const trainingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 training requests per hour
  message: {
    error: {
      code: 429,
      message: 'Too many training requests, please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Protected chatbot management routes (require authentication and email verification)
router.post(
  '/',
  authenticate,
  requireEmailVerification,
  chatbotManagementLimiter,
  ChatbotController.createChatbot
);

router.get(
  '/',
  authenticate,
  requireEmailVerification,
  chatbotManagementLimiter,
  ChatbotController.getUserChatbots
);

router.get(
  '/:chatbotId',
  authenticate,
  requireEmailVerification,
  chatbotManagementLimiter,
  ChatbotController.getChatbotById
);

router.put(
  '/:chatbotId',
  authenticate,
  requireEmailVerification,
  chatbotManagementLimiter,
  ChatbotController.updateChatbot
);

router.delete(
  '/:chatbotId',
  authenticate,
  requireEmailVerification,
  chatbotManagementLimiter,
  ChatbotController.deleteChatbot
);

router.get(
  '/:chatbotId/conversations',
  authenticate,
  requireEmailVerification,
  chatbotManagementLimiter,
  ChatbotController.getConversationHistory
);

router.get(
  '/:chatbotId/embed',
  authenticate,
  requireEmailVerification,
  chatbotManagementLimiter,
  ChatbotController.getEmbedCode
);

router.post(
  '/:chatbotId/test',
  authenticate,
  requireEmailVerification,
  chatbotManagementLimiter,
  ChatbotController.testChatbot
);

router.post(
  '/:chatbotId/train',
  authenticate,
  requireEmailVerification,
  trainingLimiter,
  ChatbotController.trainChatbot
);

// Public message processing endpoint (for embedded widgets)
router.post(
  '/:chatbotId/message',
  messageProcessingLimiter,
  ChatbotController.processMessage
);

// Public conversation management endpoint
router.post(
  '/conversations/:conversationId/end',
  messageProcessingLimiter,
  ChatbotController.endConversation
);

// Utility endpoints
router.get(
  '/test/ai-connection',
  authenticate,
  requireEmailVerification,
  ChatbotController.testAIConnection
);

export default router;