import { Router } from 'express';
import { UserManagementController } from '../controllers/UserManagementController';
import { authenticate, requireEmailVerification } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for admin operations
  message: {
    error: {
      code: 429,
      message: 'Too many admin requests, please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// TODO: Add admin role middleware when role-based access control is implemented
// For now, we'll just require authentication and email verification
router.use(authenticate);
router.use(requireEmailVerification);

// Admin user management endpoints
router.get('/users/usage-stats', adminLimiter, UserManagementController.getAllUsageStats);
router.post('/users/reset-monthly-stats', adminLimiter, UserManagementController.resetMonthlyUsageStats);

// TODO: Add more admin endpoints as needed:
// - Get all users
// - Get user by ID
// - Update user status (ban/unban)
// - System health metrics
// - Platform-wide analytics

export default router;