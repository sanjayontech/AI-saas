import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Admin authentication (no auth required for login)
router.post('/login', AdminController.adminLogin);
router.post('/create-admin', AdminController.createAdminUser); // For initial setup

// All routes below require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Dashboard and metrics
router.get('/dashboard', AdminController.getDashboard);
router.get('/metrics', AdminController.getSystemMetrics);
router.get('/health', AdminController.getSystemHealth);

// User management
router.get('/users', AdminController.getAllUsers);
router.get('/users/:userId', AdminController.getUserById);
router.put('/users/:userId/role', AdminController.updateUserRole);
router.delete('/users/:userId', AdminController.deleteUser);

export default router;