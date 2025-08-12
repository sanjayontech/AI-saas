import { AuthService } from '../../services/AuthService';
import { User } from '../../models/User';
import { TestDataFactory, TestCleanup, TestAssertions } from '../utils/testHelpers';
import { 
  ValidationError, 
  AuthenticationError, 
  ConflictError, 
  NotFoundError 
} from '../../utils/errors';
import { mockEmailService } from '../mocks/email';

describe('AuthService - Unit Tests', () => {

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockEmailService.clearSentEmails();
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

      const result = await AuthService.register(userData);

      TestAssertions.expectValidUser(result.user);
      expect(result.user.email).toBe(userData.email);
      expect(result.user.firstName).toBe(userData.firstName);
      expect(result.user.lastName).toBe(userData.lastName);
      expect(result.user.emailVerified).toBe(false);
      TestAssertions.expectValidTokens(result.tokens);
    })

    it('should throw ConflictError for duplicate email', a() => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'TestPassword123!',
       ,

      };

      // Register first user
      await AuthService.register(usera);

      // Try to registerl
      awata))
ts
        .toThrow(ConflictError);
    });

    it('should throw ValidationError for
      const userData = {
        email: '
        password: 'TestPassword1!',
       Test',

      };

      await expect(AuthService.a))
        .rejects
        .toThrow(Validatio
    });

{
      const userData = {
        email: '
        password: 'weak',
       ',

      };

      await expect(AuthService.reg
        .rejects
        .toThrow(Validatioor);
    });
  });

  describe('login', () => {
    it('should l{
      // Create test user
      c
     ',

      });

      const result = awaiogin({
        email: 'login@example.com',
        password: 'TestPassword123!'
      });

ser);
      expect(result.user.email).toBe('login@example.com');
ns);
    });

    it('should throw AuthenticationError for invalid e=> {
      aogin({
m',
        password: 'password'
      }))
        .rejects
        .toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for invalid password', async () => {
      // Create test user
      await TestDataFactory.createTestUser({
        email: 'wrongpass@example.com',
        password: 'TestPassword123!'
      });

      await expect(AuthService.login({
        email: '
        password: 'wrongpassword'
      }))
s
        .toThrow(AuthenticationError);
    });

    it('should throw AuthenticationErrornc () => {
      // Create unverified user
      await TestDataFactory.er({
        e',

        emailVerified: false
      });

      a({
     
'
      }))
        .rejects
        .toThrow(AuthenticationError);
    });
  });

  describe('refreshToken', () => {
 {
      // Create test user and get tokens
      const testUser = await TestDataFactory.createTestUser();
      c
er.email,
        password: 'testpassword123'
      });

      const result = await AuthService;

     
sToken);
    });

    it('should throw AuthenticationError for {
      await expect(AuthS
        .rejects
        .toThrow(AuthenticationError)
    });
  });

> {
    it('should verify email successfully', async () => {
      // Create user with verification token
      ata = {
        email: 'verify@example.com',
',
        firstName: 'Test',
ser'
      };

      const registerResult = await AuthS
      const user = await User.findById(registerResult.user.id!);
      
      expect(user?.emailVerificationToken).toBeDefined();



      expect(result.emailVerified).toBe(true);

      // Check that user is now 
      c);
     
ull();
    });

    it('should throw NotFoundError for invalid token', async {
      await expect(AuthService.ver
        .ects
;
    });
  });

=> {
    it('should create password reset token {
      const testUser = await TestDataFactory.createTestUse{
        email: 'reset@example.com'
      });

      await AuthService.requestPasswordReset(om');

      // Check that reset token was creat
      const user = await User.findById(testUser.user.id!)
      expect(user?.passwordResetToken).toBeDefined();
      e
;

    it('should not throw error for non-existent user', async () => {
      // Should not throw error f
      a
     s
();
    });
  });

  describe('resetPassword', () => {
    it('s () => {
({
        email: 'resetpass@example.com'
      });

      // Request password reset
      await AuthService.requestPasswordReset('reset
      
      const user = await User.findById(testUser.user.id!);




      expect(result.id).toBe(testUser.user.id);

      /word
{
        email: 'resetpass@example.com',
        password: 'NewPassword123!'
      });
      expect(loginResult.user).tned();
    });

    it('should throw NotFoundError for invalid token', async () => {
      await expect(AuthService.resetPassword('invalid-token', 23!'))
        .rejects
      dError);
    });

=> {
      const testUser = await TestDataFactory.createTestUser();
      await Authil);
      
      c!);
     etToken!;
   ););
  });
} }ror);
   ionErlidattoThrow(Va .   ects
        .rej   'weak'))
 Token, ssword(resetvice.resetPaer(AuthSt expect  awai
 