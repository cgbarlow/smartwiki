import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/config';
import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';
import rateLimit from 'express-rate-limit';

// Extend Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string;
        email: string;
        role: string;
        tenantId: string;
        permissions?: string[];
      };
      tenant?: {
        id: string;
        name: string;
        slug: string;
        settings: any;
      };
    }
  }
}

/**
 * Enhanced authentication middleware with multi-tenancy support
 * Verifies JWT token and attaches user and tenant information to request
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, config.auth.jwtSecret) as any;
    
    // Check if it's a refresh token (should not be used for API access)
    if (decoded.type === 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type',
      });
    }

    // Get user with full details including tenant and permissions
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    if (!user.tenant.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Tenant is inactive',
      });
    }

    // Extract permissions from role assignments
    const permissions: string[] = [];
    for (const roleAssignment of user.roleAssignments) {
      for (const rolePermission of roleAssignment.role.rolePermissions) {
        const permission = rolePermission.permission;
        permissions.push(`${permission.resource}:${permission.action}`);
      }
    }

    // Attach user and tenant information to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      permissions,
    };

    req.tenant = {
      id: user.tenant.id,
      name: user.tenant.name,
      slug: user.tenant.slug,
      settings: user.tenant.settings,
    };

    // Log IP address for security
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    await prisma.loginAttempt.updateMany({
      where: {
        userId: user.id,
        success: true,
        ipAddress: 'unknown',
      },
      data: { ipAddress },
    });

    next();
  } catch (error) {
    logger.error('❌ Authentication failed:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user information if token is present, but doesn't fail if missing
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.auth.jwtSecret) as any;
    
    // Skip refresh tokens
    if (decoded.type !== 'refresh') {
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    }

    next();
  } catch (error) {
    // Log error but don't fail the request
    logger.debug('Optional auth failed:', error);
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Admin users have all permissions
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const requiredPermission = `${resource}:${action}`;
    if (!req.user.permissions?.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Tenant isolation middleware
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.tenant) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  // Ensure all database queries are scoped to the user's tenant
  // This can be done by adding tenantId filter to all queries
  next();
};

/**
 * Admin role requirement
 */
export const requireAdmin = requireRole(['ADMIN']);

/**
 * Editor or Admin role requirement
 */
export const requireEditor = requireRole(['EDITOR', 'ADMIN']);

/**
 * Viewer, Editor, or Admin role requirement
 */
export const requireViewer = requireRole(['VIEWER', 'EDITOR', 'ADMIN']);

/**
 * Account lockout middleware
 */
export const checkAccountLockout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next();
    }

    // Check recent failed login attempts
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const failedAttempts = await prisma.loginAttempt.count({
      where: {
        email,
        success: false,
        createdAt: { gte: thirtyMinutesAgo },
      },
    });

    // Lock account after 5 failed attempts
    if (failedAttempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts',
        lockoutMinutes: 30,
      });
    }

    next();
  } catch (error) {
    logger.error('Account lockout check failed:', error);
    next(); // Continue on error
  }
};

/**
 * Rate limiting for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting for password reset
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * API Key authentication middleware
 */
export const apiKeyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers[config.security.apiKeyHeader] || req.query.apiKey;
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key is required',
      });
    }

    if (config.security.apiKey && apiKey !== config.security.apiKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key',
      });
    }

    next();
  } catch (error) {
    logger.error('❌ API key authentication failed:', error);
    return res.status(401).json({
      success: false,
      message: 'API key authentication failed',
    });
  }
};

/**
 * Combined authentication middleware (JWT or API Key)
 */
export const flexibleAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Try JWT first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authMiddleware(req, res, next);
  }

  // Try API key
  const apiKey = req.headers[config.security.apiKeyHeader] || req.query.apiKey;
  if (apiKey) {
    return apiKeyMiddleware(req, res, next);
  }

  // No authentication provided
  return res.status(401).json({
    success: false,
    message: 'Authentication required (JWT token or API key)',
  });
};