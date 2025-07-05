import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/config';
import { logger } from '@/utils/logger';

// Extend Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user information to request
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

    // Attach user information to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

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
 * Admin role requirement
 */
export const requireAdmin = requireRole(['ADMIN']);

/**
 * Moderator or Admin role requirement
 */
export const requireModerator = requireRole(['MODERATOR', 'ADMIN']);

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