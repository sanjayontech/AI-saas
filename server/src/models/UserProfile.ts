import Joi from 'joi';
import { db } from '../database/connection';

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
  timezone: string;
}

export interface UserProfileData {
  id?: string;
  userId: string;
  preferences?: UserPreferences;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserProfile {
  public id?: string;
  public userId: string;
  public preferences: UserPreferences;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(data: UserProfileData) {
    this.id = data.id;
    this.userId = data.userId;
    this.preferences = data.preferences || {
      theme: 'light',
      notifications: true,
      language: 'en',
      timezone: 'UTC'
    };
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Validation schema
  static getValidationSchema() {
    return {
      update: Joi.object({
        preferences: Joi.object({
          theme: Joi.string().valid('light', 'dark').optional(),
          notifications: Joi.boolean().optional(),
          language: Joi.string().min(2).max(5).optional(),
          timezone: Joi.string().optional()
        }).optional()
      })
    };
  }

  // Database operations
  static async create(profileData: UserProfileData): Promise<UserProfile> {
    const [profile] = await db('user_profiles')
      .insert({
        user_id: profileData.userId,
        preferences: JSON.stringify(profileData.preferences || {
          theme: 'light',
          notifications: true,
          language: 'en',
          timezone: 'UTC'
        })
      })
      .returning('*');

    return new UserProfile({
      id: profile.id,
      userId: profile.user_id,
      preferences: typeof profile.preferences === 'string' 
        ? JSON.parse(profile.preferences) 
        : profile.preferences,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    });
  }

  static async findByUserId(userId: string): Promise<UserProfile | null> {
    const profile = await db('user_profiles').where({ user_id: userId }).first();
    
    if (!profile) return null;

    return new UserProfile({
      id: profile.id,
      userId: profile.user_id,
      preferences: typeof profile.preferences === 'string' 
        ? JSON.parse(profile.preferences) 
        : profile.preferences,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    });
  }

  static async findById(id: string): Promise<UserProfile | null> {
    const profile = await db('user_profiles').where({ id }).first();
    
    if (!profile) return null;

    return new UserProfile({
      id: profile.id,
      userId: profile.user_id,
      preferences: typeof profile.preferences === 'string' 
        ? JSON.parse(profile.preferences) 
        : profile.preferences,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    });
  }

  async save(): Promise<UserProfile> {
    const [updatedProfile] = await db('user_profiles')
      .where({ id: this.id })
      .update({
        preferences: JSON.stringify(this.preferences),
        updated_at: new Date()
      })
      .returning('*');

    return new UserProfile({
      id: updatedProfile.id,
      userId: updatedProfile.user_id,
      preferences: typeof updatedProfile.preferences === 'string' 
        ? JSON.parse(updatedProfile.preferences) 
        : updatedProfile.preferences,
      createdAt: updatedProfile.created_at,
      updatedAt: updatedProfile.updated_at
    });
  }

  async delete(): Promise<void> {
    await db('user_profiles').where({ id: this.id }).del();
  }

  // Create profile for user if it doesn't exist
  static async findOrCreateByUserId(userId: string): Promise<UserProfile> {
    let profile = await UserProfile.findByUserId(userId);
    
    if (!profile) {
      profile = await UserProfile.create({ userId });
    }
    
    return profile;
  }
}