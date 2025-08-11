import { JWTUtils } from '../../utils/jwt';
import { User } from '../../models/User';
import { TestCleanup } from '../utils/testHelpers';

describe('JWT Utils - Simple Tests', () => {
  let testUser: User;

  beforeEach(async () => {
    testUser = await User.create({
      email: 'jwt@example.com',
      password: 'TestPassword123!',
      firstName: 'JWT',
      lastName: 'Test',
      emailVerified: true
    });
  });

  afterEach(async () => {
    await TestCleanup.cleanupAll();
  });

  describe('Access Token', () => {
    it('should generate access token', () => {
      const token = JWTUtils.generateAccessToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(50);
    });

    it('should verify valid access token', () => {
      const token = JWTUtils.generateAccessToken(testUser);
      const payload = JWTUtils.verifyAccessToken(token);

      expect(payload).toBeDefined();
      expect(payload.id).toBe(testUser.id);
      expect(payload.email).toBe(testUser.email);
      expect(payload.role).toBe(testUser.role);
      expect(payload.emailVerified).toBe(testUser.emailVerified);
    });

    it('should throw error for invalid access token', () => {
      expect(() => {
        JWTUtils.verifyAccessToken('invalid-token');
      }).toThrow();
    });

    it('should throw error for malformed token', () => {
      expect(() => {
        JWTUtils.verifyAccessToken('not.a.valid.jwt.token');
      }).toThrow();
    });
  });

  describe('Refresh Token', () => {
    it('should generate refresh token', () => {
      const token = JWTUtils.generateRefreshToken(testUser.id!);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(50);
    });

    it('should verify valid refresh token', () => {
      const token = JWTUtils.generateRefreshToken(testUser.id!);
      const payload = JWTUtils.verifyRefreshToken(token);

      expect(payload).toBeDefined();
      expect(payload.id).toBe(testUser.id);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        JWTUtils.verifyRefreshToken('invalid-token');
      }).toThrow();
    });
  });

  describe('Token Utilities', () => {
    it('should extract token from Bearer header', () => {
      const token = 'sample-jwt-token';
      const authHeader = `Bearer ${token}`;

      const extracted = JWTUtils.extractTokenFromHeader(authHeader);

      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      const extracted = JWTUtils.extractTokenFromHeader('Invalid header');
      expect(extracted).toBeNull();
    });

    it('should return null for missing header', () => {
      const extracted = JWTUtils.extractTokenFromHeader(undefined);
      expect(extracted).toBeNull();
    });

    it('should check if token is expired', () => {
      const validToken = JWTUtils.generateAccessToken(testUser);
      const isExpired = JWTUtils.isTokenExpired(validToken);

      expect(isExpired).toBe(false);
    });

    it('should return true for invalid token expiration check', () => {
      const isExpired = JWTUtils.isTokenExpired('invalid-token');
      expect(isExpired).toBe(true);
    });

    it('should get token expiration time', () => {
      const token = JWTUtils.generateAccessToken(testUser);
      const expirationTime = JWTUtils.getTokenExpirationTime(token);

      expect(expirationTime).toBeDefined();
      expect(expirationTime).toBeInstanceOf(Date);
      expect(expirationTime!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token expiration time', () => {
      const expirationTime = JWTUtils.getTokenExpirationTime('invalid-token');
      expect(expirationTime).toBeNull();
    });
  });
});