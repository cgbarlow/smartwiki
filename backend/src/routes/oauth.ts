import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { oauthService } from '@/services/oauthService';
import { authService } from '@/services/authService';
import { invitationService } from '@/services/invitationService';
import { logger } from '@/utils/logger';
import { authRateLimit } from '@/middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Initiate OAuth flow
 */
router.get('/authorize/:provider', authRateLimit, [
  query('redirect_uri').isURL().withMessage('Valid redirect URI is required'),
  query('tenant_id').optional().isUUID().withMessage('Invalid tenant ID'),
  query('state').optional().isLength({ min: 1, max: 500 }),
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

    const { provider } = req.params;
    const { redirect_uri, tenant_id, state } = req.query;

    // Validate provider
    const supportedProviders = ['google', 'github', 'microsoft', 'facebook'];
    if (!supportedProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported OAuth provider',
      });
    }

    // Generate state if not provided
    const authState = (state as string) || uuidv4();

    // Store state and redirect info in session/cache
    // In production, store this in Redis or database
    const stateData = {
      provider,
      redirectUri: redirect_uri as string,
      tenantId: tenant_id as string,
      timestamp: Date.now(),
    };

    // Get authorization URL from Auth0
    const authorizationUrl = oauthService.getAuthorizationUrl(
      provider,
      redirect_uri as string,
      authState,
      tenant_id as string
    );

    res.json({
      success: true,
      data: {
        authorizationUrl,
        state: authState,
        provider,
      },
    });

  } catch (error) {
    logger.error('OAuth authorization failed:', error);
    res.status(500).json({
      success: false,
      message: 'OAuth authorization failed',
      error: 'Internal server error',
    });
  }
});

/**
 * Handle OAuth callback
 */
router.post('/callback', authRateLimit, [
  body('code').isLength({ min: 1 }).withMessage('Authorization code is required'),
  body('state').isLength({ min: 1 }).withMessage('State parameter is required'),
  body('redirect_uri').isURL().withMessage('Valid redirect URI is required'),
  body('tenant_id').optional().isUUID().withMessage('Invalid tenant ID'),
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

    const { code, state, redirect_uri, tenant_id } = req.body;

    // Validate state parameter (in production, retrieve from Redis/cache)
    // For now, we'll just validate it exists

    // Exchange authorization code for tokens
    const oauthUser = await oauthService.exchangeCodeForTokens(
      code,
      redirect_uri
    );

    // Determine tenant ID
    let tenantId = tenant_id;
    if (!tenantId) {
      // Use default tenant or create one
      tenantId = 'default'; // In production, handle this better
    }

    // Handle OAuth user (create or login)
    const result = await oauthService.handleOAuthCallback(oauthUser, tenantId);

    logger.info(`OAuth callback successful for ${oauthUser.email}`);

    res.json({
      success: true,
      message: result.isNewUser ? 'User created successfully' : 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens,
        isNewUser: result.isNewUser,
      },
    });

  } catch (error) {
    logger.error('OAuth callback failed:', error);
    res.status(500).json({
      success: false,
      message: 'OAuth authentication failed',
      error: 'Internal server error',
    });
  }
});

/**
 * Link OAuth account to existing user
 */
router.post('/link', [
  body('provider').isIn(['google', 'github', 'microsoft', 'facebook']),
  body('code').isLength({ min: 1 }).withMessage('Authorization code is required'),
  body('redirect_uri').isURL().withMessage('Valid redirect URI is required'),
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

    const { provider, code, redirect_uri } = req.body;

    // This would require authentication middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Exchange code for OAuth user info
    const oauthUser = await oauthService.exchangeCodeForTokens(
      code,
      redirect_uri
    );

    // Check if OAuth account is already linked to another user
    const existingOAuthAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: oauthUser.provider,
          providerAccountId: oauthUser.providerAccountId,
        },
      },
    });

    if (existingOAuthAccount) {
      return res.status(409).json({
        success: false,
        message: 'OAuth account is already linked to another user',
      });
    }

    // Link OAuth account to current user
    await prisma.oAuthAccount.create({
      data: {
        userId: req.user.userId,
        provider: oauthUser.provider,
        providerAccountId: oauthUser.providerAccountId,
        accessToken: oauthUser.accessToken,
        refreshToken: oauthUser.refreshToken,
        expiresAt: oauthUser.expiresAt,
      },
    });

    logger.info(`OAuth account linked: ${provider} for user ${req.user.email}`);

    res.json({
      success: true,
      message: 'OAuth account linked successfully',
      data: {
        provider,
        email: oauthUser.email,
      },
    });

  } catch (error) {
    logger.error('OAuth account linking failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link OAuth account',
      error: 'Internal server error',
    });
  }
});

/**
 * Unlink OAuth account
 */
router.delete('/unlink/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Validate provider
    const supportedProviders = ['google', 'github', 'microsoft', 'facebook'];
    if (!supportedProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported OAuth provider',
      });
    }

    // Check if user has password authentication (don't allow unlinking if it's the only auth method)
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        oauthAccounts: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.password && user.oauthAccounts.length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot unlink the only authentication method. Please set a password first.',
      });
    }

    // Revoke tokens and remove OAuth account
    await oauthService.revokeTokens(req.user.userId, provider);

    logger.info(`OAuth account unlinked: ${provider} for user ${req.user.email}`);

    res.json({
      success: true,
      message: 'OAuth account unlinked successfully',
    });

  } catch (error) {
    logger.error('OAuth account unlinking failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlink OAuth account',
      error: 'Internal server error',
    });
  }
});

/**
 * Get user's linked OAuth accounts
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const oauthAccounts = await prisma.oAuthAccount.findMany({
      where: { userId: req.user.userId },
      select: {
        id: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: { oauthAccounts },
    });

  } catch (error) {
    logger.error('Failed to get OAuth accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get OAuth accounts',
      error: 'Internal server error',
    });
  }
});

export default router;