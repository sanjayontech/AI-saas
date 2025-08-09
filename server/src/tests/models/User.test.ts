import { User } from '../../models/User';
import { CryptoUtils } from '../../utils/crypto';

// Mock the database connection
jest.mock('../../database/connection', () => ({
  db: jest.fn()
}));

const { db: mockDb } = require('../../database/connection');

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await User.hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    it('should verify password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await User.hashPassword(password);
      
      const user = new User({
        email: 'test@example.com',
        passwordHash: hashedPassword,
        firstName: 'Test',
        lastName: 'User'
      });

      const isValid = await user.verifyPassword(password);
      const isInvalid = await user.verifyPassword('wrongpassword');

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Token Generation', () => {
    it('should generate JWT tokens', () => {
      const user = new User({
        id: 'test-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true
      });

      const tokens = user.generateTokens();

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });
  });

  describe('Validation', () => {
    it('should validate registration data correctly', () => {
      const validData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const { error } = User.getValidationSchema().register.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const { error } = User.getValidationSchema().register.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('valid email');
    });

    it('should reject weak password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User'
      };

      const { error } = User.getValidationSchema().register.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Password must');
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
        // Missing firstName and lastName
      };

      const { error } = User.getValidationSchema().register.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Database Operations', () => {
    it('should create user in database', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        emailVerificationToken: 'test-token'
      };

      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        first_name: 'Test',
        last_name: 'User',
        email_verified: false,
        email_verification_token: 'test-token',
        password_reset_token: null,
        password_reset_expires: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockUser])
        })
      });

      const user = await User.create(userData);

      expect(user).toBeInstanceOf(User);
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
    });

    it('should find user by email', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        first_name: 'Test',
        last_name: 'User',
        email_verified: true,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(mockUser)
        })
      });

      const user = await User.findByEmail('test@example.com');

      expect(user).toBeInstanceOf(User);
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null when user not found', async () => {
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null)
        })
      });

      const user = await User.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });
});