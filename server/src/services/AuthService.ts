import { User, UserData, AuthTokens } from '../models/User';
import { JWTUtils } from '../utils/jwt';
import { CryptoUtils } from '../utils/crypto';
import { 
  ValidationError, 
  AuthenticationError, 
  ConflictError, 
  NotFoundError 
} from '../utils/errors';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

export class AuthService {
  static async register(data: RegisterData): Promise<AuthResult> {
    // Validate input
    const { error } = User.getValidationSchema().register.validate(data);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(data.email.toLowerCase());
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Generate email verification token
    const emailVerificationToken = CryptoUtils.generateSecureToken();

    // Create user
    const userData: UserData = {
      email: data.email.toLowerCase(),
      password: data.password,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      emailVerificationToken
    };

    const user = await User.create(userData);
    const tokens = user.generateTokens();

    // TODO: Send email verification email
    console.log(`Email verification token for ${user.email}: ${emailVerificationToken}`);

    return { user, tokens };
  }

  static async login(data: LoginData): Promise<AuthResult> {
    // Validate input
    const { error } = User.getValidationSchema().login.validate(data);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Find user by email
    const user = await User.findByEmail(data.email.toLowerCase());
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await user.verifyPassword(data.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login time
    await user.updateLastLogin();
    
    const tokens = user.generateTokens();
    return { user, tokens };
  }

  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new AuthenticationError('Refresh token is required');
    }

    let payload;
    try {
      payload = JWTUtils.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Find user
    const user = await User.findById(payload.id);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    return user.generateTokens();
  }

  static async verifyEmail(token: string): Promise<User> {
    if (!token) {
      throw new ValidationError('Verification token is required');
    }

    const user = await User.findByEmailVerificationToken(token);
    if (!user) {
      throw new NotFoundError('Invalid or expired verification token');
    }

    // Mark email as verified and clear the token
    user.emailVerified = true;
    user.emailVerificationToken = null;
    
    return await user.save();
  }

  static async requestPasswordReset(email: string): Promise<void> {
    // Validate email
    const { error } = User.getValidationSchema().resetPassword.validate({ email });
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      // Don't reveal if email exists or not for security
      return;
    }

    // Generate password reset token (expires in 1 hour)
    const resetToken = CryptoUtils.generateSecureToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    
    await user.save();

    // TODO: Send password reset email
    console.log(`Password reset token for ${user.email}: ${resetToken}`);
  }

  static async resetPassword(token: string, newPassword: string): Promise<User> {
    // Validate input
    const { error } = User.getValidationSchema().updatePassword.validate({ 
      token, 
      password: newPassword 
    });
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const user = await User.findByPasswordResetToken(token);
    if (!user) {
      throw new NotFoundError('Invalid or expired reset token');
    }

    // Update password and clear reset token
    user.passwordHash = await User.hashPassword(newPassword);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    
    return await user.save();
  }

  static async resendEmailVerification(email: string): Promise<void> {
    const user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      // Don't reveal if email exists or not for security
      return;
    }

    if (user.emailVerified) {
      throw new ValidationError('Email is already verified');
    }

    // Generate new verification token
    const emailVerificationToken = CryptoUtils.generateSecureToken();
    user.emailVerificationToken = emailVerificationToken;
    
    await user.save();

    // TODO: Send email verification email
    console.log(`New email verification token for ${user.email}: ${emailVerificationToken}`);
  }

  static async getCurrentUser(userId: string): Promise<User> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  // Admin-specific authentication methods
  static async adminLogin(data: LoginData): Promise<AuthResult> {
    // Validate input
    const { error } = User.getValidationSchema().login.validate(data);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Find user by email
    const user = await User.findByEmail(data.email.toLowerCase());
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if user is admin
    if (!user.isAdmin()) {
      throw new AuthenticationError('Admin access required');
    }

    // Verify password
    const isPasswordValid = await user.verifyPassword(data.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login time
    await user.updateLastLogin();
    
    const tokens = user.generateTokens();
    return { user, tokens };
  }

  static async createAdminUser(data: RegisterData): Promise<AuthResult> {
    // Validate input
    const { error } = User.getValidationSchema().register.validate(data);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(data.email.toLowerCase());
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create admin user
    const userData: UserData = {
      email: data.email.toLowerCase(),
      password: data.password,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      role: 'admin',
      emailVerified: true // Admin users are auto-verified
    };

    const user = await User.create(userData);
    const tokens = user.generateTokens();

    return { user, tokens };
  }
}