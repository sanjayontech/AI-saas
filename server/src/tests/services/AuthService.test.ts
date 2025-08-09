import { AuthService } from '../../services/AuthService';
import { User } from '../../models/User';
import { 
  ValidationError, 
  AuthenticationError, 
  ConflictError, 
  NotFoundError 
} from '../../utils/errors';

// Mock the User model
jest.mock('../../models/User');
const MockUser = User as jest.MockedClass<typeof User>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const mockUser = new User({
        id: 'test-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: false
      });

      MockUser.getValidationSchema = jest.fn().mockReturnValue({
        register: {
          validate: jest.fn().mockReturnValue({ error: null })
        }
      });
      MockUser.findByEmail = jest.fn().mockResolvedValue(null);
      MockUser.create = jest.fn().mockResolvedValue(mockUser);
      mockUser.generateTokens = jest.fn().mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      });

      const result = await AuthService.register(registerData);

      expect(result.user).toBe(mockUser);
      expect(result.tokens).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      });
      expect(MockUser.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(MockUser.create).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid data', async () => {
      const registerData = {
        email: 'invalid-email',
        password: 'weak',
        firstName: '',
        lastName: ''
      };

      MockUser.getValidationSchema = jest.fn().mockReturnValue({
        register: {
          validate: jest.fn().mockReturnValue({
            error: {
              details: [{ message: 'Please provide a valid email address' }]
            }
          })
        }
      });

      await expect(AuthService.register(registerData))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError if user already exists', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const existingUser = new User({
        id: 'existing-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Existing',
        lastName: 'User'
      });

      MockUser.getValidationSchema = jest.fn().mockReturnValue({
        register: {
          validate: jest.fn().mockReturnValue({ error: null })
        }
      });
      MockUser.findByEmail = jest.fn().mockResolvedValue(existingUser);

      await expect(AuthService.register(registerData))
        .rejects.toThrow(ConflictError);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      const mockUser = new User({
        id: 'test-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true
      });

      MockUser.getValidationSchema = jest.fn().mockReturnValue({
        login: {
          validate: jest.fn().mockReturnValue({ error: null })
        }
      });
      MockUser.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockUser.verifyPassword = jest.fn().mockResolvedValue(true);
      mockUser.generateTokens = jest.fn().mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      });

      const result = await AuthService.login(loginData);

      expect(result.user).toBe(mockUser);
      expect(result.tokens).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      });
      expect(mockUser.verifyPassword).toHaveBeenCalledWith('TestPassword123!');
    });

    it('should throw AuthenticationError for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };

      MockUser.getValidationSchema = jest.fn().mockReturnValue({
        login: {
          validate: jest.fn().mockReturnValue({ error: null })
        }
      });
      MockUser.findByEmail = jest.fn().mockResolvedValue(null);

      await expect(AuthService.login(loginData))
        .rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockUser = new User({
        id: 'test-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Test',
        lastName: 'User'
      });

      MockUser.getValidationSchema = jest.fn().mockReturnValue({
        login: {
          validate: jest.fn().mockReturnValue({ error: null })
        }
      });
      MockUser.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockUser.verifyPassword = jest.fn().mockResolvedValue(false);

      await expect(AuthService.login(loginData))
        .rejects.toThrow(AuthenticationError);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const token = 'verification-token';
      const mockUser = new User({
        id: 'test-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: false,
        emailVerificationToken: token
      });

      MockUser.findByEmailVerificationToken = jest.fn().mockResolvedValue(mockUser);
      mockUser.save = jest.fn().mockResolvedValue(mockUser);

      const result = await AuthService.verifyEmail(token);

      expect(result.emailVerified).toBe(true);
      expect(result.emailVerificationToken).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw NotFoundError for invalid token', async () => {
      const token = 'invalid-token';

      MockUser.findByEmailVerificationToken = jest.fn().mockResolvedValue(null);

      await expect(AuthService.verifyEmail(token))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('requestPasswordReset', () => {
    it('should generate password reset token for existing user', async () => {
      const email = 'test@example.com';
      const mockUser = new User({
        id: 'test-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Test',
        lastName: 'User'
      });

      MockUser.getValidationSchema = jest.fn().mockReturnValue({
        resetPassword: {
          validate: jest.fn().mockReturnValue({ error: null })
        }
      });
      MockUser.findByEmail = jest.fn().mockResolvedValue(mockUser);
      mockUser.save = jest.fn().mockResolvedValue(mockUser);

      await AuthService.requestPasswordReset(email);

      expect(mockUser.passwordResetToken).toBeDefined();
      expect(mockUser.passwordResetExpires).toBeDefined();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should not throw error for non-existent user (security)', async () => {
      const email = 'nonexistent@example.com';

      MockUser.getValidationSchema = jest.fn().mockReturnValue({
        resetPassword: {
          validate: jest.fn().mockReturnValue({ error: null })
        }
      });
      MockUser.findByEmail = jest.fn().mockResolvedValue(null);

      // Should not throw error to prevent email enumeration
      await expect(AuthService.requestPasswordReset(email))
        .resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const token = 'reset-token';
      const newPassword = 'NewPassword123!';
      const mockUser = new User({
        id: 'test-id',
        email: 'test@example.com',
        passwordHash: 'old-hashed-password',
        firstName: 'Test',
        lastName: 'User',
        passwordResetToken: token,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000)
      });

      MockUser.getValidationSchema = jest.fn().mockReturnValue({
        updatePassword: {
          validate: jest.fn().mockReturnValue({ error: null })
        }
      });
      MockUser.findByPasswordResetToken = jest.fn().mockResolvedValue(mockUser);
      MockUser.hashPassword = jest.fn().mockResolvedValue('new-hashed-password');
      mockUser.save = jest.fn().mockResolvedValue(mockUser);

      const result = await AuthService.resetPassword(token, newPassword);

      expect(result.passwordResetToken).toBeNull();
      expect(result.passwordResetExpires).toBeNull();
      expect(MockUser.hashPassword).toHaveBeenCalledWith(newPassword);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw NotFoundError for invalid token', async () => {
      const token = 'invalid-token';
      const newPassword = 'NewPassword123!';

      MockUser.getValidationSchema = jest.fn().mockReturnValue({
        updatePassword: {
          validate: jest.fn().mockReturnValue({ error: null })
        }
      });
      MockUser.findByPasswordResetToken = jest.fn().mockResolvedValue(null);

      await expect(AuthService.resetPassword(token, newPassword))
        .rejects.toThrow(NotFoundError);
    });
  });
});