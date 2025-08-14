import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate, requireEmailVerification } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    error: {
      code: 429,
      message: 'Too many authentication attempts, please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    error: {
      code: 429,
      message: 'Too many password reset attempts, please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.get('/verify-email/:token', AuthController.verifyEmail);
router.post('/request-password-reset', passwordResetLimiter, AuthController.requestPasswordReset);
router.post('/reset-password/:token', authLimiter, AuthController.resetPassword);
router.post('/resend-verification', authLimiter, AuthController.resendEmailVerification);

// Protected routes
router.get('/me', authenticate, AuthController.getCurrentUser);
router.post('/refresh-user-token', authenticate, AuthController.refreshUserToken);
router.post('/logout', authenticate, AuthController.logout);

// Routes that require email verification
router.get('/profile', authenticate, requireEmailVerification, AuthController.getCurrentUser);

export default router;