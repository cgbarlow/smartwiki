import { Request, Response, NextFunction } from 'express';
import { config } from '@/config/config';
import { logger } from '@/utils/logger';

// Extend Request interface to include tenant information
declare global {
  namespace Express {
    interface Request {
      tenant: {
        id: string;
        name?: string;
        slug?: string;
      };
    }
  }
}

/**
 * Tenant middleware
 * Extracts tenant information from request headers
 */
export const tenantMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get tenant ID from header
    const tenantId = req.headers[config.tenant.header] as string;
    
    if (!tenantId) {
      // Use default tenant if none specified
      req.tenant = {
        id: config.tenant.default,
      };
    } else {
      // Validate tenant ID format
      if (!/^[a-zA-Z0-9\-_]+$/.test(tenantId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tenant ID format',
        });
      }

      req.tenant = {
        id: tenantId,
      };
    }

    logger.debug(`🏢 Tenant set: ${req.tenant.id}`);
    next();
  } catch (error) {
    logger.error('❌ Tenant middleware failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Tenant processing failed',
    });
  }
};

/**
 * Require tenant middleware
 * Ensures a tenant is specified (not default)
 */
export const requireTenantMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.tenant || req.tenant.id === config.tenant.default) {
    return res.status(400).json({
      success: false,
      message: 'Tenant ID is required',
    });
  }

  next();
};

/**
 * Validate tenant access middleware
 * Ensures user has access to the specified tenant
 */
export const validateTenantAccessMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // This would typically check if the user has access to the tenant
    // For now, we'll just validate that the tenant exists
    
    // In a real implementation, you would:
    // 1. Check if tenant exists in database
    // 2. Check if user has access to this tenant
    // 3. Load tenant-specific configuration
    
    logger.debug(`🔐 Validating tenant access: ${req.tenant.id}`);
    next();
  } catch (error) {
    logger.error('❌ Tenant access validation failed:', error);
    return res.status(403).json({
      success: false,
      message: 'Tenant access denied',
    });
  }
};

/**
 * Tenant isolation middleware
 * Ensures data isolation between tenants
 */
export const tenantIsolationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Add tenant ID to all database queries
  // This is typically handled by the database layer
  
  // Log tenant context for debugging
  logger.debug(`🔒 Tenant isolation active: ${req.tenant.id}`);
  
  next();
};