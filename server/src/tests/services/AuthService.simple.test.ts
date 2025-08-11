import { AuthService } from '../../services/AuthService';
import { User } from '../../models/User';
import { TestDataFactory, TestCleanup } from '../utils/testHelpers';
import { 
  ValidationError, 
  AuthenticationError, 
  ConflictError, 
  NotFoundError 
} from '../../utils/errors';

describe('AuthService - Integration Tests', () => {
  let authService: AuthService;

  beforeAll(() => {
    authService = new AuthService();
  });

  afterEach(async () => {
    await TestCleanup.cleanupAll();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const result = await authService.register(userData);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(result.user.firstName).toBe(userData.firstName);
      expect(result.user.lastName).toBe(userData.lastName);
      expect(result.user.emailVerified).toBe(false);
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw ConflictError for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      // Register first user
      await authService.register(userData);

      // Try to register with same email
      await expect(authService.register(userData))
        .rejects
        .toThrow(ConflictError);
    });

    it('should throw ValidationError for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      await expect(authService.register(userData))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError for weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User'
      };

      await expect(authService.register(userData))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      // Create test user
      const testUser = await TestDataFactory.createTestUser({
        email: 'login@example.com',
        password: 'TestPassword123!'
      });

      const result = await authService.login('login@example.com', 'TestPassword123!');

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('login@example.com');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw AuthenticationError for invalid email', async () => {
      await expect(authService.login('nonexistent@example.com', 'password'))
        .rejects
        .toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for invalid password', async () => {
      // Create test user
      await TestDataFactory.createTestUser({
        email: 'wrongpass@example.com',
        password: 'TestPassword123!'
      });

      await expect(authService.login('wrongpass@example.com', 'wrongpassword'))
        .rejects
        .toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for unverified email', async () => {
      // Create unverified user
      await TestDataFactory.createTestUser({
        email: 'unverified@example.com',
        password: 'TestPassword123!',
        emailVerified: false
      });

      await expect(authService.login('unverified@example.com', 'TestPassword123!'))
        .rejects
        .toThrow(AuthenticationError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      // Create test user and get tokens
      const testUser = await TestDataFactory.createTestUser();
      const loginResult = await authService.login(testUser.user.email, 'testpassword123');

      const result = await authService.refreshToken(loginResult.tokens.refreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.accessToken).not.toBe(loginResult.tokens.accessToken);
    });

    it('should throw AuthenticationError for invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-token'))
        .rejects
        .toThrow(AuthenticationError);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      // Create user with verification token
      const userData = {
        email: 'verify@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const registerResult = await authService.register(userData);
      const user = await User.findById(registerResult.user.id!);
      
      expect(user?.emailVerificationToken).toBeDefined();

      const result = await authService.verifyEmail(user!.emailVerificationToken!);

      expect(result).toBe(true);

      // Check that user is now verified
      const verifiedUser = await User.findById(registerResult.user.id!);
      expect(verifiedUser?.emailVerified).toBe(true);
      expect(verifiedUser?.emailVerificationToken).toBeNull();
    });

    it('should throw NotFoundError for invalid token', async () => {
      await expect(authService.verifyEmail('invalid-token'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('requestPasswordReset', () => {
    it('should create password reset token for existing user', async () => {
      const testUser = await TestDataFactory.createTestUser({
        email: 'reset@example.com'
      });

      const result = await authService.requestPasswordReset('reset@example.com');

      expect(result).toBe(true);

      // Check that reset token was created
      const user = await User.findById(testUser.user.id!);
      expect(user?.passwordResetToken).toBeDefined();
      expect(user?.passwordResetExpires).toBeDefined();
    });

    it('should return false for non-existent user', async () => {
      const result = await authService.requestPasswordReset('nonexistent@example.com');
      expect(result).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const testUser = await TestDataFactory.createTestUser({
        email: 'resetpass@example.com'
      });

      // Request password reset
      await authService.requestPasswordReset('resetpass@example.com');
      
      const user = await User.findById(testUser.user.id!);
      const resetToken = user!.passwordResetToken!;

      const result = await authService.resetPassword(resetToken, 'NewPassword123!');

      expect(result).toBe(true);

      // Verify user can login with new password
      const loginResult = await authService.login('resetpass@example.com', 'NewPassword123!');
      expect(loginResult.user).toBeDefined();
    });

    it('should throw NotFoundError for invalid token', async () => {
      await expect(authService.resetPassword('invalid-token', 'NewPassword123!'))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should throw ValidationError for weak password', async () => {
      const testUser = await TestDataFactory.createTestUser();
      await authService.requestPasswordReset(testUser.user.email);
      
      const user = await User.findById(testUser.user.id!);
      const resetToken = user!.passwordResetToken!;

      await expect(authService.resetPassword(resetToken, 'weak'))
        .rejects
        .toThrow(ValidationError);
    });
  });
});