import { JWTUtils } from '../../utils/jwt';
import { User } from '../../models/User';
import jwt from 'jsonwebtoken';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

describe('JWTUtils', () => {
  const mockUser = new User({
    id: 'test-user-id',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    emailVerified: true
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = JWTUtils.generateAccessToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify the token can be decoded
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.emailVerified).toBe(mockUser.emailVerified);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = JWTUtils.generateRefreshToken(mockUser.id!);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify the token can be decoded
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as any;
      expect(decoded.id).toBe(mockUser.id);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = JWTUtils.generateAccessToken(mockUser);
      const payload = JWTUtils.verifyAccessToken(token);
      
      expect(payload.id).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.emailVerified).toBe(mockUser.emailVerified);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        JWTUtils.verifyAccessToken('invalid-token');
      }).toThrow('Invalid access token');
    });

    it('should throw error for expired token', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { id: mockUser.id, email: mockUser.email, emailVerified: mockUser.emailVerified },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' } // Already expired
      );

      expect(() => {
        JWTUtils.verifyAccessToken(expiredToken);
      }).toThrow('Access token has expired');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = JWTUtils.generateRefreshToken(mockUser.id!);
      const payload = JWTUtils.verifyRefreshToken(token);
      
      expect(payload.id).toBe(mockUser.id);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        JWTUtils.verifyRefreshToken('invalid-token');
      }).toThrow('Invalid refresh token');
    });

    it('should throw error for expired refresh token', () => {
      // Create an expired refresh token
      const expiredToken = jwt.sign(
        { id: mockUser.id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '-1s' } // Already expired
      );

      expect(() => {
        JWTUtils.verifyRefreshToken(expiredToken);
      }).toThrow('Refresh token has expired');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'valid-jwt-token';
      const header = `Bearer ${token}`;
      
      const extracted = JWTUtils.extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = JWTUtils.extractTokenFromHeader(undefined);
      expect(extracted).toBeNull();
    });

    it('should return null for invalid header format', () => {
      const extracted = JWTUtils.extractTokenFromHeader('InvalidHeader token');
      expect(extracted).toBeNull();
    });

    it('should return null for header without token', () => {
      const extracted = JWTUtils.extractTokenFromHeader('Bearer');
      expect(extracted).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const token = JWTUtils.generateAccessToken(mockUser);
      const isExpired = JWTUtils.isTokenExpired(token);
      
      expect(isExpired).toBe(false);
    });

    it('should return true for expired token', () => {
      const expiredToken = jwt.sign(
        { id: mockUser.id, email: mockUser.email },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' }
      );
      
      const isExpired = JWTUtils.isTokenExpired(expiredToken);
      expect(isExpired).toBe(true);
    });

    it('should return true for invalid token', () => {
      const isExpired = JWTUtils.isTokenExpired('invalid-token');
      expect(isExpired).toBe(true);
    });
  });

  describe('getTokenExpirationTime', () => {
    it('should return expiration time for valid token', () => {
      const token = JWTUtils.generateAccessToken(mockUser);
      const expirationTime = JWTUtils.getTokenExpirationTime(token);
      
      expect(expirationTime).toBeInstanceOf(Date);
      expect(expirationTime!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      const expirationTime = JWTUtils.getTokenExpirationTime('invalid-token');
      expect(expirationTime).toBeNull();
    });
  });
});