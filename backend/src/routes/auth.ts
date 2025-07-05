import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/config/database';
import { config } from '@/config/config';
import { logger } from '@/utils/logger';
import { authMiddleware } from '@/middleware/auth';

const router = Router();

/**
 * User registration
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('firstName').optional().isLength({ min: 1, max: 50 }),
  body('lastName').optional().isLength({ min: 1, max: 50 }),
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

    const { email, username, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email or username',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiresIn }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtRefreshExpiresIn }
    );

    logger.info(`👤 User registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token,
        refreshToken,
      },
    });

  } catch (error) {
    logger.error('❌ Registration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: 'Internal server error',
    });
  }
});

/**
 * User login
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
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

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiresIn }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtRefreshExpiresIn }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    logger.info(`🔐 User logged in: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token,
        refreshToken,
      },
    });

  } catch (error) {
    logger.error('❌ Login failed:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: 'Internal server error',
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

export default router;