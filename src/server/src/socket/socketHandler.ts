import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { setupYjsConnection } from './yjsProvider';

interface SocketData {
  userId: string;
  sessionId?: string;
}

interface MessageData {
  sessionId: string;
  message: {
    id: string;
    sender: 'user' | 'agent' | 'system';
    senderName: string;
    content: string;
    timestamp: string;
    agentType?: string;
  };
  agentType: string;
}

interface CreateSessionData {
  id: string;
  name: string;
  creatorId: string;
  currentAgent: string;
  userIds: string[];
}

interface JoinSessionData {
  sessionId: string;
  userId: string;
}

export function setupSocketHandlers(io: Server) {
  logger.info('🔌 Setting up Socket.IO handlers');

  io.on('connection', async (socket: Socket) => {
    const userId = socket.handshake.auth.userId as string | undefined;
    
    if (!userId) {
      logger.warn(`Connection attempt without user ID: ${socket.id}`);
      socket.disconnect(true);
      return;
    }

    logger.info(`✅ New connection: ${socket.id} (User: ${userId})`);

    // Store user ID in socket data
    (socket as any).userId = userId;

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`❌ Disconnected: ${socket.id} (User: ${userId}) - Reason: ${reason}`);
      handleDisconnect(socket);
    });

    // Handle connection error
    socket.on('connect_error', (err) => {
      logger.error(`Connection error for ${socket.id}:`, err);
    });

    // Handle joining a session
    socket.on('join-session', async (data: JoinSessionData, callback) => {
      try {
        await handleJoinSession(socket, data);
        callback({ success: true });
      } catch (error) {
        logger.error(`Failed to join session ${data.sessionId}:`, error);
        callback({ success: false, error: 'Failed to join session' });
      }
    });

    // Handle leaving a session
    socket.on('leave-session', (data: { sessionId: string }, callback) => {
      try {
        handleLeaveSession(socket, data.sessionId);
        callback({ success: true });
      } catch (error) {
        logger.error(`Failed to leave session ${data.sessionId}:`, error);
        callback({ success: false, error: 'Failed to leave session' });
      }
    });

    // Handle creating a new session
    socket.on('create-session', async (data: CreateSessionData, callback) => {
      try {
        await handleCreateSession(socket, data);
        callback({ success: true, sessionId: data.id });
      } catch (error) {
        logger.error('Failed to create session:', error);
        callback({ success: false, error: 'Failed to create session' });
      }
    });

    // Handle incoming messages
    socket.on('message', async (data: MessageData, callback) => {
      try {
        await handleMessage(socket, data);
        callback({ success: true });
      } catch (error) {
        logger.error('Failed to handle message:', error);
        callback({ success: false, error: 'Failed to send message' });
      }
    });

    // Handle agent requests
    socket.on('agent-request', async (data: { 
      sessionId: string; 
      prompt: string; 
      agentType: string;
      userId: string;
    }, callback) => {
      try {
        await handleAgentRequest(socket, data);
        callback({ success: true });
      } catch (error) {
        logger.error('Failed to handle agent request:', error);
        callback({ success: false, error: 'Failed to process agent request' });
      }
    });

    // Handle cursor updates
    socket.on('cursor-update', (data: { 
      sessionId: string; 
      position: { x: number; y: number };
      userName: string;
      color: string;
    }) => {
      // Broadcast cursor update to all users in the session
      socket.to(data.sessionId).emit('cursor-update', {
        userId: userId,
        ...data,
      });
    });

    // Handle typoing indicator
    socket.on('typing', (data: { sessionId: string; isTyping: boolean }) => {
      socket.to(data.sessionId).emit('user-typing', {
        userId,
        isTyping: data.isTyping,
      });
    });

    // Setup Yjs connection for this socket
    setupYjsConnection(socket, io);
  });
}

// Handle user disconnection
function handleDisconnect(socket: Socket) {
  const userId = (socket as any).userId as string;
  const sessionId = (socket as any).sessionId as string | undefined;

  if (sessionId) {
    // Notify session that user left
    socket.to(sessionId).emit('user-left', { userId });
    
    // Remove from session room
    socket.leave(sessionId);
  }
}

// Handle joining a session
async function handleJoinSession(socket: Socket, data: JoinSessionData) {
  const userId = (socket as any).userId as string;
  const { sessionId } = data;

  // Join the session room
  await socket.join(sessionId);
  (socket as any).sessionId = sessionId;

  // Store in socket data
  (socket as any).sessionId = sessionId;

  // Notify the user they joined successfully
  socket.emit('session-joined', {
    sessionId,
    userId,
  });

  // Notify other users in the session
  socket.to(sessionId).emit('user-joined', {
    userId,
    userName: socket.handshake.auth.userName || 'Anonymous',
  });

  // Update user session in database
  try {
    await prisma.userSession.upsert({
      where: {
        userId_sessionId: {
          userId,
          sessionId,
        },
      },
      create: {
        userId,
        sessionId,
        joinedAt: new Date(),
        isActive: true,
      },
      update: {
        leftAt: null,
        isActive: true,
        joinedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error(`Failed to update user session for ${userId} in ${sessionId}:`, error);
  }

  logger.info(`👥 User ${userId} joined session ${sessionId}`);
}

// Handle leaving a session
function handleLeaveSession(socket: Socket, sessionId: string) {
  const userId = (socket as any).userId as string;

  // Leave the room
  socket.leave(sessionId);
  
  // Remove session from socket data
  (socket as any).sessionId = null;

  // Notify other users
  socket.to(sessionId).emit('user-left', { userId });

  // Update user session in database
  prisma.userSession.updateMany({
    where: {
      userId,
      sessionId,
    },
    data: {
      leftAt: new Date(),
      isActive: false,
    },
  }).catch((error) => {
    logger.error(`Failed to update user session on leave for ${userId} in ${sessionId}:`, error);
  });

  logger.info(`🚪 User ${userId} left session ${sessionId}`);
}

// Handle creating a new session
async function handleCreateSession(socket: Socket, data: CreateSessionData) {
  const userId = (socket as any).userId as string;
  const { id: sessionId, name, creatorId, currentAgent, userIds } = data;

  // Create session in database
  const session = await prisma.session.create({
    data: {
      id: sessionId,
      name,
      creatorId,
      currentAgent,
      status: 'active',
    },
  });

  // Create user session for creator
  await prisma.userSession.create({
    data: {
      userId: creatorId,
      sessionId,
      joinedAt: new Date(),
      isActive: true,
    },
  });

  // Join the session
  await socket.join(sessionId);
  (socket as any).sessionId = sessionId;

  // Notify user
  socket.emit('session-created', {
    session: {
      ...session,
      userIds,
    },
  });

  logger.info(`🆕 User ${userId} created session ${sessionId}: ${name}`);
}

// Handle incoming messages
async function handleMessage(socket: Socket, data: MessageData) {
  const userId = (socket as any).userId as string;
  const { sessionId, message, agentType } = data;

  // Store message in database
  try {
    await prisma.message.create({
      data: {
        id: message.id,
        sessionId,
        senderType: message.sender,
        senderId: message.sender === 'user' ? userId : agentType,
        senderName: message.senderName,
        content: message.content,
        agentType: message.sender === 'agent' ? agentType : undefined,
        createdAt: new Date(message.timestamp),
      },
    });
  } catch (error) {
    logger.error(`Failed to store message ${message.id}:`, error);
  }

  // Broadcast message to all users in the session
  io.of(sessionId).emit('new-message', {
    ...message,
    timestamp: new Date(message.timestamp),
  });

  logger.debug(`💬 Message from ${message.senderName} in session ${sessionId}: ${message.content.substring(0, 50)}...`);
}

// Handle agent requests
async function handleAgentRequest(
  socket: Socket,
  data: { sessionId: string; prompt: string; agentType: string; userId: string }
) {
  const { sessionId, prompt, agentType, userId } = data;

  logger.info(`🤖 Agent request in session ${sessionId}: ${prompt.substring(0, 50)}...`);

  // TODO: Integrate with actual agent APIs
  // For now, we'll simulate an agent response
  
  // Get session to determine which agent to use
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // Simulate agent response (replace with actual API call)
  const agentResponse = await simulateAgentResponse(prompt, agentType);

  // Create agent message
  const agentMessage = {
    id: `agent-${Date.now()}`,
    sender: 'agent' as const,
    senderName: agentType,
    content: agentResponse,
    timestamp: new Date().toISOString(),
    agentType,
  };

  // Store message in database
  await prisma.message.create({
    data: {
      id: agentMessage.id,
      sessionId,
      senderType: 'agent',
      senderId: agentType,
      senderName: agentType,
      content: agentResponse,
      agentType,
      createdAt: new Date(),
    },
  });

  // Broadcast agent response to all users in the session
  io.of(sessionId).emit('new-message', {
    ...agentMessage,
    timestamp: new Date(),
  });

  logger.info(`🤖 Agent ${agentType} responded in session ${sessionId}`);
}

// Simulate agent response (temporary)
async function simulateAgentResponse(prompt: string, agentType: string): Promise<string> {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const responses = {
    claude: `I've analyzed your request: "${prompt}". Here's my response based on the context provided.`,
    codex: `Here's the code based on your request: "${prompt}":\n\n\[Code output would appear here\]`,
    hermes: `Based on my knowledge, the answer to "${prompt}" is: [Detailed response]`,
  };

  return responses[agentType as keyof typeof responses] || `Response from ${agentType}: I've processed your request.`;
}

// Import io for broadcasting
declare const io: Server;
