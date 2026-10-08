import { useState, useEffect, useCallback } from 'react';
import { Session, UserSession, Message, AgentType } from '../types';
import { useSocket } from './useSocket';

interface UseSessionOptions {
  sessionId: string;
  userId: string;
  userName?: string;
}

interface UseSessionReturn {
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  users: UserSession[];
  messages: Message[];
  currentAgent: AgentType;
  currentDriverId: string;
  typingUsers: string[];
  cursors: Array<{
    clientId: string;
    userId: string;
    userName: string;
    position: { x: number; y: number } | null;
    color: string;
  }>;
  joinSession: () => Promise<void>;
  leaveSession: () => Promise<void>;
  sendMessage: (content: string, agentType?: AgentType) => Promise<void>;
  changeAgent: (agentType: AgentType) => void;
  requestHandoff: (newDriverId: string) => Promise<void>;
  updateCursor: (position: { x: number; y: number } | null) => void;
}

export function useSession(options: UseSessionOptions): UseSessionReturn {
  const { sessionId, userId, userName } = options;
  const { socket, isConnected, joinSession, leaveSession, sendMessage: sendSocketMessage, changeAgent: socketChangeAgent, requestHandoff: socketRequestHandoff, updateCursor: socketUpdateCursor } = useSocket({ userId, userName });
  
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [users, setUsers] = useState<UserSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAgent, setCurrentAgent] = useState<AgentType>('claude');
  const [currentDriverId, setCurrentDriverId] = useState<string>('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [cursors, setCursors] = useState<Array<{ clientId: string; userId: string; userName: string; position: { x: number; y: number } | null; color: string; }>>([]);

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/sessions/${sessionId}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setSession(data.data);
          setCurrentAgent(data.data.currentAgent as AgentType);
          setCurrentDriverId(data.data.creatorId); // Default to creator as driver
          setUsers(data.data.userSessions || []);
          setMessages(data.data.messages || []);
        } else {
          throw new Error('Failed to fetch session');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load session'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  // Join session via socket
  useEffect(() => {
    if (isConnected && sessionId) {
      joinSession(sessionId).catch((err) => {
        console.error('Failed to join session:', err);
      });
    }
  }, [isConnected, sessionId, joinSession]);

  // Setup socket event listeners
  useEffect(() => {
    if (!socket) return;

    // New message
    const handleNewMessage = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    // User typing
    const handleUserTyping = (data: { userId: string; isTyping: boolean; userName?: string }) => {
      setTypingUsers((prev) => {
        const newUsers = [...prev];
        if (data.isTyping && data.userName && !newUsers.includes(data.userName)) {
          newUsers.push(data.userName);
        } else {
          return newUsers.filter((u) => u !== data.userName);
        }
        return newUsers;
      });
    };

    // Cursor updates
    const handleCursorUpdate = (data: { cursors: Array<{ clientId: string; userId: string; userName: string; position: { x: number; y: number } | null; color: string; }> }) => {
      setCursors(data.cursors);
    };

    // Driver changed
    const handleDriverChanged = (data: { userId: string }) => {
      setCurrentDriverId(data.userId);
    };

    // User joined
    const handleUserJoined = (data: { userId: string; userName: string }) => {
      // Would need to fetch updated session data
    };

    // User left
    const handleUserLeft = (data: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    };

    // Agent changed
    const handleAgentChanged = (data: { sessionId: string; agentType: string }) => {
      if (data.sessionId === sessionId) {
        setCurrentAgent(data.agentType as AgentType);
      }
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-typing', handleUserTyping);
    socket.on('yjs-awareness-update', handleCursorUpdate);
    socket.on('driver-changed', handleDriverChanged);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('agent-change', handleAgentChanged);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('user-typing', handleUserTyping);
      socket.off('yjs-awareness-update', handleCursorUpdate);
      socket.off('driver-changed', handleDriverChanged);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('agent-change', handleAgentChanged);
    };
  }, [socket, sessionId]);

  // Join session
  const join = useCallback(async () => {
    await joinSession(sessionId);
  }, [sessionId, joinSession]);

  // Leave session
  const leave = useCallback(async () => {
    await leaveSession(sessionId);
    // Clear session data
    setSession(null);
    setUsers([]);
    setMessages([]);
  }, [sessionId, leaveSession]);

  // Send message
  const sendMsg = useCallback(async (content: string, agentType?: AgentType) => {
    if (!content.trim()) return;

    const message: Partial<Message> = {
      id: `msg-${Date.now()}`,
      senderType: 'user',
      senderId: userId,
      senderName: userName || 'User',
      content: content.trim(),
      agentType: agentType || currentAgent,
      timestamp: new Date(),
    };

    await sendSocketMessage(sessionId, message);
  }, [sessionId, userId, userName, currentAgent, sendSocketMessage]);

  // Change agent
  const change = useCallback((agentType: AgentType) => {
    setCurrentAgent(agentType);
    socketChangeAgent(sessionId, agentType);
  }, [sessionId, socketChangeAgent]);

  // Request handoff
  const request = useCallback(async (newDriverId: string) => {
    await socketRequestHandoff(sessionId, newDriverId);
    setCurrentDriverId(newDriverId);
  }, [sessionId, socketRequestHandoff]);

  // Update cursor
  const update = useCallback((position: { x: number; y: number } | null) => {
    socketUpdateCursor(sessionId, position);
  }, [sessionId, socketUpdateCursor]);

  return {
    session,
    isLoading,
    error,
    users,
    messages,
    currentAgent,
    currentDriverId,
    typingUsers,
    cursors,
    joinSession: join,
    leaveSession: leave,
    sendMessage: sendMsg,
    changeAgent: change,
    requestHandoff: request,
    updateCursor: update,
  };
}

export default useSession;
