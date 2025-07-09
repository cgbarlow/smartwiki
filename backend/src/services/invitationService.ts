import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import { config } from '@/config/config';

export interface InviteUserData {
  email: string;
  tenantId: string;
  roleId: string;
  invitedBy: string;
  message?: string;
}

export interface AcceptInvitationData {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
  username?: string;
}

export class InvitationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send team invitation
   */
  async inviteUser(inviteData: InviteUserData): Promise<{ invitation: any }> {
    try {
      // Validate tenant exists and is active
      const tenant = await prisma.tenant.findFirst({
        where: {
          id: inviteData.tenantId,
          isActive: true,
        },
      });

      if (!tenant) {
        throw new Error('Invalid or inactive tenant');
      }

      // Validate role exists
      const role = await prisma.role.findUnique({
        where: { id: inviteData.roleId },
      });

      if (!role) {
        throw new Error('Invalid role');
      }

      // Check if user is already in tenant
      const existingUser = await prisma.user.findFirst({
        where: {
          email: inviteData.email,
          tenantId: inviteData.tenantId,
        },
      });

      if (existingUser) {
        throw new Error('User already exists in this tenant');
      }

      // Check for existing pending invitation
      const existingInvitation = await prisma.teamInvitation.findFirst({
        where: {
          email: inviteData.email,
          tenantId: inviteData.tenantId,
          status: 'PENDING',
        },
      });

      if (existingInvitation) {
        throw new Error('Invitation already sent to this email');
      }

      // Check tenant user limits
      const userCount = await prisma.user.count({
        where: { tenantId: inviteData.tenantId },
      });

      if (userCount >= tenant.maxUsers) {
        throw new Error('Tenant user limit exceeded');
      }

      // Generate invitation token
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invitation
      const invitation = await prisma.teamInvitation.create({
        data: {
          email: inviteData.email,
          tenantId: inviteData.tenantId,
          invitedBy: inviteData.invitedBy,
          roleId: inviteData.roleId,
          token,
          expiresAt,
        },
        include: {
          tenant: true,
          inviter: true,
          role: true,
        },
      });

      // Send invitation email
      await this.sendInvitationEmail(invitation, inviteData.message);

      logger.info(`Invitation sent to ${inviteData.email} for tenant ${tenant.name}`);

      return { invitation };
    } catch (error) {
      logger.error('Invitation failed:', error);
      throw error;
    }
  }

  /**
   * Accept team invitation
   */
  async acceptInvitation(acceptData: AcceptInvitationData): Promise<{ user: any; tokens: any }> {
    try {
      // Find and validate invitation
      const invitation = await prisma.teamInvitation.findUnique({
        where: { token: acceptData.token },
        include: {
          tenant: true,
          role: true,
        },
      });

      if (!invitation) {
        throw new Error('Invalid invitation token');
      }

      if (invitation.status !== 'PENDING') {
        throw new Error('Invitation has already been processed');
      }

      if (invitation.expiresAt < new Date()) {
        throw new Error('Invitation has expired');
      }

      if (!invitation.tenant.isActive) {
        throw new Error('Tenant is inactive');
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: invitation.email },
      });

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Check username uniqueness if provided
      if (acceptData.username) {
        const existingUsername = await prisma.user.findUnique({
          where: { username: acceptData.username },
        });

        if (existingUsername) {
          throw new Error('Username already taken');
        }
      }

      // Hash password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(acceptData.password, 12);

      // Generate username if not provided
      const username = acceptData.username || this.generateUsername(invitation.email);

      // Create user and update invitation in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: invitation.email,
            username,
            password: hashedPassword,
            firstName: acceptData.firstName,
            lastName: acceptData.lastName,
            tenantId: invitation.tenantId,
            isVerified: true,
            role: invitation.role.name as any, // Set default role from invitation
          },
          include: {
            tenant: true,
          },
        });

        // Assign role to user
        await tx.userRoleAssignment.create({
          data: {
            userId: user.id,
            roleId: invitation.roleId,
            grantedBy: invitation.invitedBy,
          },
        });

        // Update invitation status
        await tx.teamInvitation.update({
          where: { id: invitation.id },
          data: { status: 'ACCEPTED' },
        });

        return user;
      });

      // Generate tokens
      const authService = await import('./authService');
      const tokens = (authService.authService as any).generateTokens(result);

      logger.info(`Invitation accepted: ${invitation.email} joined tenant ${invitation.tenant.name}`);

      return {
        user: this.sanitizeUser(result),
        tokens,
      };
    } catch (error) {
      logger.error('Invitation acceptance failed:', error);
      throw error;
    }
  }

  /**
   * Reject team invitation
   */
  async rejectInvitation(token: string): Promise<void> {
    try {
      const invitation = await prisma.teamInvitation.findUnique({
        where: { token },
      });

      if (!invitation) {
        throw new Error('Invalid invitation token');
      }

      if (invitation.status !== 'PENDING') {
        throw new Error('Invitation has already been processed');
      }

      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: 'REJECTED' },
      });

      logger.info(`Invitation rejected: ${invitation.email}`);
    } catch (error) {
      logger.error('Invitation rejection failed:', error);
      throw error;
    }
  }

  /**
   * Cancel pending invitation
   */
  async cancelInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      const invitation = await prisma.teamInvitation.findUnique({
        where: { id: invitationId },
        include: { tenant: true },
      });

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Check if user has permission to cancel invitation
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || (user.tenantId !== invitation.tenantId && user.role !== 'ADMIN')) {
        throw new Error('Insufficient permissions');
      }

      if (invitation.status !== 'PENDING') {
        throw new Error('Can only cancel pending invitations');
      }

      await prisma.teamInvitation.delete({
        where: { id: invitationId },
      });

      logger.info(`Invitation cancelled: ${invitation.email}`);
    } catch (error) {
      logger.error('Invitation cancellation failed:', error);
      throw error;
    }
  }

  /**
   * Get tenant invitations
   */
  async getTenantInvitations(tenantId: string, status?: string): Promise<any[]> {
    try {
      const where: any = { tenantId };
      if (status) {
        where.status = status;
      }

      const invitations = await prisma.teamInvitation.findMany({
        where,
        include: {
          inviter: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          role: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return invitations;
    } catch (error) {
      logger.error('Failed to get tenant invitations:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const result = await prisma.teamInvitation.updateMany({
        where: {
          status: 'PENDING',
          expiresAt: { lt: new Date() },
        },
        data: { status: 'EXPIRED' },
      });

      logger.info(`Cleaned up ${result.count} expired invitations`);
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup expired invitations:', error);
      throw error;
    }
  }

  /**
   * Send invitation email
   */
  private async sendInvitationEmail(invitation: any, customMessage?: string): Promise<void> {
    try {
      const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/accept-invitation?token=${invitation.token}`;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You're invited to join ${invitation.tenant.name} on SmartWiki</h2>
          
          <p>Hi there!</p>
          
          <p>${invitation.inviter.firstName} ${invitation.inviter.lastName} has invited you to join <strong>${invitation.tenant.name}</strong> as a <strong>${invitation.role.name}</strong>.</p>
          
          ${customMessage ? `<p><em>${customMessage}</em></p>` : ''}
          
          <p>To accept this invitation and create your account, click the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${inviteUrl}</p>
          
          <p style="color: #666; font-size: 14px;">This invitation will expire on ${invitation.expiresAt.toLocaleDateString()}.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #999; font-size: 12px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `;

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@smartwiki.com',
        to: invitation.email,
        subject: `You're invited to join ${invitation.tenant.name} on SmartWiki`,
        html: htmlContent,
      });

      logger.info(`Invitation email sent to ${invitation.email}`);
    } catch (error) {
      logger.error('Failed to send invitation email:', error);
      // Don't throw error here - invitation is created even if email fails
    }
  }

  /**
   * Generate unique username from email
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
}

export const invitationService = new InvitationService();