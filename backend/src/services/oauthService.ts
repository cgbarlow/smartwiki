import { AuthenticationApi, ManagementApi } from 'auth0';
import { prisma } from '@/config/database';
import { config } from '@/config/config';
import { logger } from '@/utils/logger';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export interface OAuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: string;
  providerAccountId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export class OAuthService {
  private auth0Client: AuthenticationApi;
  private managementClient: ManagementApi;

  constructor() {
    if (!config.auth0.domain || !config.auth0.clientId || !config.auth0.clientSecret) {
      throw new Error('Auth0 configuration is required for OAuth service');
    }

    this.auth0Client = new AuthenticationApi({
      domain: config.auth0.domain,
      clientId: config.auth0.clientId,
      clientSecret: config.auth0.clientSecret,
    });

    this.managementClient = new ManagementApi({
      domain: config.auth0.domain,
      clientId: config.auth0.clientId,
      clientSecret: config.auth0.clientSecret,
    });
  }

  /**
   * Handle OAuth callback and create/update user
   */
  async handleOAuthCallback(
    oauthUser: OAuthUser,
    tenantId: string
  ): Promise<{ user: any; tokens: OAuthTokens; isNewUser: boolean }> {
    try {
      // Check if OAuth account exists
      let oauthAccount = await prisma.oAuthAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: oauthUser.provider,
            providerAccountId: oauthUser.providerAccountId,
          },
        },
        include: {
          user: true,
        },
      });

      let user;
      let isNewUser = false;

      if (oauthAccount) {
        // Update existing OAuth account
        user = oauthAccount.user;
        
        // Update OAuth tokens
        await prisma.oAuthAccount.update({
          where: { id: oauthAccount.id },
          data: {
            accessToken: oauthUser.accessToken,
            refreshToken: oauthUser.refreshToken,
            expiresAt: oauthUser.expiresAt,
          },
        });
      } else {
        // Check if user exists by email
        const existingUser = await prisma.user.findUnique({
          where: { email: oauthUser.email },
        });

        if (existingUser) {
          // Link OAuth account to existing user
          user = existingUser;
          await prisma.oAuthAccount.create({
            data: {
              userId: user.id,
              provider: oauthUser.provider,
              providerAccountId: oauthUser.providerAccountId,
              accessToken: oauthUser.accessToken,
              refreshToken: oauthUser.refreshToken,
              expiresAt: oauthUser.expiresAt,
            },
          });
        } else {
          // Create new user with OAuth account
          isNewUser = true;
          const username = this.generateUsername(oauthUser.email, oauthUser.name);
          
          user = await prisma.user.create({
            data: {
              email: oauthUser.email,
              username,
              firstName: this.extractFirstName(oauthUser.name),
              lastName: this.extractLastName(oauthUser.name),
              avatar: oauthUser.picture,
              isVerified: true,
              tenantId,
              oauthAccounts: {
                create: {
                  provider: oauthUser.provider,
                  providerAccountId: oauthUser.providerAccountId,
                  accessToken: oauthUser.accessToken,
                  refreshToken: oauthUser.refreshToken,
                  expiresAt: oauthUser.expiresAt,
                },
              },
            },
            include: {
              oauthAccounts: true,
            },
          });
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

      // Generate JWT tokens
      const tokens = this.generateTokens(user);

      logger.info(`OAuth user ${isNewUser ? 'created' : 'logged in'}: ${user.email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          role: user.role,
          tenantId: user.tenantId,
        },
        tokens,
        isNewUser,
      };
    } catch (error) {
      logger.error('OAuth callback error:', error);
      throw new Error('OAuth authentication failed');
    }
  }

  /**
   * Get Auth0 authorization URL
   */
  getAuthorizationUrl(
    provider: string,
    redirectUri: string,
    state: string,
    tenantId?: string
  ): string {
    const connection = this.getConnectionName(provider);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.auth0.clientId!,
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state,
      connection,
      ...(tenantId && { tenant: tenantId }),
    });

    return `https://${config.auth0.domain}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<OAuthUser> {
    try {
      const tokenResponse = await this.auth0Client.oauth.authorizationCodeGrant({
        code,
        redirect_uri: redirectUri,
      });

      const userInfo = await this.auth0Client.userinfo.getUserInfo(
        tokenResponse.data.access_token
      );

      return {
        id: userInfo.data.sub,
        email: userInfo.data.email!,
        name: userInfo.data.name,
        picture: userInfo.data.picture,
        provider: this.extractProvider(userInfo.data.sub),
        providerAccountId: userInfo.data.sub,
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token,
        expiresAt: tokenResponse.data.expires_in
          ? new Date(Date.now() + tokenResponse.data.expires_in * 1000)
          : undefined,
      };
    } catch (error) {
      logger.error('Token exchange error:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Revoke OAuth tokens
   */
  async revokeTokens(userId: string, provider: string): Promise<void> {
    try {
      const oauthAccount = await prisma.oAuthAccount.findFirst({
        where: {
          userId,
          provider,
        },
      });

      if (oauthAccount && oauthAccount.accessToken) {
        // Revoke tokens with Auth0
        await this.auth0Client.oauth.revokeRefreshToken({
          token: oauthAccount.refreshToken || oauthAccount.accessToken,
        });
      }

      // Remove OAuth account from database
      await prisma.oAuthAccount.deleteMany({
        where: {
          userId,
          provider,
        },
      });

      logger.info(`OAuth tokens revoked for user ${userId}, provider ${provider}`);
    } catch (error) {
      logger.error('Token revocation error:', error);
      throw new Error('Failed to revoke OAuth tokens');
    }
  }

  /**
   * Generate JWT tokens for authenticated user
   */
  private generateTokens(user: any): OAuthTokens {
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
   * Extract provider from Auth0 sub claim
   */
  private extractProvider(sub: string): string {
    const parts = sub.split('|');
    return parts[0] || 'auth0';
  }

  /**
   * Get connection name for provider
   */
  private getConnectionName(provider: string): string {
    const connections = {
      google: 'google-oauth2',
      github: 'github',
      microsoft: 'windowslive',
      facebook: 'facebook',
      twitter: 'twitter',
    };

    return connections[provider as keyof typeof connections] || provider;
  }

  /**
   * Generate unique username from email and name
   */
  private generateUsername(email: string, name?: string): string {
    const baseUsername = name
      ? name.toLowerCase().replace(/\s+/g, '')
      : email.split('@')[0];
    
    return `${baseUsername}_${uuidv4().slice(0, 8)}`;
  }

  /**
   * Extract first name from full name
   */
  private extractFirstName(name?: string): string | undefined {
    if (!name) return undefined;
    return name.split(' ')[0];
  }

  /**
   * Extract last name from full name
   */
  private extractLastName(name?: string): string | undefined {
    if (!name) return undefined;
    const parts = name.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : undefined;
  }
}

export const oauthService = new OAuthService();