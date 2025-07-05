import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { logger } from '@/utils/logger';

/**
 * Generic validation middleware factory
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(error => ({
        field: error.type === 'field' ? (error as any).path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? (error as any).value : undefined,
      }));

      logger.warn('❌ Validation failed:', { errors: formattedErrors, path: req.path });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    next();
  };
};

/**
 * Custom validation middleware for common patterns
 */
export const validationMiddleware = {
  /**
   * Validate pagination parameters
   */
  pagination: (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    if (page < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be greater than 0',
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 100',
      });
    }

    // Add pagination info to request
    req.pagination = { page, limit, offset };
    next();
  },

  /**
   * Validate file upload parameters
   */
  fileUpload: (req: Request, res: Response, next: NextFunction) => {
    // This would be implemented based on your file upload requirements
    // For now, just a placeholder
    next();
  },

  /**
   * Validate search parameters
   */
  search: (req: Request, res: Response, next: NextFunction) => {
    const query = req.query.q as string;
    
    if (query && query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long',
      });
    }

    if (query && query.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be less than 1000 characters',
      });
    }

    next();
  },
};

// Extend Request interface for custom validation data
declare global {
  namespace Express {
    interface Request {
      pagination?: {
        page: number;
        limit: number;
        offset: number;
      };
    }
  }
}