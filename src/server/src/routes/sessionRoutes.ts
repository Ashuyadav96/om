import express from 'express';
import { Router } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { clerkAuth, attachUser, checkSessionAccess } from '../middleware/authMiddleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createSessionSchema = z.object({
  name: z.string().min(1).max(100),
  agentType: z.string().default('claude'),
  isPublic: z.boolean().default(false),
});

const updateSessionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currentAgent: z.string().optional(),
  status: z.enum(['active', 'ended', 'paused']).optional(),
  isPublic: z.boolean().optional(),
});

// GET /sessions - List all sessions for the authenticated user
router.get(
  '/',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;

    const sessions = await prisma.session.findMany({
      where: {
        OR: [
          { creatorId: user.id },
          { userSessions: { some: { userId: user.id } } },
        ],
      },
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
          select: {
            userId: true,
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
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      success: true,
      data: sessions,
    });
  })
);

// POST /sessions - Create a new session
router.post(
  '/',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;
    const body = createSessionSchema.parse(req.body);

    const session = await prisma.session.create({
      data: {
        name: body.name,
        creatorId: user.id,
        currentAgent: body.agentType,
        isPublic: body.isPublic,
      },
    });

    // Create user session for the creator
    await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionId: session.id,
        joinedAt: new Date(),
        isActive: true,
      },
    });

    // Create initial session state
    await prisma.sessionState.create({
      data: {
        sessionId: session.id,
        stateData: { messages: [], version: 0 },
        version: 0,
      },
    });

    logger.info(`🆕 User ${user.id} created session ${session.id}: ${body.name}`);

    res.status(201).json({
      success: true,
      data: session,
    });
  })
);

// GET /sessions/:sessionId - Get a specific session
router.get(
  '/:sessionId',
  clerkAuth,
  attachUser,
  checkSessionAccess,
  asyncHandler(async (req: any, res) => {
    const sessionId = req.params.sessionId;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
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
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50, // Limit to last 50 messages
        },
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Session not found',
        },
      });
    }

    res.json({
      success: true,
      data: session,
    });
  })
);

// PUT /sessions/:sessionId - Update a session
router.put(
  '/:sessionId',
  clerkAuth,
  attachUser,
  checkSessionAccess,
  asyncHandler(async (req: any, res) => {
    const sessionId = req.params.sessionId;
    const body = updateSessionSchema.parse(req.body);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Session not found',
        },
      });
    }

    // Only allow creator to update certain fields
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.currentAgent !== undefined) updateData.currentAgent = body.currentAgent;
    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;
    
    // Only creator can change status
    if (body.status !== undefined && req.dbUser.id === session.creatorId) {
      updateData.status = body.status;
      if (body.status === 'ended') {
        updateData.endedAt = new Date();
      }
    }

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: updateData,
    });

    logger.info(`🔄 User ${req.dbUser.id} updated session ${sessionId}`);

    res.json({
      success: true,
      data: updatedSession,
    });
  })
);

// DELETE /sessions/:sessionId - Delete a session
router.delete(
  '/:sessionId',
  clerkAuth,
  attachUser,
  checkSessionAccess,
  asyncHandler(async (req: any, res) => {
    const sessionId = req.params.sessionId;
    const user = req.dbUser;

    // Check if user is the creator
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Session not found',
        },
      });
    }

    if (session.creatorId !== user.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only the session creator can delete the session',
        },
      });
    }

    // Delete session and all related data
    await prisma.session.delete({
      where: { id: sessionId },
    });

    logger.info(`🗑️ User ${user.id} deleted session ${sessionId}`);

    res.json({
      success: true,
      message: 'Session deleted successfully',
    });
  })
);

// POST /sessions/:sessionId/join - Join a session
router.post(
  '/:sessionId/join',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;
    const sessionId = req.params.sessionId;

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Session not found',
        },
      });
    }

    // Check if user is already in the session
    let userSession = await prisma.userSession.findFirst({
      where: {
        userId: user.id,
        sessionId,
      },
    });

    if (userSession) {
      // Reactivate if inactive
      if (!userSession.isActive) {
        userSession = await prisma.userSession.update({
          where: { id: userSession.id },
          data: {
            isActive: true,
            joinedAt: new Date(),
            leftAt: null,
          },
        });
      }
    } else {
      // Create new user session
      userSession = await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionId,
          joinedAt: new Date(),
          isActive: true,
        },
      });
    }

    logger.info(`👥 User ${user.id} joined session ${sessionId}`);

    res.json({
      success: true,
      data: userSession,
    });
  })
);

// POST /sessions/:sessionId/leave - Leave a session
router.post(
  '/:sessionId/leave',
  clerkAuth,
  attachUser,
  checkSessionAccess,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;
    const sessionId = req.params.sessionId;

    await prisma.userSession.updateMany({
      where: {
        userId: user.id,
        sessionId,
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });

    logger.info(`🚪 User ${user.id} left session ${sessionId}`);

    res.json({
      success: true,
      message: 'Left session successfully',
    });
  })
);

// GET /sessions/:sessionId/messages - Get messages for a session
router.get(
  '/:sessionId/messages',
  clerkAuth,
  attachUser,
  checkSessionAccess,
  asyncHandler(async (req: any, res) => {
    const sessionId = req.params.sessionId;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: Number(limit),
      skip: Number(offset),
    });

    res.json({
      success: true,
      data: messages,
    });
  })
);

export default router;
