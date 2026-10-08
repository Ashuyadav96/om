import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// Create rate limiter instances
const apiRateLimiter = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000, // 15 minutes in seconds
});

const agentRateLimiter = new RateLimiterMemory({
  points: 50, // 50 agent requests
  duration: 60, // 1 minute
});

// Rate limit by user ID or IP
export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.userId;
    const ip = req.ip || req.socket.remoteAddress;
    const endpoint = req.path;

    // Skip rate limiting for health check
    if (endpoint === '/health' || endpoint === '/api/health') {
      return next();
    }

    // Use user ID if authenticated, otherwise use IP
    const key = userId ? `user:${userId}` : `ip:${ip}`;

    // Check rate limit
    try {
      await apiRateLimiter.consume(key);
      return next();
    } catch (rateLimitError) {
      logger.warn(`Rate limit exceeded for ${key} at ${endpoint}`);
      
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil((rateLimitError as any).msBeforeNext / 1000) || 60,
        },
      });
    }
  } catch (error) {
    logger.error('Rate limiter error:', error);
    next();
  }
};

// Agent-specific rate limiter (more restrictive)
export const agentRateLimiterMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.userId;
    const ip = req.ip || req.socket.remoteAddress;
    const key = userId ? `agent:user:${userId}` : `agent:ip:${ip}`;

    try {
      await agentRateLimiter.consume(key);
      return next();
    } catch (rateLimitError) {
      logger.warn(`Agent rate limit exceeded for ${key}`);
      
      res.status(429).json({
        success: false,
        error: {
          code: 'AGENT_RATE_LIMIT_EXCEEDED',
          message: 'Too many AI agent requests, please try again in a minute',
          retryAfter: Math.ceil((rateLimitError as any).msBeforeNext / 1000) || 60,
        },
      });
    }
  } catch (error) {
    logger.error('Agent rate limiter error:', error);
    next();
  }
};

// Store rate limit in database for persistence across restarts
export async function storeRateLimitEvent(userId: string | null, ip: string, endpoint: string) {
  try {
    const key = userId ? `user:${userId}` : `ip:${ip}`;
    
    // Find or create rate limit record
    const rateLimit = await prisma.rateLimit.upsert({
      where: {
        userId_endpoint_windowStart: userId
          ? {
              userId,
              endpoint,
              windowStart: new Date(),
            }
          : {
              userId: null,
              ipAddress: ip,
              endpoint,
              windowStart: new Date(),
            },
      },
      create: {
        userId: userId || null,
        ipAddress: userId ? null : ip,
        endpoint,
        count: 1,
        windowStart: new Date(),
        expiresAt: new Date(Date.now() + parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000')),
      },
      update: {
        count: {
          increment: 1,
        },
        expiresAt: new Date(Date.now() + parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000')),
      },
    });

    return rateLimit;
  } catch (error) {
    logger.error('Failed to store rate limit event:', error);
    return null;
  }
}
