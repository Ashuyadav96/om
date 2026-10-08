import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Socket, io } from 'socket.io-client';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface Message {
  id: string;
  sender: 'user' | 'agent' | 'system';
  senderName: string;
  senderId?: string;
  content: string;
  timestamp: Date | string;
  agentType?: string;
}

interface UserCursor {
  clientId: string;
  userId: string;
  userName: string;
  cursor: { x: number; y: number } | null;
  color: string;
}

interface ChatAreaProps {
  sessionId: string;
  currentAgent: string;
  onAgentChange: (agent: string) => void;
}

const AGENT_CONFIG = {
  claude: { name: 'Claude', color: 'from-orange-500 to-amber-600', icon: '🤖', bg: 'bg-orange-500' },
  codex: { name: 'Codex', color: 'from-green-500 to-emerald-600', icon: '💻', bg: 'bg-green-500' },
  hermes: { name: 'Hermes', color: 'from-purple-500 to-pink-600', icon: '📚', bg: 'bg-purple-500' },
} as const;

const MessageBubble = ({ message }: { message: Message }) => {
  const { user } = useUser();
  const isCurrentUser = message.sender === 'user' && message.senderId === user?.id;
  const isAgent = message.sender === 'agent';
  const agentConfig = message.agentType ? AGENT_CONFIG[message.agentType as keyof typeof AGENT_CONFIG] : null;

  const formatTime = (ts: Date | string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex items-start space-x-3 mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {!isCurrentUser && (
        <div 
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isAgent && agentConfig ? `bg-gradient-to-br ${agentConfig.color}` : 'bg-secondary-700'
          }`}
        >
          <span className="text-white text-sm">
            {isAgent ? (agentConfig?.icon || '🤖') : message.senderName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      
      <div className={`flex-1 ${isCurrentUser ? 'order-2' : 'order-1'}`} />
      
      <div 
        className={`max-w-[80%] lg:max-w-[70%] px-4 py-2 rounded-lg ${
          isCurrentUser 
            ? 'bg-primary-700 text-white ml-auto' 
            : isAgent 
              ? 'bg-secondary-800 text-secondary-50 mr-auto' 
              : 'bg-secondary-900 text-secondary-300 mr-auto'
        }`}
      >
        {!isCurrentUser && !isAgent && (
          <span className="text-xs text-secondary-400 block mb-1">{message.senderName}</span>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className={`text-xs mt-1 text-right ${isCurrentUser ? 'text-primary-200' : 'text-secondary-500'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
      
      {isCurrentUser && (
        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">
            {message.senderName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
};

const AgentSelector = ({ currentAgent, onSelect }: { currentAgent: string; onSelect: (agent: string) => void }) => (
  <div className="flex space-x-1 bg-secondary-800 p-1 rounded-lg">
    {Object.entries(AGENT_CONFIG).map(([key, config]) => (
      <button
        key={key}
        onClick={() => onSelect(key)}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center space-x-1 ${
          currentAgent === key
            ? `bg-gradient-to-r ${config.color} text-white shadow-md`
            : 'text-secondary-400 hover:bg-secondary-700'
        }`}
      >
        <span>{config.icon}</span>
        <span>{config.name}</span>
      </button>
    ))}
  </div>
);

const TypingIndicator = ({ users }: { users: string[] }) => (
  <div className="flex items-center space-x-2 mb-4">
    <div className="flex space-x-1">
      {users.slice(0, 3).map((user, index) => (
        <div
          key={user}
          className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce"
          style={{ animationDelay: `${index * 0.1}s` }}
        />
      ))}
    </div>
    <span className="text-xs text-secondary-500">
      {users.length === 1 
        ? `${users[0]} is typing...` 
        : `${users.length} users are typing...`}
    </span>
  </div>
);

const CursorIndicator = ({ cursor }: { cursor: UserCursor }) => {
  if (!cursor.cursor) return null;
  
  return (
    <div
      className="absolute pointer-events-none transition-all duration-100"
      style={{
        left: `${cursor.cursor.x}px`,
        top: `${cursor.cursor.y}px`,
      }}
    >
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cursor.color }} />
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-secondary-900 text-xs px-2 py-1 rounded whitespace-nowrap">
        {cursor.userName}
      </div>
    </div>
  );
};

export const ChatArea = ({ sessionId, currentAgent, onAgentChange }: ChatAreaProps) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [cursors, setCursors] = useState<UserCursor[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [yDoc, setYDoc] = useState<Y.Doc | null>(null);
  const [yProvider, setYProvider] = useState<WebsocketProvider | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!user?.id || !sessionId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}`;
    
    const newSocket = io(socketUrl, {
      auth: { userId: user.id, userName: user.fullName || user.username || 'User' },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    // Join session
    newSocket.emit('join-session', { sessionId });

    // Handle new messages
    newSocket.on('new-message', (data: Message) => {
      setMessages((prev) => [...prev, { ...data, timestamp: new Date(data.timestamp) }]);
    });

    // Handle typing indicators
    newSocket.on('user-typing', (data: { userId: string; isTyping: boolean; userName?: string }) => {
      setTypingUsers((prev) => {
        const newUsers = [...prev];
        if (data.isTyping && data.userName && !newUsers.includes(data.userName)) {
          newUsers.push(data.userName);
        } else {
          return newUsers.filter((u) => u !== data.userName);
        }
        return newUsers;
      });
    });

    // Handle cursor updates
    newSocket.on('yjs-awareness-update', (data: { cursors: UserCursor[] }) => {
      setCursors(data.cursors);
    });

    // Handle initial awareness
    newSocket.on('yjs-awareness-init', (data: { cursors: UserCursor[] }) => {
      setCursors(data.cursors);
    });

    // Handle session messages
    newSocket.on('session-message', (data: Message) => {
      setMessages((prev) => [...prev, { ...data, timestamp: new Date(data.timestamp) }]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user?.id, sessionId, user?.fullName, user?.username]);

  // Initialize Yjs document
  useEffect(() => {
    if (!sessionId || !socket) return;

    try {
      const doc = new Y.Doc();
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      
      const provider = new WebsocketProvider(wsUrl, sessionId, doc);
      
      setYDoc(doc);
      setYProvider(provider);

      // Get messages array from Yjs
      const yMessages = doc.getArray<Message>('messages');
      
      // Load existing messages
      const existingMessages: Message[] = [];
      yMessages.forEach((msg: any) => {
        existingMessages.push({
          ...msg,
          timestamp: new Date(msg.timestamp),
        });
      });
      
      if (existingMessages.length > 0) {
        setMessages(existingMessages);
      }

      // Observe changes
      yMessages.observe((events) => {
        events.forEach((event) => {
          if (event.target === yMessages) {
            const newMessages: Message[] = [];
            event.changes.added.forEach((index) => {
              const msg = yMessages.get(index) as any;
              newMessages.push({
                ...msg,
                timestamp: new Date(msg.timestamp),
              });
            });
            if (newMessages.length > 0) {
              setMessages((prev) => [...prev, ...newMessages]);
            }
          }
        });
      });

      // Handle awareness (cursors)
      provider.awareness.on('change', () => {
        const states = provider.awareness.getStates();
        const cursorData: UserCursor[] = [];
        
        states.forEach((state: any, clientId: string) => {
          if (state.cursor && clientId !== provider.awareness.clientID.toString()) {
            cursorData.push({
              clientId,
              userId: state.userId,
              userName: state.userName,
              cursor: state.cursor,
              color: state.color,
            });
          }
        });
        
        setCursors(cursorData);
      });

      // Set local awareness
      provider.awareness.setLocalState({
        userId: user?.id,
        userName: user?.fullName || user?.username || 'User',
        cursor: null,
        color: getRandomColor(),
      });

      return () => {
        provider.destroy();
        doc.destroy();
      };
    } catch (error) {
      console.error('Failed to initialize Yjs:', error);
    }
  }, [sessionId, socket, user?.id, user?.fullName, user?.username]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Send typing indicator
    if (socket && sessionId) {
      socket.emit('typing', { 
        sessionId, 
        isTyping: e.target.value.length > 0 
      });
    }
  }, [socket, sessionId]);

  // Handle form submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket || !user?.id || !sessionId) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender: 'user',
      senderId: user.id,
      senderName: user.fullName || user.username || 'User',
      content: inputValue.trim(),
      timestamp: new Date(),
      agentType: currentAgent,
    };

    // Add to local state
    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Send via Socket.io
      socket.emit('message', {
        sessionId,
        message: {
          ...newMessage,
          timestamp: newMessage.timestamp.toISOString(),
        },
        agentType: currentAgent,
      });

      // Also update Yjs document
      if (yDoc) {
        const yMessages = yDoc.getArray<Message>('messages');
        yDoc.transact(() => {
          yMessages.push([{
            ...newMessage,
            timestamp: newMessage.timestamp.toISOString(),
          }]);
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, socket, user?.id, user?.fullName, user?.username, sessionId, currentAgent, yDoc]);

  // Handle agent change
  const handleAgentChange = useCallback((agent: string) => {
    onAgentChange(agent);
    
    if (socket && sessionId) {
      socket.emit('agent-change', { sessionId, agentType: agent });
    }
  }, [socket, sessionId, onAgentChange]);

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-secondary-950">
        <div className="p-4 border-b border-secondary-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Session</h2>
          <AgentSelector currentAgent={currentAgent} onSelect={handleAgentChange} />
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-secondary-500">
          <div className="text-6xl mb-4">🤖</div>
          <p className="text-lg mb-2">Welcome to Multiplayer AI</p>
          <p className="text-sm text-center max-w-md">
            Start a conversation with {AGENT_CONFIG[currentAgent as keyof typeof AGENT_CONFIG]?.name || 'your chosen agent'}.
            Your team members can join and collaborate in real time.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-secondary-800">
          <div className="flex items-end space-x-3 bg-secondary-900 border border-secondary-700 rounded-lg p-1">
            <textarea
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Type your message here..."
              rows={1}
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-secondary-500 resize-none p-2"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="btn btn-primary px-4 py-2 rounded-md disabled:opacity-50"
            >
              {isLoading ? <span className="spinner w-4 h-4" /> : 'Send'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-secondary-950 relative" ref={chatContainerRef}>
      {/* Header */}
      <div className="p-4 border-b border-secondary-800 flex items-center justify-between bg-secondary-900/50 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-white">Session</h2>
        <AgentSelector currentAgent={currentAgent} onSelect={handleAgentChange} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
        
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {/* Cursor indicators */}
        {cursors.map((cursor) => (
          <CursorIndicator key={cursor.clientId} cursor={cursor} />
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-secondary-800 bg-secondary-900/50 backdrop-blur-sm">
        <div className="flex items-end space-x-3 bg-secondary-900 border border-secondary-700 rounded-lg p-1 focus-within:ring-1 focus-within:ring-primary-500">
          <textarea
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type your message here..."
            rows={1}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-secondary-500 resize-none p-2"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="btn btn-primary px-4 py-2 rounded-md disabled:opacity-50"
          >
            {isLoading ? <span className="spinner w-4 h-4" /> : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Helper function
function getRandomColor(): string {
  const colors = [
    '#0ea5e9', '#f59e0b', '#8b5cf6', '#10b981', 
    '#ef4444', '#eab308', '#ec4899', '#3b82f6'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export default ChatArea;
