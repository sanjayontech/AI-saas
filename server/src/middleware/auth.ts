import { Request, Response, NextFunction } from 'express';
import { JWTUtils, JWTPayload } from '../utils/jwt';
import { User } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        error: {
          code: 401,
          message: 'Access token is required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    let payload: JWTPayload;
    try {
      payload = JWTUtils.verifyAccessToken(token);
    } catch (error) {
      res.status(401).json({
        error: {
          code: 401,
          message: error instanceof Error ? error.message : 'Invalid token',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Fetch user from database to ensure they still exist
    const user = await User.findById(payload.id);
    if (!user) {
      res.status(401).json({
        error: {
          code: 401,
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: {
        code: 500,
        message: 'Internal server error during authentication',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const requireEmailVerification = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.emailVerified) {
    res.status(403).json({
      error: {
        code: 403,
        message: 'Email verification required',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }
  
  next();
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      next();
      return;
    }

    try {
      const payload = JWTUtils.verifyAccessToken(token);
      const user = await User.findById(payload.id);
      
      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    } catch (error) {
      // Ignore token errors for optional auth
      console.log('Optional auth token error:', error);
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next();
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 401,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  if (!req.user.isAdmin()) {
    res.status(403).json({
      error: {
        code: 403,
        message: 'Admin access required',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }
  
  next();
};