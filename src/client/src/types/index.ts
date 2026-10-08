// Core types for the application

// User types
export interface User {
  id: string;
  clerkId: string;
  email?: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Session types
export interface Session {
  id: string;
  name: string;
  creatorId: string;
  currentAgent: string;
  status: 'active' | 'ended' | 'paused';
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  endedAt?: Date;
  creator?: User;
  userSessions?: UserSession[];
}

// User-Session relationship
export interface UserSession {
  id: string;
  userId: string;
  sessionId: string;
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
  cursorColor: string;
  user?: User;
}

// Message types
export interface Message {
  id: string;
  sessionId: string;
  senderType: 'user' | 'agent' | 'system';
  senderId?: string;
  senderName: string;
  content: string;
  agentType?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  parentMessageId?: string;
  replies?: Message[];
}

// Agent types
export type AgentType = 'claude' | 'codex' | 'hermes' | 'custom';

export interface AgentConfig {
  id: string;
  agentType: AgentType;
  displayName: string;
  provider: string;
  defaultModel: string;
  models: string[];
  isAvailable: boolean;
}

// Cursor types
export interface Cursor {
  clientId: string;
  userId: string;
  userName: string;
  position: { x: number; y: number };
  color: string;
}

// Socket events
export interface SocketEvents {
  'connect': () => void;
  'disconnect': (reason: string) => void;
  'connect_error': (error: Error) => void;
  'join-session': (data: { sessionId: string }) => void;
  'leave-session': (data: { sessionId: string }) => void;
  'message': (data: { sessionId: string; message: Message; agentType: string }) => void;
  'new-message': (message: Message) => void;
  'agent-request': (data: { sessionId: string; prompt: string; agentType: string; userId: string }) => void;
  'agent-response': (data: { sessionId: string; response: string; agentType: string }) => void;
  'cursor-update': (data: { sessionId: string; position: { x: number; y: number }; userName: string; color: string }) => void;
  'yjs-awareness-update': (data: { cursors: Cursor[] }) => void;
  'yjs-awareness-init': (data: { cursors: Cursor[] }) => void;
  'typing': (data: { sessionId: string; isTyping: boolean }) => void;
  'user-typing': (data: { userId: string; isTyping: boolean; userName?: string }) => void;
  'session-joined': (data: { sessionId: string; userId: string }) => void;
  'session-left': (data: { sessionId: string; userId: string }) => void;
  'user-joined': (data: { userId: string; userName: string }) => void;
  'user-left': (data: { userId: string }) => void;
  'driver-changed': (data: { userId: string; timestamp: string }) => void;
  'handoff': (data: { sessionId: string; newDriverId: string }) => void;
  'agent-change': (data: { sessionId: string; agentType: string }) => void;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Agent request/response types
export interface AgentRequest {
  sessionId: string;
  userId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  agentType: AgentType;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AgentResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason?: string;
}

// UI state types
export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  typingUsers: string[];
  cursors: Cursor[];
  currentAgent: AgentType;
  currentDriverId: string;
}

// Session state for Yjs
export interface YjsSessionState {
  messages: Message[];
  version: number;
  lastUpdated: Date;
}
