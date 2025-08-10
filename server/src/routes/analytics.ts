import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get analytics summary for all user's chatbots
router.get('/summary', AnalyticsController.getUserAnalyticsSummary);

// Get dashboard metrics for a specific chatbot
router.get('/chatbots/:chatbotId/dashboard', AnalyticsController.getDashboardMetrics);

// Get conversation insights for a specific chatbot
router.get('/chatbots/:chatbotId/insights', AnalyticsController.getConversationInsights);

// Get conversation history with search and filtering
router.get('/chatbots/:chatbotId/conversations', AnalyticsController.getConversationHistory);

// Get performance insights for a specific chatbot
router.get('/chatbots/:chatbotId/performance', AnalyticsController.getPerformanceInsights);

// Export analytics data
router.get('/chatbots/:chatbotId/export', AnalyticsController.exportAnalyticsData);

// Generate analytics for a specific date range
router.post('/chatbots/:chatbotId/generate', AnalyticsController.generateAnalytics);

export default router;