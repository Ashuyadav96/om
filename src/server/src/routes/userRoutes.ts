import express from 'express';
import { Router } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { clerkAuth, attachUser } from '../middleware/authMiddleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  fullName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

const createApiKeySchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'huggingface', 'github', 'other']),
  keyName: z.string().min(1).max(50),
  keyValue: z.string().min(1),
});

const updateApiKeySchema = z.object({
  keyName: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});

// GET /users/me - Get current user
router.get(
  '/me',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;

    // Get user with additional info
    const userWithInfo = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        sessions: {
          where: { creatorId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        userSessions: {
          where: { isActive: true },
          include: {
            session: {
              select: {
                id: true,
                name: true,
                currentAgent: true,
                updatedAt: true,
              },
            },
          },
          orderBy: { joinedAt: 'desc' },
          take: 5,
        },
        apiKeys: {
          select: {
            id: true,
            provider: true,
            keyName: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: userWithInfo,
    });
  })
);

// PUT /users/me - Update current user
router.put(
  '/me',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;
    const body = updateUserSchema.parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        username: body.username,
        fullName: body.fullName,
        avatarUrl: body.avatarUrl,
        updatedAt: new Date(),
      },
    });

    logger.info(`👤 User ${user.id} updated their profile`);

    res.json({
      success: true,
      data: updatedUser,
    });
  })
);

// GET /users/me/sessions - Get all sessions for current user
router.get(
  '/me/sessions',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;

    const sessions = await prisma.userSession.findMany({
      where: { userId: user.id },
      include: {
        session: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatarUrl: true,
              },
            },
            userSessions: {
              where: { isActive: true },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    fullName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    res.json({
      success: true,
      data: sessions.map((us) => us.session),
    });
  })
);

// POST /users/me/api-keys - Create a new API key
router.post(
  '/me/api-keys',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;
    const body = createApiKeySchema.parse(req.body);

    // Check if key with same name and provider already exists
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        userId: user.id,
        provider: body.provider,
        keyName: body.keyName,
      },
    });

    if (existingKey) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'API key with this name and provider already exists',
        },
      });
    }

    // In production, you would encrypt the keyValue before storing
    // For now, we'll store it as-is (but this is not secure!)
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        provider: body.provider,
        keyName: body.keyName,
        keyValue: body.keyValue, // TODO: Encrypt this
        isActive: true,
      },
    });

    // Return without the actual key value
    const { keyValue, ...apiKeyWithoutValue } = apiKey;

    logger.info(`🔑 User ${user.id} added new API key for ${body.provider}`);

    res.status(201).json({
      success: true,
      data: apiKeyWithoutValue,
    });
  })
);

// GET /users/me/api-keys - List all API keys for current user
router.get(
  '/me/api-keys',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        provider: true,
        keyName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: apiKeys,
    });
  })
);

// GET /users/me/api-keys/:id - Get a specific API key
router.get(
  '/me/api-keys/:id',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;
    const apiKeyId = req.params.id;

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId: user.id,
      },
      select: {
        id: true,
        provider: true,
        keyName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'API key not found',
        },
      });
    }

    res.json({
      success: true,
      data: apiKey,
    });
  })
);

// PUT /users/me/api-keys/:id - Update an API key
router.put(
  '/me/api-keys/:id',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;
    const apiKeyId = req.params.id;
    const body = updateApiKeySchema.parse(req.body);

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId: user.id,
      },
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'API key not found',
        },
      });
    }

    const updatedApiKey = await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        keyName: body.keyName,
        isActive: body.isActive,
        updatedAt: new Date(),
      },
    });

    // Return without the actual key value
    const { keyValue, ...apiKeyWithoutValue } = updatedApiKey;

    logger.info(`🔑 User ${user.id} updated API key ${apiKeyId}`);

    res.json({
      success: true,
      data: apiKeyWithoutValue,
    });
  })
);

// DELETE /users/me/api-keys/:id - Delete an API key
router.delete(
  '/me/api-keys/:id',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;
    const apiKeyId = req.params.id;

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId: user.id,
      },
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'API key not found',
        },
      });
    }

    await prisma.apiKey.delete({
      where: { id: apiKeyId },
    });

    logger.info(`🗑️ User ${user.id} deleted API key ${apiKeyId}`);

    res.json({
      success: true,
      message: 'API key deleted successfully',
    });
  })
);

// GET /users/me/integrations - List all integrations for current user
router.get(
  '/me/integrations',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;

    const integrations = await prisma.integration.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        provider: true,
        providerUserId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: integrations,
    });
  })
);

export default router;
