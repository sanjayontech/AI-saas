import { Router } from 'express';
import { UserManagementController } from '../controllers/UserManagementController';
import { authenticate, requireEmailVerification } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for user management endpoints
const userManagementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs for user management
  message: {
    error: {
      code: 429,
      message: 'Too many requests, please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for sensitive operations
const sensitiveOperationsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 sensitive operations per hour
  message: {
    error: {
      code: 429,
      message: 'Too many sensitive operations, please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Data export rate limiting (GDPR compliance)
const dataExportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // Limit each IP to 3 data export requests per day
  message: {
    error: {
      code: 429,
      message: 'Too many data export requests, please try again tomorrow.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// All user management routes require authentication and email verification
router.use(authenticate);
router.use(requireEmailVerification);

// User profile management
router.get('/profile', userManagementLimiter, UserManagementController.getUserProfile);
router.put('/profile', userManagementLimiter, UserManagementController.updateUserProfile);

// Usage statistics
router.get('/usage', userManagementLimiter, UserManagementController.getUserUsageStats);

// Data export (GDPR compliance)
router.get('/export', dataExportLimiter, UserManagementController.exportUserData);

// Account deletion (sensitive operation)
router.delete('/account', sensitiveOperationsLimiter, UserManagementController.deleteUserAccount);

// Internal usage tracking endpoints (might be called by other services)
router.post('/track/message', userManagementLimiter, UserManagementController.trackMessageUsage);
router.post('/track/chatbot', userManagementLimiter, UserManagementController.trackChatbotCreation);
router.put('/storage', userManagementLimiter, UserManagementController.updateStorageUsage);
router.put('/activity', userManagementLimiter, UserManagementController.updateUserActivity);

export default router;