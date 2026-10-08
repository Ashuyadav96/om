import express from 'express';
import { Router } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { clerkAuth, attachUser, checkSessionAccess } from '../middleware/authMiddleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  agentType: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateMessageSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  metadata: z.record(z.any()).optional(),
});

// GET /messages - List messages (with filters)
router.get(
  '/',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;
    const { sessionId, limit = 50, offset = 0, senderType, senderId } = req.query;

    // Build where clause
    const where: any = {};
    if (sessionId) where.sessionId = sessionId as string;
    if (senderType) where.senderType = senderType as string;
    if (senderId) where.senderId = senderId as string;

    // If no sessionId, only get messages from sessions the user has access to
    if (!sessionId) {
      const userSessions = await prisma.userSession.findMany({
        where: { userId: user.id },
        select: { sessionId: true },
      });
      const sessionIds = userSessions.map((us) => us.sessionId);
      where.sessionId = { in: sessionIds };
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      include: {
        session: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: messages.reverse(), // Reverse to get chronological order
    });
  })
);

// POST /messages - Create a new message
router.post(
  '/',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;
    const body = createMessageSchema.parse(req.body);
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'sessionId query parameter is required',
        },
      });
    }

    // Check if user has access to the session
    const userSession = await prisma.userSession.findFirst({
      where: {
        userId: user.id,
        sessionId: sessionId as string,
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

    const message = await prisma.message.create({
      data: {
        sessionId: sessionId as string,
        senderType: 'user',
        senderId: user.id,
        senderName: user.fullName || user.username || 'User',
        content: body.content,
        agentType: body.agentType,
        metadata: body.metadata,
      },
      include: {
        session: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info(`💬 User ${user.id} sent message ${message.id} in session ${sessionId}`);

    res.status(201).json({
      success: true,
      data: message,
    });
  })
);

// GET /messages/:messageId - Get a specific message
router.get(
  '/:messageId',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const messageId = req.params.messageId;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        session: {
          select: {
            id: true,
            name: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Message not found',
        },
      });
    }

    res.json({
      success: true,
      data: message,
    });
  })
);

// PUT /messages/:messageId - Update a message
router.put(
  '/:messageId',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;
    const messageId = req.params.messageId;
    const body = updateMessageSchema.parse(req.body);

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Message not found',
        },
      });
    }

    // Only allow updating if the user is the sender
    if (message.senderId !== user.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only the message sender can update the message',
        },
      });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: body.content,
        metadata: body.metadata,
        updatedAt: new Date(),
      },
    });

    logger.info(`📝 User ${user.id} updated message ${messageId}`);

    res.json({
      success: true,
      data: updatedMessage,
    });
  })
);

// DELETE /messages/:messageId - Delete a message
router.delete(
  '/:messageId',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;
    const messageId = req.params.messageId;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        session: {
          select: {
            creatorId: true,
          },
        },
      },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Message not found',
        },
      });
    }

    // Only allow deletion if user is the sender or the session creator
    if (message.senderId !== user.id && message.session.creatorId !== user.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only the message sender or session creator can delete the message',
        },
      });
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    logger.info(`🗑️ User ${user.id} deleted message ${messageId}`);

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  })
);

// POST /messages/:messageId/reply - Reply to a message
router.post(
  '/:messageId/reply',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const user = req.dbUser;
    const messageId = req.params.messageId;
    const body = createMessageSchema.parse(req.body);

    const parentMessage = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!parentMessage) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Parent message not found',
        },
      });
    }

    // Check if user has access to the session
    const userSession = await prisma.userSession.findFirst({
      where: {
        userId: user.id,
        sessionId: parentMessage.sessionId,
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

    const reply = await prisma.message.create({
      data: {
        sessionId: parentMessage.sessionId,
        senderType: 'user',
        senderId: user.id,
        senderName: user.fullName || user.username || 'User',
        content: body.content,
        agentType: body.agentType,
        metadata: body.metadata,
        parentMessageId: messageId,
      },
      include: {
        session: {
          select: {
            id: true,
            name: true,
          },
        },
        parentMessage: true,
      },
    });

    logger.info(`💬 User ${user.id} replied to message ${messageId}`);

    res.status(201).json({
      success: true,
      data: reply,
    });
  })
);

// GET /messages/:messageId/replies - Get replies to a message
router.get(
  '/:messageId/replies',
  clerkAuth,
  attachUser,
  asyncHandler(async (req: any, res) => {
    const messageId = req.params.messageId;

    const parentMessage = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!parentMessage) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Parent message not found',
        },
      });
    }

    const replies = await prisma.message.findMany({
      where: {
        parentMessageId: messageId,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        session: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: replies,
    });
  })
);

export default router;
