import { User } from '../../models/User';
import { TestCleanup } from '../utils/testHelpers';

describe('User Model - Simple Tests', () => {
  afterEach(async () => {
    await TestCleanup.cleanupAll();
  });

  describe('User Creation', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.role).toBe('user');
      expect(user.emailVerified).toBe(false);
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe(userData.password);
    });

    it('should hash password during creation', async () => {
      const userData = {
        email: 'hash@example.com',
        password: 'TestPassword123!',
        firstName: 'Hash',
        lastName: 'Test'
      };

      const user = await User.create(userData);

      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe(userData.password);
      expect(user.passwordHash.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    it('should set default role to user', async () => {
      const userData = {
        email: 'role@example.com',
        password: 'TestPassword123!',
        firstName: 'Role',
        lastName: 'Test'
      };

      const user = await User.create(userData);

      expect(user.role).toBe('user');
    });

    it('should allow admin role when specified', async () => {
      const userData = {
        email: 'admin@example.com',
        password: 'TestPassword123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin' as const
      };

      const user = await User.create(userData);

      expect(user.role).toBe('admin');
      expect(user.isAdmin()).toBe(true);
    });
  });

  describe('User Lookup', () => {
    it('should find user by email', async () => {
      const userData = {
        email: 'findme@example.com',
        password: 'TestPassword123!',
        firstName: 'Find',
        lastName: 'Me'
      };

      const createdUser = await User.create(userData);
      const foundUser = await User.findByEmail(userData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.email).toBe(userData.email);
    });

    it('should return null for non-existent email', async () => {
      const user = await User.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });

    it('should find user by ID', async () => {
      const userData = {
        email: 'findbyid@example.com',
        password: 'TestPassword123!',
        firstName: 'Find',
        lastName: 'ById'
      };

      const createdUser = await User.create(userData);
      const foundUser = await User.findById(createdUser.id!);

      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.email).toBe(userData.email);
    });

    it('should return null for non-existent ID', async () => {
      const user = await User.findById('non-existent-id');
      expect(user).toBeNull();
    });
  });

  describe('Password Verification', () => {
    it('should verify correct password', async () => {
      const userData = {
        email: 'password@example.com',
        password: 'TestPassword123!',
        firstName: 'Password',
        lastName: 'Test'
      };

      const user = await User.create(userData);
      const isValid = await user.verifyPassword('TestPassword123!');

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const userData = {
        email: 'wrongpass@example.com',
        password: 'TestPassword123!',
        firstName: 'Wrong',
        lastName: 'Pass'
      };

      const user = await User.create(userData);
      const isValid = await user.verifyPassword('WrongPassword123!');

      expect(isValid).toBe(false);
    });
  });

  describe('User Update', () => {
    it('should update user data', async () => {
      const userData = {
        email: 'update@example.com',
        password: 'TestPassword123!',
        firstName: 'Update',
        lastName: 'Test'
      };

      const user = await User.create(userData);
      user.firstName = 'Updated';
      user.lastName = 'Name';

      const updatedUser = await user.save();

      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('Name');
      expect(updatedUser.email).toBe(userData.email); // Should remain unchanged
    });

    it('should update last login time', async () => {
      const userData = {
        email: 'login@example.com',
        password: 'TestPassword123!',
        firstName: 'Login',
        lastName: 'Test'
      };

      const user = await User.create(userData);
      expect(user.lastLoginAt).toBeNull();

      await user.updateLastLogin();

      const updatedUser = await User.findById(user.id!);
      expect(updatedUser!.lastLoginAt).toBeDefined();
      expect(updatedUser!.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe('Token Generation', () => {
    it('should generate JWT tokens', async () => {
      const userData = {
        email: 'tokens@example.com',
        password: 'TestPassword123!',
        firstName: 'Token',
        lastName: 'Test',
        emailVerified: true
      };

      const user = await User.create(userData);
      const tokens = user.generateTokens();

      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(tokens.accessToken.length).toBeGreaterThan(50);
      expect(tokens.refreshToken.length).toBeGreaterThan(50);
    });
  });

  describe('Admin Methods', () => {
    it('should get user count', async () => {
      // Create some test users
      await User.create({
        email: 'count1@example.com',
        password: 'TestPassword123!',
        firstName: 'Count',
        lastName: 'One'
      });

      await User.create({
        email: 'count2@example.com',
        password: 'TestPassword123!',
        firstName: 'Count',
        lastName: 'Two'
      });

      const count = await User.getUserCount();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should get admin count', async () => {
      await User.create({
        email: 'admin1@example.com',
        password: 'TestPassword123!',
        firstName: 'Admin',
        lastName: 'One',
        role: 'admin'
      });

      const adminCount = await User.getAdminCount();
      expect(adminCount).toBeGreaterThanOrEqual(1);
    });

    it('should find all users with pagination', async () => {
      // Create test users
      await User.create({
        email: 'paginate1@example.com',
        password: 'TestPassword123!',
        firstName: 'Page',
        lastName: 'One'
      });

      await User.create({
        email: 'paginate2@example.com',
        password: 'TestPassword123!',
        firstName: 'Page',
        lastName: 'Two'
      });

      const users = await User.findAllUsers(10, 0);
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThanOrEqual(2);
    });
  });
});