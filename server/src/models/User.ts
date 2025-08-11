import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { db } from '../database/connection';

export type UserRole = 'user' | 'admin';

export interface UserData {
  id?: string;
  email: string;
  password?: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  emailVerified?: boolean;
  emailVerificationToken?: string | null;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class User {
  public id?: string;
  public email: string;
  public passwordHash: string;
  public firstName: string;
  public lastName: string;
  public role: UserRole;
  public emailVerified: boolean;
  public emailVerificationToken?: string | null;
  public passwordResetToken?: string | null;
  public passwordResetExpires?: Date | null;
  public lastLoginAt?: Date | null;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(data: UserData) {
    this.id = data.id;
    this.email = data.email;
    this.passwordHash = data.passwordHash || '';
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.role = data.role || 'user';
    this.emailVerified = data.emailVerified || false;
    this.emailVerificationToken = data.emailVerificationToken;
    this.passwordResetToken = data.passwordResetToken;
    this.passwordResetExpires = data.passwordResetExpires;
    this.lastLoginAt = data.lastLoginAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Validation schema
  static getValidationSchema() {
    return {
      register: Joi.object({
        email: Joi.string().email().required().messages({
          'string.email': 'Please provide a valid email address',
          'any.required': 'Email is required'
        }),
        password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
          'string.min': 'Password must be at least 8 characters long',
          'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
          'any.required': 'Password is required'
        }),
        firstName: Joi.string().min(1).max(50).required().messages({
          'string.min': 'First name is required',
          'string.max': 'First name cannot exceed 50 characters',
          'any.required': 'First name is required'
        }),
        lastName: Joi.string().min(1).max(50).required().messages({
          'string.min': 'Last name is required',
          'string.max': 'Last name cannot exceed 50 characters',
          'any.required': 'Last name is required'
        })
      }),
      login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
      }),
      resetPassword: Joi.object({
        email: Joi.string().email().required()
      }),
      updatePassword: Joi.object({
        token: Joi.string().required(),
        password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required()
      })
    };
  }

  // Password hashing
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Password verification
  async verifyPassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.role === 'admin';
  }

  // Generate JWT tokens
  generateTokens(): AuthTokens {
    const payload = {
      id: this.id,
      email: this.email,
      role: this.role,
      emailVerified: this.emailVerified
    };

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets are not defined');
    }

    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { id: this.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  // Database operations
  static async create(userData: UserData): Promise<User> {
    const hashedPassword = await User.hashPassword(userData.password!);
    
    const [user] = await db('users')
      .insert({
        email: userData.email,
        password_hash: hashedPassword,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role || 'user',
        email_verification_token: userData.emailVerificationToken
      })
      .returning('*');

    return new User({
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      emailVerified: user.email_verified,
      emailVerificationToken: user.email_verification_token,
      passwordResetToken: user.password_reset_token,
      passwordResetExpires: user.password_reset_expires,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });
  }

  static async findByEmail(email: string): Promise<User | null> {
    const user = await db('users').where({ email }).first();
    
    if (!user) return null;

    return new User({
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      emailVerified: user.email_verified,
      emailVerificationToken: user.email_verification_token,
      passwordResetToken: user.password_reset_token,
      passwordResetExpires: user.password_reset_expires,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });
  }

  static async findById(id: string): Promise<User | null> {
    const user = await db('users').where({ id }).first();
    
    if (!user) return null;

    return new User({
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      emailVerified: user.email_verified,
      emailVerificationToken: user.email_verification_token,
      passwordResetToken: user.password_reset_token,
      passwordResetExpires: user.password_reset_expires,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });
  }

  async save(): Promise<User> {
    const [updatedUser] = await db('users')
      .where({ id: this.id })
      .update({
        email: this.email,
        password_hash: this.passwordHash,
        first_name: this.firstName,
        last_name: this.lastName,
        role: this.role,
        email_verified: this.emailVerified,
        email_verification_token: this.emailVerificationToken,
        password_reset_token: this.passwordResetToken,
        password_reset_expires: this.passwordResetExpires,
        last_login_at: this.lastLoginAt,
        updated_at: new Date()
      })
      .returning('*');

    return new User({
      id: updatedUser.id,
      email: updatedUser.email,
      passwordHash: updatedUser.password_hash,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      role: updatedUser.role,
      emailVerified: updatedUser.email_verified,
      emailVerificationToken: updatedUser.email_verification_token,
      passwordResetToken: updatedUser.password_reset_token,
      passwordResetExpires: updatedUser.password_reset_expires,
      lastLoginAt: updatedUser.last_login_at,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at
    });
  }

  static async findByEmailVerificationToken(token: string): Promise<User | null> {
    const user = await db('users').where({ email_verification_token: token }).first();
    
    if (!user) return null;

    return new User({
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      emailVerified: user.email_verified,
      emailVerificationToken: user.email_verification_token,
      passwordResetToken: user.password_reset_token,
      passwordResetExpires: user.password_reset_expires,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });
  }

  static async findByPasswordResetToken(token: string): Promise<User | null> {
    const user = await db('users')
      .where({ password_reset_token: token })
      .where('password_reset_expires', '>', new Date())
      .first();
    
    if (!user) return null;

    return new User({
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      emailVerified: user.email_verified,
      emailVerificationToken: user.email_verification_token,
      passwordResetToken: user.password_reset_token,
      passwordResetExpires: user.password_reset_expires,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });
  }

  // Admin-specific methods
  static async findAllUsers(limit: number = 50, offset: number = 0): Promise<User[]> {
    const users = await db('users')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return users.map(user => new User({
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      emailVerified: user.email_verified,
      emailVerificationToken: user.email_verification_token,
      passwordResetToken: user.password_reset_token,
      passwordResetExpires: user.password_reset_expires,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));
  }

  static async getUserCount(): Promise<number> {
    const result = await db('users').count('id as count').first();
    return parseInt(result?.count as string) || 0;
  }

  static async getAdminCount(): Promise<number> {
    const result = await db('users').where({ role: 'admin' }).count('id as count').first();
    return parseInt(result?.count as string) || 0;
  }

  async updateLastLogin(): Promise<void> {
    this.lastLoginAt = new Date();
    await db('users')
      .where({ id: this.id })
      .update({ last_login_at: this.lastLoginAt });
  }
}