import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/database';
import { authService } from '../services/authService';
import { oauthService } from '../services/oauthService';
import { invitationService } from '../services/invitationService';

// Mock external services
vi.mock('../services/oauthService');
vi.mock('nodemailer');

describe('Authentication System', () => {
  let testTenant: any;
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    // Clean up database
    await prisma.loginAttempt.deleteMany();
    await prisma.sessionToken.deleteMany();
    await prisma.teamInvitation.deleteMany();
    await prisma.userRoleAssignment.deleteMany();
    await prisma.oAuthAccount.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.role.deleteMany();
    await prisma.permission.deleteMany();

    // Create test tenant
    testTenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        slug: 'test-tenant',
        isActive: true,
        maxUsers: 100,
      },
    });

    // Create test roles and permissions
    const viewerRole = await prisma.role.create({
      data: {
        name: 'VIEWER',
        description: 'Can view content',
        isSystem: true,
      },
    });

    const editorRole = await prisma.role.create({
      data: {
        name: 'EDITOR',
        description: 'Can edit content',
        isSystem: true,
      },
    });

    const adminRole = await prisma.role.create({
      data: {
        name: 'ADMIN',
        description: 'Can manage everything',
        isSystem: true,
      },
    });

    // Create test permissions
    const readPermission = await prisma.permission.create({
      data: {
        name: 'READ_ARTICLES',
        resource: 'articles',
        action: 'read',
      },
    });

    const writePermission = await prisma.permission.create({
      data: {
        name: 'WRITE_ARTICLES',
        resource: 'articles',
        action: 'write',
      },
    });

    // Assign permissions to roles
    await prisma.rolePermission.createMany({
      data: [
        { roleId: viewerRole.id, permissionId: readPermission.id },
        { roleId: editorRole.id, permissionId: readPermission.id },
        { roleId: editorRole.id, permissionId: writePermission.id },
        { roleId: adminRole.id, permissionId: readPermission.id },
        { roleId: adminRole.id, permissionId: writePermission.id },
      ],
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.loginAttempt.deleteMany();
    await prisma.sessionToken.deleteMany();
    await prisma.teamInvitation.deleteMany();
    await prisma.userRoleAssignment.deleteMany();
    await prisma.oAuthAccount.deleteMany();
    await prisma.user.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.role.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.tenant.deleteMany();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        tenantId: testTenant.id,
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123!',
        tenantId: testTenant.id,
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        tenantId: testTenant.id,
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject registration with invalid tenant', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        tenantId: '00000000-0000-0000-0000-000000000000',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should prevent duplicate email registration', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        tenantId: testTenant.id,
      };

      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Second registration with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Create test user
      const result = await authService.registerUser({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        tenantId: testTenant.id,
      });
      testUser = result.user;
      authToken = result.tokens.accessToken;
    });

    it('should login user with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should lock account after multiple failed attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send(loginData);
      }

      // 6th attempt should be locked
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).toBe(429);
      expect(response.body.message).toContain('locked');
    });
  });

  describe('Token Refresh', () => {
    beforeEach(async () => {
      const result = await authService.registerUser({
        email: 'test@example.com',
        password: 'Password123!',
        tenantId: testTenant.id,
      });
      testUser = result.user;
      authToken = result.tokens.accessToken;
    });

    it('should refresh token with valid refresh token', async () => {
      const result = await authService.registerUser({
        email: 'refresh@example.com',
        password: 'Password123!',
        tenantId: testTenant.id,
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: result.tokens.refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('MFA (Multi-Factor Authentication)', () => {
    beforeEach(async () => {
      const result = await authService.registerUser({
        email: 'test@example.com',
        password: 'Password123!',
        tenantId: testTenant.id,
      });
      testUser = result.user;
      authToken = result.tokens.accessToken;
    });

    it('should setup MFA for user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.secret).toBeDefined();
      expect(response.body.data.qrCodeUrl).toBeDefined();
      expect(response.body.data.backupCodes).toHaveLength(10);
    });

    it('should enable MFA with valid verification code', async () => {
      // Setup MFA first
      await request(app)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', `Bearer ${authToken}`);

      // Mock valid verification code
      vi.spyOn(authService, 'enableMFA').mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/auth/mfa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ verificationCode: '123456' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should disable MFA with valid password', async () => {
      // Enable MFA first
      await authService.setupMFA(testUser.id);
      await authService.enableMFA(testUser.id, '123456'); // Mock valid code

      const response = await request(app)
        .post('/api/v1/auth/mfa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: 'Password123!' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Team Invitations', () => {
    let adminUser: any;
    let adminToken: string;
    let viewerRole: any;

    beforeEach(async () => {
      // Create admin user
      const adminResult = await authService.registerUser({
        email: 'admin@example.com',
        password: 'Password123!',
        tenantId: testTenant.id,
      });
      adminUser = adminResult.user;
      adminToken = adminResult.tokens.accessToken;

      // Update user to admin role
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { role: 'ADMIN' },
      });

      // Get viewer role
      viewerRole = await prisma.role.findFirst({
        where: { name: 'VIEWER' },
      });
    });

    it('should send team invitation', async () => {
      const invitationData = {
        email: 'newuser@example.com',
        roleId: viewerRole.id,
        message: 'Welcome to our team!',
      };

      const response = await request(app)
        .post('/api/v1/auth/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invitationData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.invitation).toBeDefined();
    });

    it('should prevent duplicate invitations', async () => {
      const invitationData = {
        email: 'newuser@example.com',
        roleId: viewerRole.id,
      };

      // Send first invitation
      await request(app)
        .post('/api/v1/auth/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invitationData);

      // Send second invitation to same email
      const response = await request(app)
        .post('/api/v1/auth/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invitationData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should accept team invitation', async () => {
      // Create invitation
      const invitation = await invitationService.inviteUser({
        email: 'newuser@example.com',
        tenantId: testTenant.id,
        roleId: viewerRole.id,
        invitedBy: adminUser.id,
      });

      const acceptData = {
        token: invitation.invitation.token,
        firstName: 'New',
        lastName: 'User',
        password: 'Password123!',
        username: 'newuser',
      };

      const response = await request(app)
        .post('/api/v1/auth/accept-invitation')
        .send(acceptData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    it('should reject expired invitation', async () => {
      // Create expired invitation
      const expiredToken = 'expired-token-uuid';
      await prisma.teamInvitation.create({
        data: {
          email: 'expired@example.com',
          tenantId: testTenant.id,
          invitedBy: adminUser.id,
          roleId: viewerRole.id,
          token: expiredToken,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          status: 'PENDING',
        },
      });

      const acceptData = {
        token: expiredToken,
        firstName: 'New',
        lastName: 'User',
        password: 'Password123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/accept-invitation')
        .send(acceptData);

      expect(response.status).toBe(410);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });

    it('should get tenant invitations', async () => {
      // Create some invitations
      await invitationService.inviteUser({
        email: 'user1@example.com',
        tenantId: testTenant.id,
        roleId: viewerRole.id,
        invitedBy: adminUser.id,
      });

      await invitationService.inviteUser({
        email: 'user2@example.com',
        tenantId: testTenant.id,
        roleId: viewerRole.id,
        invitedBy: adminUser.id,
      });

      const response = await request(app)
        .get('/api/v1/auth/invitations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.invitations).toHaveLength(2);
    });
  });

  describe('Authorization Middleware', () => {
    beforeEach(async () => {
      const result = await authService.registerUser({
        email: 'test@example.com',
        password: 'Password123!',
        tenantId: testTenant.id,
      });
      testUser = result.user;
      authToken = result.tokens.accessToken;
    });

    it('should protect routes without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token is required');
    });

    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject expired token', async () => {
      // Mock expired token
      const expiredToken = 'expired.jwt.token';

      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('OAuth Integration', () => {
    beforeEach(() => {
      // Mock OAuth service methods
      vi.mocked(oauthService.exchangeCodeForTokens).mockResolvedValue({
        id: 'google|123456',
        email: 'oauth@example.com',
        name: 'OAuth User',
        picture: 'https://example.com/avatar.jpg',
        provider: 'google',
        providerAccountId: 'google|123456',
        accessToken: 'oauth-access-token',
        refreshToken: 'oauth-refresh-token',
      });

      vi.mocked(oauthService.handleOAuthCallback).mockResolvedValue({
        user: {
          id: 'user-id',
          email: 'oauth@example.com',
          username: 'oauthuser',
          firstName: 'OAuth',
          lastName: 'User',
          avatar: 'https://example.com/avatar.jpg',
          role: 'VIEWER',
          tenantId: testTenant.id,
        },
        tokens: {
          accessToken: 'jwt-access-token',
          refreshToken: 'jwt-refresh-token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        isNewUser: true,
      });
    });

    it('should handle OAuth callback successfully', async () => {
      const callbackData = {
        code: 'oauth-authorization-code',
        state: 'random-state',
        redirect_uri: 'http://localhost:3001/auth/callback',
        tenant_id: testTenant.id,
      };

      const response = await request(app)
        .post('/api/v1/oauth/callback')
        .send(callbackData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('oauth@example.com');
      expect(response.body.data.isNewUser).toBe(true);
    });

    it('should get authorization URL', async () => {
      vi.mocked(oauthService.getAuthorizationUrl).mockReturnValue(
        'https://accounts.google.com/oauth/authorize?...'
      );

      const response = await request(app)
        .get('/api/v1/oauth/authorize/google')
        .query({
          redirect_uri: 'http://localhost:3001/auth/callback',
          tenant_id: testTenant.id,
          state: 'random-state',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authorizationUrl).toContain('google.com');
    });

    it('should reject unsupported OAuth provider', async () => {
      const response = await request(app)
        .get('/api/v1/oauth/authorize/unsupported')
        .query({
          redirect_uri: 'http://localhost:3001/auth/callback',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unsupported');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      // Make requests up to the limit
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(requests);

      // All should succeed (rate limit allows 10 requests)
      responses.forEach(response => {
        expect(response.status).not.toBe(429);
      });

      // 11th request should be rate limited
      const rateLimitedResponse = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(rateLimitedResponse.status).toBe(429);
    });
  });
});