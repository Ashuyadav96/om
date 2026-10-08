import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { io, Socket } from 'socket.io-client';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useYjsDoc } from '../lib/yjs-hooks';

// Types
interface Message {
  id: string;
  sender: 'user' | 'agent' | 'system';
  senderName: string;
  content: string;
  timestamp: Date;
  agentType?: string;
}

interface Session {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  userIds: string[];
  agentType: string;
}

interface UserCursor {
  userId: string;
  userName: string;
  position: { x: number; y: number };
  color: string;
}

// Agent configuration
const AGENT_CONFIG = {
  claude: { name: 'Claude', color: 'from-orange-500 to-amber-600', icon: '🤖' },
  codex: { name: 'Codex', color: 'from-green-500 to-emerald-600', icon: '💻' },
  hermes: { name: 'Hermes', color: 'from-purple-500 to-pink-600', icon: '📚' },
} as const;

// Sidebar component
const Sidebar = ({ 
  sessions, 
  currentSessionId, 
  onSelectSession, 
  onCreateSession 
}: {
  sessions: Session[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
}) => {
  const [newSessionName, setNewSessionName] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<'claude' | 'codex' | 'hermes'>('claude');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreate = () => {
    if (newSessionName.trim()) {
      onCreateSession();
      setNewSessionName('');
      setShowCreateModal(false);
    }
  };

  return (
    <div className="w-64 bg-secondary-900 border-r border-secondary-800 h-full flex flex-col">
      <div className="p-4 border-b border-secondary-800">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full btn btn-primary flex items-center justify-center space-x-2"
        >
          <span>+</span>
          <span>New Session</span>
        </button>
      </div>

      <div className="p-4">
        <h3 className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-3">
          Your Sessions
        </h3>
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`session-item ${currentSessionId === session.id ? 'session-item-active' : ''}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full bg-primary-500 ${currentSessionId === session.id ? 'opacity-100' : 'opacity-0'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{session.name}</p>
                  <p className="text-xs text-secondary-500">{session.agentType}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create session modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Session</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-secondary-400 mb-1">Session Name</label>
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="e.g., Team Debugging"
                  className="w-full input-area"
                />
              </div>
              <div>
                <label className="block text-sm text-secondary-400 mb-1">AI Agent</label>
                <div className="flex space-x-2">
                  {Object.entries(AGENT_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedAgent(key as 'claude' | 'codex' | 'hermes')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedAgent === key
                          ? `bg-${key}-500 text-white`
                          : 'bg-secondary-800 text-secondary-400 hover:bg-secondary-700'
                      }`}
                    >
                      {config.icon} {config.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex space-x-2 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newSessionName.trim()}
                  className="btn btn-primary flex-1 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Agent selector component
const AgentSelector = ({ 
  currentAgent, 
  onSelectAgent 
}: {
  currentAgent: string;
  onSelectAgent: (agent: string) => void;
}) => (
  <div className="flex space-x-2">
    {Object.entries(AGENT_CONFIG).map(([key, config]) => (
      <button
        key={key}
        onClick={() => onSelectAgent(key)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
          currentAgent === key
            ? `bg-gradient-to-r ${config.color} text-white shadow-lg`
            : 'bg-secondary-800 text-secondary-400 hover:bg-secondary-700'
        }`}
      >
        <span>{config.icon}</span>
        <span>{config.name}</span>
      </button>
    ))}
  </div>
);

// Chat input component
const ChatInput = ({ 
  value, 
  onChange, 
  onSubmit, 
  isLoading 
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}) => (
  <form onSubmit={onSubmit} className="p-4 border-t border-secondary-800">
    <div className="input-area flex items-end space-x-3">
      <textarea
        value={value}
        onChange={onChange}
        placeholder="Type your message here..."
        rows={1}
        className="flex-1 bg-transparent border-none outline-none text-white placeholder-secondary-500 resize-none"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={!value.trim() || isLoading}
        className="btn btn-primary px-6 py-2 disabled:opacity-50"
      >
        {isLoading ? (
          <div className="spinner w-4 h-4" />
        ) : (
          'Send'
        )}
      </button>
    </div>
  </form>
);

// Message component
const Message = ({ message }: { message: Message }) => {
  const isUser = message.sender === 'user';
  const isAgent = message.sender === 'agent';
  const agentConfig = message.agentType ? AGENT_CONFIG[message.agentType as keyof typeof AGENT_CONFIG] : null;

  return (
    <div className={`flex items-start space-x-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAgent && agentConfig ? `bg-gradient-to-br ${agentConfig.color}` : 'bg-secondary-700'
        }`}>
          <span className="text-white text-sm">
            {isAgent ? (agentConfig?.icon || '🤖') : message.senderName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div className={`flex-1 ${isUser ? 'order-2' : 'order-1'}`} />
      <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : isAgent ? 'chat-bubble-agent' : 'chat-bubble-system'}`}>
        {!isUser && !isAgent && (
          <span className="text-secondary-400 text-xs block mb-1">{message.senderName}</span>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p className="text-xs text-secondary-500 mt-1 text-right">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {isUser && (
        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">{message.senderName.charAt(0).toUpperCase()}</span>
        </div>
      )}
    </div>
  );
};

// Main chat area
const ChatArea = ({ 
  messages, 
  currentAgent, 
  onSelectAgent 
}: {
  messages: Message[];
  currentAgent: string;
  onSelectAgent: (agent: string) => void;
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col bg-secondary-950">
      {/* Header */}
      <div className="p-4 border-b border-secondary-800 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-white">Session</h2>
          <AgentSelector currentAgent={currentAgent} onSelectAgent={onSelectAgent} />
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-secondary-400 text-sm">Connected</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-secondary-500">
            <div className="text-6xl mb-4">🤖</div>
            <p className="text-lg mb-2">Welcome to Multiplayer AI</p>
            <p className="text-sm text-center max-w-md">
              Start a conversation with {AGENT_CONFIG[currentAgent as keyof typeof AGENT_CONFIG]?.name || 'your chosen agent'}.
              Your team members can join and collaborate in real time.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <Message key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

// Main app component
const AppPage = () => {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentAgent, setCurrentAgent] = useState<'claude' | 'codex' | 'hermes'>('claude');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [yDoc, setYDoc] = useState<Y.Doc | null>(null);
  const [yProvider, setYProvider] = useState<WebsocketProvider | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!isLoaded || !user) return;

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { userId: user.id },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isLoaded, user]);

  // Initialize Yjs document for current session
  useEffect(() => {
    if (!currentSessionId || !socket) return;

    const doc = new Y.Doc();
    const provider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
      currentSessionId,
      doc
    );

    setYDoc(doc);
    setYProvider(provider);

    // Sync existing messages
    const yMessages = doc.getArray('messages');
    const existingMessages: Message[] = yMessages.map((msg: any) => ({
      id: msg.id,
      sender: msg.sender,
      senderName: msg.senderName,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      agentType: msg.agentType,
    }));
    setMessages(existingMessages);

    // Listen for new messages
    yMessages.observe((events) => {
      events.forEach((event) => {
        event.target.forEach((msg: any, index: number) => {
          if (event.changes.added.has(index)) {
            setMessages((prev) => [
              ...prev,
              {
                id: msg.id,
                sender: msg.sender,
                senderName: msg.senderName,
                content: msg.content,
                timestamp: new Date(msg.timestamp),
                agentType: msg.agentType,
              },
            ]);
          }
        });
      });
    });

    return () => {
      provider.destroy();
      doc.destroy();
    };
  }, [currentSessionId, socket]);

  // Handle sending message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket || !user || !currentSessionId) return;

    const message: Message = {
      id: Date.now().toString(),
      sender: 'user',
      senderName: user.fullName || user.username || 'User',
      content: inputValue.trim(),
      timestamp: new Date(),
      agentType: currentAgent,
    };

    // Add to local state
    setMessages((prev) => [...prev, message]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Send to server
      socket.emit('message', {
        sessionId: currentSessionId,
        message: {
          ...message,
          timestamp: message.timestamp.toISOString(),
        },
        agentType: currentAgent,
      });
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new session
  const handleCreateSession = async () => {
    if (!socket || !user) return;

    const sessionId = Date.now().toString();
    const newSession: Session = {
      id: sessionId,
      name: `Session ${sessions.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      userIds: [user.id],
      agentType: currentAgent,
    };

    setSessions((prev) => [...prev, newSession]);
    setCurrentSessionId(sessionId);

    // Notify server
    socket.emit('create-session', newSession);
  };

  // Select session
  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
  };

  // Load user sessions (mock for now)
  useEffect(() => {
    if (!isLoaded || !user) return;

    // Mock sessions - replace with actual API call
    const mockSessions: Session[] = [
      {
        id: '1',
        name: 'Team Debugging',
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 3600000),
        userIds: [user.id],
        agentType: 'claude',
      },
      {
        id: '2',
        name: 'Product Brainstorm',
        createdAt: new Date(Date.now() - 172800000),
        updatedAt: new Date(Date.now() - 7200000),
        userIds: [user.id],
        agentType: 'codex',
      },
    ];

    setSessions(mockSessions);
    if (mockSessions.length > 0) {
      setCurrentSessionId(mockSessions[0].id);
    }
  }, [isLoaded, user]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  return (
    <SignedIn>
      <Head>
        <title>Multiplayer AI - App</title>
      </Head>
      
      <div className="min-h-screen bg-secondary-950 flex">
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
        />
        
        <div className="flex-1 flex flex-col">
          <ChatArea
            messages={messages}
            currentAgent={currentAgent}
            onSelectAgent={(agent) => setCurrentAgent(agent as 'claude' | 'codex' | 'hermes')}
          />
          
          <ChatInput
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onSubmit={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </SignedIn>
  );
};

// Wrapper component
const AppWrapper = () => {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        <AppPage />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

export default AppWrapper;
