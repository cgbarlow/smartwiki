import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/config/database';
import { config } from '@/config/config';
import { logger } from '@/utils/logger';
import { 
  authMiddleware, 
  authRateLimit, 
  passwordResetRateLimit,
  checkAccountLockout 
} from '@/middleware/auth';
import { authService } from '@/services/authService';
import { invitationService } from '@/services/invitationService';

const router = Router();

/**
 * User registration
 */
router.post('/register', authRateLimit, [
  body('email').isEmail().normalizeEmail(),
  body('username').optional().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('firstName').optional().isLength({ min: 1, max: 50 }),
  body('lastName').optional().isLength({ min: 1, max: 50 }),
  body('tenantId').isUUID().withMessage('Valid tenant ID is required'),
], async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, username, password, firstName, lastName, tenantId } = req.body;

    // Use enhanced auth service
    const result = await authService.registerUser({
      email,
      username,
      password,
      firstName,
      lastName,
      tenantId,
    });

    logger.info(`👤 User registered: ${result.user.email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });

  } catch (error) {
    logger.error('❌ Registration failed:', error);
    
    const message = error instanceof Error ? error.message : 'Registration failed';
    const statusCode = message.includes('already exists') ? 409 : 
                      message.includes('limit exceeded') ? 429 : 
                      message.includes('Invalid') ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      message,
      error: statusCode === 500 ? 'Internal server error' : undefined,
    });
  }
});

/**
 * User login
 */
router.post('/login', authRateLimit, checkAccountLockout, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
  body('mfaCode').optional().isLength({ min: 6, max: 6 }).isNumeric(),
  body('tenantId').optional().isUUID(),
], async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password, mfaCode, tenantId } = req.body;

    // Use enhanced auth service
    const result = await authService.login({
      email,
      password,
      mfaCode,
      tenantId,
    });

    if (result.requiresMFA) {
      return res.status(200).json({
        success: true,
        message: 'MFA code required',
        requiresMFA: true,
        data: {
          user: result.user,
        },
      });
    }

    logger.info(`🔐 User logged in: ${result.user.email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });

  } catch (error) {
    logger.error('❌ Login failed:', error);
    
    const message = error instanceof Error ? error.message : 'Login failed';
    const statusCode = message.includes('Invalid credentials') ? 401 :
                      message.includes('deactivated') ? 401 :
                      message.includes('locked') ? 429 : 500;

    res.status(statusCode).json({
      success: false,
      message,
      error: statusCode === 500 ? 'Internal server error' : undefined,
    });
  }
});

/**
 * Refresh token
 */
router.post('/refresh', [
  body('refreshToken').isLength({ min: 1 }),
], async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.auth.jwtSecret) as any;
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    // Generate new tokens
    const newToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiresIn }
    );

    const newRefreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtRefreshExpiresIn }
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });

  } catch (error) {
    logger.error('❌ Token refresh failed:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
    });
  }
});

/**
 * Get current user profile
 */
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        preferences: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: { user },
    });

  } catch (error) {
    logger.error('❌ Profile fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: 'Internal server error',
    });
  }
});

/**
 * Update user profile
 */
router.put('/profile', authMiddleware, [
  body('firstName').optional().isLength({ min: 1, max: 50 }),
  body('lastName').optional().isLength({ min: 1, max: 50 }),
  body('username').optional().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { firstName, lastName, username } = req.body;

    // Check if username is already taken (if updating username)
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: req.user.userId },
        },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Username already taken',
        });
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(username && { username }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });

  } catch (error) {
    logger.error('❌ Profile update failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: 'Internal server error',
    });
  }
});

/**
 * Logout (client-side token invalidation)
 */
router.post('/logout', authMiddleware, (req: Request, res: Response) => {
  // In a real implementation, you might want to blacklist the token
  // For now, we'll just return a success message
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * Setup MFA
 */
router.post('/mfa/setup', authMiddleware, async (req: Request, res: Response) => {
  try {
    const mfaSetup = await authService.setupMFA(req.user.userId);

    res.json({
      success: true,
      message: 'MFA setup initiated',
      data: mfaSetup,
    });

  } catch (error) {
    logger.error('❌ MFA setup failed:', error);
    res.status(500).json({
      success: false,
      message: 'MFA setup failed',
      error: 'Internal server error',
    });
  }
});

/**
 * Enable MFA
 */
router.post('/mfa/enable', authMiddleware, [
  body('verificationCode').isLength({ min: 6, max: 6 }).isNumeric(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { verificationCode } = req.body;

    await authService.enableMFA(req.user.userId, verificationCode);

    res.json({
      success: true,
      message: 'MFA enabled successfully',
    });

  } catch (error) {
    logger.error('❌ MFA enable failed:', error);
    const message = error instanceof Error ? error.message : 'MFA enable failed';
    res.status(400).json({
      success: false,
      message,
    });
  }
});

/**
 * Disable MFA
 */
router.post('/mfa/disable', authMiddleware, [
  body('password').isLength({ min: 1 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { password } = req.body;

    await authService.disableMFA(req.user.userId, password);

    res.json({
      success: true,
      message: 'MFA disabled successfully',
    });

  } catch (error) {
    logger.error('❌ MFA disable failed:', error);
    const message = error instanceof Error ? error.message : 'MFA disable failed';
    res.status(400).json({
      success: false,
      message,
    });
  }
});

/**
 * Send team invitation
 */
router.post('/invite', authMiddleware, [
  body('email').isEmail().normalizeEmail(),
  body('roleId').isUUID(),
  body('message').optional().isLength({ max: 500 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, roleId, message } = req.body;

    const result = await invitationService.inviteUser({
      email,
      tenantId: req.user.tenantId,
      roleId,
      invitedBy: req.user.userId,
      message,
    });

    res.json({
      success: true,
      message: 'Invitation sent successfully',
      data: result,
    });

  } catch (error) {
    logger.error('❌ Invitation failed:', error);
    const message = error instanceof Error ? error.message : 'Invitation failed';
    const statusCode = message.includes('already exists') ? 409 :
                      message.includes('limit exceeded') ? 429 :
                      message.includes('Invalid') ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      message,
      error: statusCode === 500 ? 'Internal server error' : undefined,
    });
  }
});

/**
 * Accept team invitation
 */
router.post('/accept-invitation', authRateLimit, [
  body('token').isUUID(),
  body('firstName').isLength({ min: 1, max: 50 }),
  body('lastName').isLength({ min: 1, max: 50 }),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('username').optional().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { token, firstName, lastName, password, username } = req.body;

    const result = await invitationService.acceptInvitation({
      token,
      firstName,
      lastName,
      password,
      username,
    });

    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: result,
    });

  } catch (error) {
    logger.error('❌ Invitation acceptance failed:', error);
    const message = error instanceof Error ? error.message : 'Invitation acceptance failed';
    const statusCode = message.includes('Invalid') ? 400 :
                      message.includes('expired') ? 410 :
                      message.includes('already exists') ? 409 : 500;

    res.status(statusCode).json({
      success: false,
      message,
      error: statusCode === 500 ? 'Internal server error' : undefined,
    });
  }
});

/**
 * Reject team invitation
 */
router.post('/reject-invitation', [
  body('token').isUUID(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { token } = req.body;

    await invitationService.rejectInvitation(token);

    res.json({
      success: true,
      message: 'Invitation rejected successfully',
    });

  } catch (error) {
    logger.error('❌ Invitation rejection failed:', error);
    const message = error instanceof Error ? error.message : 'Invitation rejection failed';
    res.status(400).json({
      success: false,
      message,
    });
  }
});

/**
 * Get tenant invitations
 */
router.get('/invitations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const invitations = await invitationService.getTenantInvitations(
      req.user.tenantId,
      status as string
    );

    res.json({
      success: true,
      data: { invitations },
    });

  } catch (error) {
    logger.error('❌ Failed to get invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invitations',
      error: 'Internal server error',
    });
  }
});

export default router;