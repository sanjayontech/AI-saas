import { Router } from 'express';
import { WidgetController } from '../controllers/WidgetController';
import { authenticate } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();
const widgetController = new WidgetController();

// Rate limiting for widget endpoints
const widgetRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many widget requests, please try again later'
  }
});

const publicWidgetRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute for public endpoints
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  }
});

// Public endpoints (no authentication required)
router.get('/chat-widget.js', publicWidgetRateLimit, widgetController.serveWidget);
router.get('/:chatbotId/config', publicWidgetRateLimit, widgetController.getWidgetConfig);

// Protected endpoints (authentication required)
router.post('/:chatbotId/embed-code', authenticate, widgetRateLimit, widgetController.generateEmbedCode);
router.get('/:chatbotId/analytics', authenticate, widgetRateLimit, widgetController.getWidgetAnalytics);

export default router;