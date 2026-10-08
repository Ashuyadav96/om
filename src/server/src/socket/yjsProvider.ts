import { Server, Socket } from 'socket.io';
import { setupWebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

// Map to store Y.Doc instances by room name
const docsMap = new Map<string, Y.Doc>();

// Map to store WebsocketProvider instances by room name
const providersMap = new Map<string, any>();

export function setupYjsProvider(io: Server) {
  logger.info('📡 Setting up Yjs WebSocket provider');

  // Create a custom WebSocket server for Yjs
  const yWebsocketServer = setupWebsocketProvider(io);

  // Handle Yjs-specific connections
  io.on('connection', (socket: Socket) => {
    setupYjsConnection(socket, io);
  });

  return yWebsocketServer;
}

export function setupYjsConnection(socket: Socket, io: Server) {
  const userId = (socket as any).userId as string;
  const sessionId = (socket as any).sessionId as string | undefined;

  if (!sessionId) {
    // Wait for session to be set
    socket.on('session-joined', ({ sessionId: newSessionId }) => {
      setupYjsForSession(socket, newSessionId, io);
    });
    return;
  }

  setupYjsForSession(socket, sessionId, io);
}

function setupYjsForSession(socket: Socket, sessionId: string, io: Server) {
  logger.info(`🔗 Setting up Yjs for session ${sessionId}`);

  // Get or create Y.Doc for this session
  let doc = docsMap.get(sessionId);
  if (!doc) {
    doc = new Y.Doc();
    docsMap.set(sessionId, doc);
    
    // Load existing session state from database
    loadSessionState(sessionId, doc);
  }

  // Get or create WebsocketProvider
  let provider = providersMap.get(sessionId);
  if (!provider) {
    provider = new (require('y-websocket').WebsocketProvider)(
      `ws://localhost:${process.env.PORT || 4000}`,
      sessionId,
      doc
    );
    providersMap.set(sessionId, provider);
  }

  // Setup awareness for cursors
  const awareness = provider.awareness;

  // Set local awareness state
  awareness.setLocalState({
    userId,
    userName: socket.handshake.auth.userName || 'Anonymous',
    cursor: null,
    color: getRandomColor(),
  });

  // Listen for awareness changes (cursors)
  awareness.on('change', (changes: any) => {
    // Broadcast cursor updates to all clients in the session
    const states = awareness.getStates();
    
    // Filter out the current user
    const otherUsers = Object.entries(states).filter(([key]) => key !== awareness.clientID.toString());
    
    // Send cursor updates to the socket
    socket.emit('yjs-awareness-update', {
      sessionId,
      cursors: otherUsers.map(([key, state]) => ({
        clientId: key,
        userId: state.userId,
        userName: state.userName,
        cursor: state.cursor,
        color: state.color,
      })),
    });
  });

  // Handle cursor updates from client
  socket.on('cursor-update', (data: { 
    sessionId: string; 
    position: { x: number; y: number } | null;
  }) => {
    if (data.sessionId === sessionId) {
      awareness.setLocalStateField('cursor', data.position);
    }
  });

  // Handle document updates
  doc.on('update', (update: Uint8Array) => {
    // Save to database periodically
    debounceSaveSessionState(sessionId, doc);
  });

  // Handle socket disconnection
  socket.on('disconnect', () => {
    // Remove awareness state
    if (awareness) {
      awareness.setLocalState(null);
    }
    
    // Check if this was the last user in the session
    const roomSockets = io.sockets.adapter.sockets(new Set([sessionId]));
    if (roomSockets.size === 0) {
      // Clean up if no one is left
      setTimeout(() => {
        if (io.sockets.adapter.sockets(new Set([sessionId])).size === 0) {
          docsMap.delete(sessionId);
          providersMap.delete(sessionId);
          logger.info(`🗑️ Cleaned up Yjs resources for session ${sessionId}`);
        }
      }, 30000); // Wait 30 seconds before cleanup
    }
  });

  // Send initial awareness state to the client
  const initialStates = provider.awareness.getStates();
  socket.emit('yjs-awareness-init', {
    sessionId,
    cursors: Object.entries(initialStates).map(([key, state]) => ({
      clientId: key,
      userId: state.userId,
      userName: state.userName,
      cursor: state.cursor,
      color: state.color,
    })),
  });
}

// Load session state from database
async function loadSessionState(sessionId: string, doc: Y.Doc) {
  try {
    const sessionState = await prisma.sessionState.findUnique({
      where: { sessionId },
    });

    if (sessionState) {
      const stateData = sessionState.stateData as any;
      if (stateData && stateData.update) {
        // Apply the stored update to the document
        Y.applyUpdate(doc, stateData.update);
        logger.info(`📥 Loaded session state for ${sessionId}`);
      }
    }
  } catch (error) {
    logger.error(`Failed to load session state for ${sessionId}:`, error);
  }
}

// Save session state to database (debounced)
let saveTimeout: NodeJS.Timeout | null = null;

function debounceSaveSessionState(sessionId: string, doc: Y.Doc) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    try {
      const update = Y.encodeStateAsUpdate(doc);
      
      await prisma.sessionState.upsert({
        where: { sessionId },
        create: {
          sessionId,
          stateData: { update: Array.from(update) },
          version: 1,
        },
        update: {
          stateData: { update: Array.from(update) },
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      logger.debug(`💾 Saved session state for ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to save session state for ${sessionId}:`, error);
    }
  }, 2000); // Save every 2 seconds after last change
}

// Generate random color for cursor
function getRandomColor(): string {
  const colors = [
    '#0ea5e9', // primary-500
    '#f59e0b', // accent-500
    '#8b5cf6', // purple-500
    '#10b981', // green-500
    '#ef4444', // red-500
    '#eab308', // yellow-600
    '#ec4899', // pink-500
    '#3b82f6', // blue-500
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
