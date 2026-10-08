import { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// Clerk authentication middleware
export const clerkAuth = ClerkExpressRequireAuth({
  onError: (err, req, res) => {
    logger.error('Clerk authentication error:', err);
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  },
});

// Get authenticated user from request
export async function getAuthenticatedUser(req: Request) {
  try {
    const user = req.auth;
    
    if (!user || !user.userId) {
      return null;
    }

    // Check if user exists in our database
    let dbUser = await prisma.user.findUnique({
      where: { clerkId: user.userId },
    });

    // If not, create the user
    if (!dbUser && user.userId) {
      dbUser = await prisma.user.create({
        data: {
          clerkId: user.userId,
          email: user.emailAddresses?.[0]?.emailAddress,
          username: user.username,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
          avatarUrl: user.imageUrl,
        },
      });
      logger.info(`👤 Created new user: ${dbUser.id}`);
    }

    return dbUser;
  } catch (error) {
    logger.error('Failed to get authenticated user:', error);
    return null;
  }
}

// Middleware to attach user to request
export const attachUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }

    // Attach user to request
    (req as any).dbUser = user;
    next();
  } catch (error) {
    logger.error('Attach user middleware error:', error);
    next();
  }
};

// Middleware to check if user has access to a session
export const checkSessionAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).dbUser;
    const sessionId = req.params.sessionId || req.body.sessionId;

    if (!user || !sessionId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Check if user has access to the session
    const userSession = await prisma.userSession.findFirst({
      where: {
        userId: user.id,
        sessionId,
      },
    });

    if (!userSession) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access to session denied',
        },
      });
    }

    // Attach session access info to request
    (req as any).userSession = userSession;
    next();
  } catch (error) {
    logger.error('Check session access middleware error:', error);
    next();
  }
};

// Middleware to check API key access
export const checkApiKeyAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).dbUser;
    const provider = req.params.provider || req.body.provider;

    if (!user || !provider) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Check if user has an active API key for this provider
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        userId: user.id,
        provider,
        isActive: true,
      },
    });

    if (!apiKey) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'API_KEY_REQUIRED',
          message: `No active API key for ${provider}`,
        },
      });
    }

    // Attach API key to request (mask the actual key value)
    (req as any).apiKey = {
      ...apiKey,
      keyValue: '***', // Mask the actual key
    };

    next();
  } catch (error) {
    logger.error('Check API key access middleware error:', error);
    next();
  }
};
