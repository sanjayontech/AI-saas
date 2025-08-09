import { UserProfile, UserProfileData } from '../../models/UserProfile';
import { User } from '../../models/User';
import { db } from '../../database/connection';

describe('UserProfile Model', () => {
  let testUser: User;
  let testUserId: string;

  beforeEach(async () => {
    // Create a test user first
    testUser = await User.create({
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    });
    testUserId = testUser.id!;
  });

  afterEach(async () => {
    // Clean up test data
    await db('user_profiles').where({ user_id: testUserId }).del();
    await db('users').where({ id: testUserId }).del();
  });

  describe('constructor', () => {
    it('should create a UserProfile instance with default preferences', () => {
      const profileData: UserProfileData = {
        userId: testUserId
      };

      const profile = new UserProfile(profileData);

      expect(profile.userId).toBe(testUserId);
      expect(profile.preferences).toEqual({
        theme: 'light',
        notifications: true,
        language: 'en',
        timezone: 'UTC'
      });
    });

    it('should create a UserProfile instance with custom preferences', () => {
      const profileData: UserProfileData = {
        userId: testUserId,
        preferences: {
          theme: 'dark',
          notifications: false,
          language: 'es',
          timezone: 'America/New_York'
        }
      };

      const profile = new UserProfile(profileData);

      expect(profile.userId).toBe(testUserId);
      expect(profile.preferences).toEqual({
        theme: 'dark',
        notifications: false,
        language: 'es',
        timezone: 'America/New_York'
      });
    });
  });

  describe('validation', () => {
    it('should validate update data correctly', () => {
      const schema = UserProfile.getValidationSchema().update;
      
      const validData = {
        preferences: {
          theme: 'dark',
          notifications: false,
          language: 'es',
          timezone: 'America/New_York'
        }
      };

      const { error } = schema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid theme values', () => {
      const schema = UserProfile.getValidationSchema().update;
      
      const invalidData = {
        preferences: {
          theme: 'invalid'
        }
      };

      const { error } = schema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject invalid language values', () => {
      const schema = UserProfile.getValidationSchema().update;
      
      const invalidData = {
        preferences: {
          language: 'x' // too short
        }
      };

      const { error } = schema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('database operations', () => {
    describe('create', () => {
      it('should create a new user profile with default preferences', async () => {
        const profileData: UserProfileData = {
          userId: testUserId
        };

        const profile = await UserProfile.create(profileData);

        expect(profile.id).toBeDefined();
        expect(profile.userId).toBe(testUserId);
        expect(profile.preferences).toEqual({
          theme: 'light',
          notifications: true,
          language: 'en',
          timezone: 'UTC'
        });
        expect(profile.createdAt).toBeDefined();
        expect(profile.updatedAt).toBeDefined();
      });

      it('should create a new user profile with custom preferences', async () => {
        const customPreferences = {
          theme: 'dark' as const,
          notifications: false,
          language: 'es',
          timezone: 'America/New_York'
        };

        const profileData: UserProfileData = {
          userId: testUserId,
          preferences: customPreferences
        };

        const profile = await UserProfile.create(profileData);

        expect(profile.id).toBeDefined();
        expect(profile.userId).toBe(testUserId);
        expect(profile.preferences).toEqual(customPreferences);
      });
    });

    describe('findByUserId', () => {
      it('should find a user profile by user ID', async () => {
        const createdProfile = await UserProfile.create({ userId: testUserId });

        const foundProfile = await UserProfile.findByUserId(testUserId);

        expect(foundProfile).toBeDefined();
        expect(foundProfile!.id).toBe(createdProfile.id);
        expect(foundProfile!.userId).toBe(testUserId);
      });

      it('should return null if profile not found', async () => {
        const foundProfile = await UserProfile.findByUserId('non-existent-id');

        expect(foundProfile).toBeNull();
      });
    });

    describe('findById', () => {
      it('should find a user profile by ID', async () => {
        const createdProfile = await UserProfile.create({ userId: testUserId });

        const foundProfile = await UserProfile.findById(createdProfile.id!);

        expect(foundProfile).toBeDefined();
        expect(foundProfile!.id).toBe(createdProfile.id);
        expect(foundProfile!.userId).toBe(testUserId);
      });

      it('should return null if profile not found', async () => {
        const foundProfile = await UserProfile.findById('non-existent-id');

        expect(foundProfile).toBeNull();
      });
    });

    describe('save', () => {
      it('should update an existing user profile', async () => {
        const profile = await UserProfile.create({ userId: testUserId });
        
        profile.preferences.theme = 'dark';
        profile.preferences.notifications = false;

        const updatedProfile = await profile.save();

        expect(updatedProfile.preferences.theme).toBe('dark');
        expect(updatedProfile.preferences.notifications).toBe(false);
        expect(updatedProfile.updatedAt).toBeDefined();
      });
    });

    describe('delete', () => {
      it('should delete a user profile', async () => {
        const profile = await UserProfile.create({ userId: testUserId });

        await profile.delete();

        const foundProfile = await UserProfile.findById(profile.id!);
        expect(foundProfile).toBeNull();
      });
    });

    describe('findOrCreateByUserId', () => {
      it('should return existing profile if it exists', async () => {
        const existingProfile = await UserProfile.create({ userId: testUserId });

        const profile = await UserProfile.findOrCreateByUserId(testUserId);

        expect(profile.id).toBe(existingProfile.id);
      });

      it('should create new profile if it does not exist', async () => {
        const profile = await UserProfile.findOrCreateByUserId(testUserId);

        expect(profile.id).toBeDefined();
        expect(profile.userId).toBe(testUserId);
        expect(profile.preferences).toEqual({
          theme: 'light',
          notifications: true,
          language: 'en',
          timezone: 'UTC'
        });
      });
    });
  });
});