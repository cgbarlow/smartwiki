import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { prisma } from '@/config/database';
import { config } from '@/config/config';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface RegisterUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  tenantId: string;
}

export interface LoginData {
  email: string;
  password: string;
  mfaCode?: string;
  tenantId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface MFASetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export class AuthService {
  /**
   * Register new user with tenant assignment
   */
  async registerUser(userData: RegisterUserData): Promise<{ user: any; tokens: AuthTokens }> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Check username uniqueness if provided
      if (userData.username) {
        const existingUsername = await prisma.user.findUnique({
          where: { username: userData.username },
        });

        if (existingUsername) {
          throw new Error('Username already taken');
        }
      }

      // Validate tenant exists and is active
      const tenant = await prisma.tenant.findFirst({
        where: {
          id: userData.tenantId,
          isActive: true,
        },
      });

      if (!tenant) {
        throw new Error('Invalid or inactive tenant');
      }

      // Check tenant user limits
      const userCount = await prisma.user.count({
        where: { tenantId: userData.tenantId },
      });

      if (userCount >= tenant.maxUsers) {
        throw new Error('Tenant user limit exceeded');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Generate username if not provided
      const username = userData.username || this.generateUsername(userData.email);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          username,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          tenantId: userData.tenantId,
          isVerified: false,
        },
        include: {
          tenant: true,
        },
      });

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Log registration
      logger.info(`User registered: ${user.email} in tenant ${tenant.name}`);

      return {
        user: this.sanitizeUser(user),
        tokens,
      };
    } catch (error) {
      logger.error('User registration failed:', error);
      throw error;
    }
  }

  /**
   * Authenticate user with email/password
   */
  async login(loginData: LoginData): Promise<{ user: any; tokens: AuthTokens; requiresMFA: boolean }> {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: loginData.email },
        include: {
          tenant: true,
          roleAssignments: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        await this.logFailedLogin(loginData.email, 'User not found');
        throw new Error('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        await this.logFailedLogin(loginData.email, 'Account deactivated', user.id);
        throw new Error('Account is deactivated');
      }

      // Check tenant filter
      if (loginData.tenantId && user.tenantId !== loginData.tenantId) {
        await this.logFailedLogin(loginData.email, 'Invalid tenant', user.id);
        throw new Error('Invalid credentials');
      }

      // Check tenant is active
      if (!user.tenant.isActive) {
        await this.logFailedLogin(loginData.email, 'Tenant inactive', user.id);
        throw new Error('Tenant is inactive');
      }

      // Check password
      if (!user.password || !await bcrypt.compare(loginData.password, user.password)) {
        await this.logFailedLogin(loginData.email, 'Invalid password', user.id);
        throw new Error('Invalid credentials');
      }

      // Check MFA if enabled
      if (user.mfaEnabled) {
        if (!loginData.mfaCode) {
          return {
            user: this.sanitizeUser(user),
            tokens: { accessToken: '', refreshToken: '', expiresAt: new Date() },
            requiresMFA: true,
          };
        }

        if (!this.verifyMFACode(user.mfaSecret!, loginData.mfaCode)) {
          await this.logFailedLogin(loginData.email, 'Invalid MFA code', user.id);
          throw new Error('Invalid MFA code');
        }
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
        },
      });

      // Log successful login
      await this.logSuccessfulLogin(user.id, loginData.email);

      // Generate tokens
      const tokens = this.generateTokens(user);

      logger.info(`User logged in: ${user.email}`);

      return {
        user: this.sanitizeUser(user),
        tokens,
        requiresMFA: false,
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, config.auth.jwtSecret) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { tenant: true },
      });

      if (!user || !user.isActive || !user.tenant.isActive) {
        throw new Error('User not found or inactive');
      }

      return this.generateTokens(user);
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Setup MFA for user
   */
  async setupMFA(userId: string): Promise<MFASetup> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `SmartWiki (${user.email})`,
        issuer: 'SmartWiki',
      });

      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      // Store secret temporarily (user must verify before enabling)
      await prisma.user.update({
        where: { id: userId },
        data: { mfaSecret: secret.base32 },
      });

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
      };
    } catch (error) {
      logger.error('MFA setup failed:', error);
      throw error;
    }
  }

  /**
   * Enable MFA after verification
   */
  async enableMFA(userId: string, verificationCode: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.mfaSecret) {
        throw new Error('MFA setup not found');
      }

      if (!this.verifyMFACode(user.mfaSecret, verificationCode)) {
        throw new Error('Invalid verification code');
      }

      await prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true },
      });

      logger.info(`MFA enabled for user: ${user.email}`);
    } catch (error) {
      logger.error('MFA enablement failed:', error);
      throw error;
    }
  }

  /**
   * Disable MFA
   */
  async disableMFA(userId: string, password: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify password before disabling MFA
      if (!user.password || !await bcrypt.compare(password, user.password)) {
        throw new Error('Invalid password');
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
        },
      });

      logger.info(`MFA disabled for user: ${user.email}`);
    } catch (error) {
      logger.error('MFA disable failed:', error);
      throw error;
    }
  }

  /**
   * Check user permissions
   */
  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roleAssignments: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        return false;
      }

      // Admin users have all permissions
      if (user.role === 'ADMIN') {
        return true;
      }

      // Check role-based permissions
      for (const roleAssignment of user.roleAssignments) {
        for (const rolePermission of roleAssignment.role.rolePermissions) {
          const permission = rolePermission.permission;
          if (permission.resource === resource && permission.action === action) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(user: any): AuthTokens {
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh',
      },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtRefreshExpiresIn }
    );

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Verify MFA code
   */
  private verifyMFACode(secret: string, code: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });
  }

  /**
   * Generate unique username
   */
  private generateUsername(email: string): string {
    const baseUsername = email.split('@')[0];
    return `${baseUsername}_${uuidv4().slice(0, 8)}`;
  }

  /**
   * Sanitize user data for response
   */
  private sanitizeUser(user: any) {
    const { password, mfaSecret, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Log failed login attempt
   */
  private async logFailedLogin(email: string, reason: string, userId?: string): Promise<void> {
    try {
      await prisma.loginAttempt.create({
        data: {
          email,
          userId,
          ipAddress: 'unknown', // Will be populated by middleware
          success: false,
        },
      });
    } catch (error) {
      logger.error('Failed to log failed login:', error);
    }
  }

  /**
   * Log successful login
   */
  private async logSuccessfulLogin(userId: string, email: string): Promise<void> {
    try {
      await prisma.loginAttempt.create({
        data: {
          userId,
          email,
          ipAddress: 'unknown', // Will be populated by middleware
          success: true,
        },
      });
    } catch (error) {
      logger.error('Failed to log successful login:', error);
    }
  }
}

export const authService = new AuthService();