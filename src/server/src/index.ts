import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupWebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import sessionRouter from './routes/sessionRoutes';
import messageRouter from './routes/messageRoutes';
import userRouter from './routes/userRoutes';
import agentRouter from './routes/agentRoutes';
import { setupSocketHandlers } from './socket/socketHandler';
import { setupYjsProvider } from './socket/yjsProvider';
import { initializeDatabase } from './config/database';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  // Initialize database
  await initializeDatabase();

  // Create Express app
  const app = express();
  const httpServer = createServer(app);

  // Create Socket.IO server
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    },
  });

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  app.use(rateLimiter);

  // Clerk authentication middleware
  app.use(ClerkExpressRequireAuth({ onError: notFoundHandler }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/sessions', sessionRouter);
  app.use('/api/messages', messageRouter);
  app.use('/api/users', userRouter);
  app.use('/api/agents', agentRouter);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Multiplayer AI Orchestration API',
      version: '0.1.0',
      description: 'Backend API for real-time AI collaboration',
      endpoints: {
        health: 'GET /health',
        sessions: '/api/sessions',
        messages: '/api/messages',
        users: '/api/users',
        agents: '/api/agents',
      },
    });
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Setup Socket.IO handlers
  setupSocketHandlers(io);

  // Setup Yjs WebSocket provider for real-time collaboration
  setupYjsProvider(io);

  // Start server
  httpServer.listen(PORT, () => {
    logger.info(`✅ Server running on port ${PORT}`);
    logger.info(`🌐 API available at http://localhost:${PORT}`);
    logger.info(`🔌 Socket.IO available at ws://localhost:${PORT}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  });
}

// Start the application
bootstrap().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default bootstrap;
