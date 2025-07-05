import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { config } from '@/config/config';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { BedrockServiceError } from '@/services/bedrockService';
import { DatabaseError } from '@/config/database';

// Custom error types
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, true, 'CONFLICT_ERROR', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, true, 'RATE_LIMIT_ERROR');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, true, 'SERVICE_UNAVAILABLE_ERROR');
  }
}

// Error response interface
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
    requestId?: string;
    timestamp: string;
  };
}

// Main error handler middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate request ID if not present
  const requestId = req.headers['x-request-id'] as string || 
    Math.random().toString(36).substring(2, 15);

  // Log the error with context
  const errorContext = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    tenantId: (req as any).tenantId,
    userId: (req as any).user?.id,
  };

  let appError: AppError;

  // Convert different error types to AppError
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof z.ZodError) {
    appError = new ValidationError(
      'Validation failed',
      {
        issues: error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      }
    );
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = handlePrismaError(error);
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    appError = new ValidationError('Database validation error');
  } else if (error instanceof BedrockServiceError) {
    appError = new AppError(
      error.message,
      500,
      true,
      error.code,
      { originalError: error.cause }
    );
  } else if (error instanceof DatabaseError) {
    appError = new AppError(
      error.message,
      500,
      true,
      error.code,
      { originalError: error.cause }
    );
  } else if (error.name === 'ValidationError') {
    appError = new ValidationError(error.message);
  } else if (error.name === 'CastError') {
    appError = new ValidationError('Invalid data format');
  } else if (error.name === 'JsonWebTokenError') {
    appError = new AuthenticationError('Invalid token');
  } else if (error.name === 'TokenExpiredError') {
    appError = new AuthenticationError('Token expired');
  } else {
    // Unknown error - don't expose internal details
    appError = new AppError(
      config.isProduction ? 'Internal server error' : error.message,
      500,
      false,
      'INTERNAL_ERROR'
    );
  }

  // Log based on error severity
  if (appError.statusCode >= 500) {
    logger.error('Server error occurred', {
      ...errorContext,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        statusCode: appError.statusCode,
        code: appError.code,
        isOperational: appError.isOperational,
      },
    });
  } else if (appError.statusCode >= 400) {
    logger.warn('Client error occurred', {
      ...errorContext,
      error: {
        name: error.name,
        message: error.message,
        statusCode: appError.statusCode,
        code: appError.code,
      },
    });
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    error: {
      code: appError.code || 'UNKNOWN_ERROR',
      message: appError.message,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  // Add details for validation errors
  if (appError.details) {
    errorResponse.error.details = appError.details;
  }

  // Add stack trace in development
  if (!config.isProduction && appError.statusCode >= 500) {
    errorResponse.error.stack = error.stack;
  }

  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  });

  res.status(appError.statusCode).json(errorResponse);
};

// Handle Prisma errors
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002':
      return new ConflictError(
        'A record with this information already exists',
        {
          fields: error.meta?.target,
          constraint: 'unique_constraint',
        }
      );
    case 'P2025':
      return new NotFoundError('Record');
    case 'P2003':
      return new ValidationError(
        'Foreign key constraint failed',
        {
          field: error.meta?.field_name,
          constraint: 'foreign_key_constraint',
        }
      );
    case 'P2021':
      return new AppError(
        'The table does not exist in the current database',
        500,
        true,
        'DATABASE_TABLE_NOT_FOUND'
      );
    case 'P2022':
      return new AppError(
        'The column does not exist in the current database',
        500,
        true,
        'DATABASE_COLUMN_NOT_FOUND'
      );
    default:
      return new AppError(
        'Database operation failed',
        500,
        true,
        'DATABASE_ERROR',
        { prismaCode: error.code }
      );
  }
}

// 404 handler for unmatched routes
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

// Async error wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Graceful error handling for unhandled rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  logger.error('Unhandled Rejection', {
    reason,
    promise,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  
  // In production, exit gracefully
  if (config.isProduction) {
    process.exit(1);
  }
});

// Graceful error handling for uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });
  
  // Exit immediately for uncaught exceptions
  process.exit(1);
});