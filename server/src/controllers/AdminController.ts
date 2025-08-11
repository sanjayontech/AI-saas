import { Request, Response } from 'express';
import { AdminService } from '../services/AdminService';
import { AuthService } from '../services/AuthService';
import { AuthenticatedRequest } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../utils/errors';

export class AdminController {
  // Admin authentication
  static async adminLogin(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Email and password are required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await AuthService.adminLogin({ email, password });

      res.status(200).json({
        message: 'Admin login successful',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            emailVerified: result.user.emailVerified
          },
          tokens: result.tokens
        }
      });
    } catch (error) {
      console.error('Admin login error:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 400,
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(401).json({
        error: {
          code: 401,
          message: error instanceof Error ? error.message : 'Admin login failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Dashboard data
  static async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const dashboardData = await AdminService.getDashboardData();

      res.status(200).json({
        message: 'Dashboard data retrieved successfully',
        data: dashboardData
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({
        error: {
          code: 500,
          message: 'Failed to retrieve dashboard data',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // System metrics
  static async getSystemMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const metrics = await AdminService.getSystemMetrics();

      res.status(200).json({
        message: 'System metrics retrieved successfully',
        data: metrics
      });
    } catch (error) {
      console.error('Get system metrics error:', error);
      res.status(500).json({
        error: {
          code: 500,
          message: 'Failed to retrieve system metrics',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // User management
  static async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;

      let userData;
      if (search) {
        userData = await AdminService.searchUsers(search, page, limit);
      } else {
        userData = await AdminService.getAllUsers(page, limit);
      }

      res.status(200).json({
        message: 'Users retrieved successfully',
        data: userData
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        error: {
          code: 500,
          message: 'Failed to retrieve users',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'User ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const user = await AdminService.getUserById(userId);

      res.status(200).json({
        message: 'User retrieved successfully',
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 404,
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 500,
          message: 'Failed to retrieve user',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async updateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!userId) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'User ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!role) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Role is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const updatedUser = await AdminService.updateUserRole(userId, role);

      res.status(200).json({
        message: 'User role updated successfully',
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          emailVerified: updatedUser.emailVerified,
          lastLoginAt: updatedUser.lastLoginAt,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      });
    } catch (error) {
      console.error('Update user role error:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 400,
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 404,
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 500,
          message: 'Failed to update user role',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'User ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Prevent admin from deleting themselves
      if (userId === req.userId) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'Cannot delete your own account',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      await AdminService.deleteUser(userId);

      res.status(200).json({
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 404,
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 500,
          message: 'Failed to delete user',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // System health
  static async getSystemHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const healthData = await AdminService.getSystemHealth();

      res.status(200).json({
        message: 'System health retrieved successfully',
        data: healthData
      });
    } catch (error) {
      console.error('Get system health error:', error);
      res.status(500).json({
        error: {
          code: 500,
          message: 'Failed to retrieve system health',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Create admin user (for initial setup)
  static async createAdminUser(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({
          error: {
            code: 400,
            message: 'All fields are required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await AuthService.createAdminUser({
        email,
        password,
        firstName,
        lastName
      });

      res.status(201).json({
        message: 'Admin user created successfully',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            emailVerified: result.user.emailVerified
          },
          tokens: result.tokens
        }
      });
    } catch (error) {
      console.error('Create admin user error:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 400,
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 500,
          message: error instanceof Error ? error.message : 'Failed to create admin user',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}