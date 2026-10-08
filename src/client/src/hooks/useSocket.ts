import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { User, Session, Message, Cursor } from '../types';

interface SocketHookOptions {
  userId: string;
  userName?: string;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

interface SocketHookReturn {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  joinSession: (sessionId: string) => Promise<void>;
  leaveSession: (sessionId: string) => Promise<void>;
  sendMessage: (sessionId: string, message: Partial<Message>) => Promise<void>;
  sendTyping: (sessionId: string, isTyping: boolean) => void;
  updateCursor: (sessionId: string, position: { x: number; y: number } | null) => void;
  requestHandoff: (sessionId: string, newDriverId: string) => Promise<void>;
  changeAgent: (sessionId: string, agentType: string) => void;
}

export function useSocket(options: SocketHookOptions): SocketHookReturn {
  const { userId, userName, onConnect, onDisconnect, onError } = options;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!userId) {
      setIsConnecting(false);
      return;
    }

    setIsConnecting(true);
    setIsConnected(false);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}`;

    try {
      const newSocket = io(socketUrl, {
        auth: { userId, userName },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Connection events
      newSocket.on('connect', () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        onConnect?.();
      });

      newSocket.on('disconnect', (reason: string) => {
        setIsConnected(false);
        onDisconnect?.(reason);
      });

      newSocket.on('connect_error', (err: Error) => {
        setError(err);
        setIsConnecting(false);
        onError?.(err);
      });

      // Cleanup
      return () => {
        newSocket.disconnect();
        socketRef.current = null;
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize socket'));
      setIsConnecting(false);
      onError?.(err instanceof Error ? err : new Error('Socket initialization failed'));
    }
  }, [userId, userName, onConnect, onDisconnect, onError]);

  // Join a session
  const joinSession = useCallback(async (sessionId: string) => {
    if (!socketRef.current) {
      throw new Error('Socket not initialized');
    }

    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('join-session', { sessionId }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to join session'));
        }
      });
    });
  }, []);

  // Leave a session
  const leaveSession = useCallback(async (sessionId: string) => {
    if (!socketRef.current) {
      throw new Error('Socket not initialized');
    }

    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('leave-session', { sessionId }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to leave session'));
        }
      });
    });
  }, []);

  // Send a message
  const sendMessage = useCallback(async (sessionId: string, message: Partial<Message>) => {
    if (!socketRef.current) {
      throw new Error('Socket not initialized');
    }

    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('message', {
        sessionId,
        message: {
          ...message,
          timestamp: new Date().toISOString(),
        },
      }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to send message'));
        }
      });
    });
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((sessionId: string, isTyping: boolean) => {
    socketRef.current?.emit('typing', { sessionId, isTyping });
  }, []);

  // Update cursor position
  const updateCursor = useCallback((sessionId: string, position: { x: number; y: number } | null) => {
    socketRef.current?.emit('cursor-update', {
      sessionId,
      position,
      userName,
    });
  }, [userName]);

  // Request handoff
  const requestHandoff = useCallback(async (sessionId: string, newDriverId: string) => {
    if (!socketRef.current) {
      throw new Error('Socket not initialized');
    }

    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('handoff', { sessionId, newDriverId }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to request handoff'));
        }
      });
    });
  }, []);

  // Change agent
  const changeAgent = useCallback((sessionId: string, agentType: string) => {
    socketRef.current?.emit('agent-change', { sessionId, agentType });
  }, []);

  return {
    socket,
    isConnected,
    isConnecting,
    error,
    joinSession,
    leaveSession,
    sendMessage,
    sendTyping,
    updateCursor,
    requestHandoff,
    changeAgent,
  };
}

export default useSocket;
