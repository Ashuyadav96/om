import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { FiPlus, FiSearch, FiMoreVertical, FiUsers, FiClock, FiMessageSquare, FiTrash2 } from 'react-icons/fi';
import { Socket, io } from 'socket.io-client';

interface Session {
  id: string;
  name: string;
  currentAgent: string;
  creatorId: string;
  creator: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string;
  };
  userSessions: Array<{
    user: {
      id: string;
      username: string;
      fullName: string;
      avatarUrl?: string;
    };
  }>;
  createdAt: Date | string;
  updatedAt: Date | string;
  status: string;
}

interface SessionListProps {
  currentSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
}

const AGENT_CONFIG = {
  claude: { name: 'Claude', color: 'from-orange-500 to-amber-600', icon: '🤖', bg: 'bg-orange-500' },
  codex: { name: 'Codex', color: 'from-green-500 to-emerald-600', icon: '💻', bg: 'bg-green-500' },
  hermes: { name: 'Hermes', color: 'from-purple-500 to-pink-600', icon: '📚', bg: 'bg-purple-500' },
} as const;

const SessionItem = ({
  session,
  isActive,
  onSelect,
  onDelete,
}: {
  session: Session;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) => {
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const { user } = useUser();
  const isCreator = session.creatorId === user?.id;

  // Close actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const agentConfig = session.currentAgent 
    ? AGENT_CONFIG[session.currentAgent as keyof typeof AGENT_CONFIG] 
    : null;

  return (
    <div 
      className={`p-3 rounded-lg cursor-pointer transition-all duration-150 ${
        isActive 
          ? 'bg-secondary-800 border border-primary-500' 
          : 'hover:bg-secondary-800/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full ${
            isActive ? 'bg-primary-500' : 'bg-secondary-600'
          }`} />
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{session.name}</p>
            <div className="flex items-center space-x-3 text-xs text-secondary-500 mt-1">
              <span className="flex items-center space-x-1">
                <span className={`w-2 h-2 rounded-full ${agentConfig?.bg || 'bg-secondary-600'}`} />
                <span>{agentConfig?.name || session.currentAgent}</span>
              </span>
              <span>{formatDate(session.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex -space-x-1">
            {session.userSessions.slice(0, 3).map((us, index) => (
              <div
                key={us.user.id}
                className="w-6 h-6 rounded-full border-2 border-secondary-800 overflow-hidden"
                style={{ zIndex: 2 - index }}
              >
                {us.user.avatarUrl ? (
                  <img 
                    src={us.user.avatarUrl} 
                    alt={us.user.fullName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-secondary-700 flex items-center justify-center">
                    <span className="text-xs text-white">{us.user.fullName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
            ))}
            {session.userSessions.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-secondary-700 border-2 border-secondary-800 flex items-center justify-center">
                <span className="text-xs text-white">+{session.userSessions.length - 3}</span>
              </div>
            )}
          </div>

          <div ref={actionsRef} className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1.5 rounded hover:bg-secondary-700/50 transition-colors"
            >
              <FiMoreVertical size={16} className="text-secondary-500" />
            </button>

            {showActions && isCreator && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-secondary-800 border border-secondary-700 rounded-lg p-1 shadow-lg z-50">
                <button
                  onClick={onDelete}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded"
                >
                  <FiTrash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateSessionButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-center space-x-2 p-3 bg-secondary-800 hover:bg-secondary-700 border border-dashed border-secondary-600 rounded-lg transition-all duration-150 text-secondary-300 hover:text-white"
  >
    <FiPlus size={18} />
    <span>New Session</span>
  </button>
);

export const SessionList = ({
  currentSessionId,
  onSelectSession,
  onCreateSession,
}: SessionListProps) => {
  const { user } = useUser();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize socket and fetch sessions
  useEffect(() => {
    if (!user?.id) return;

    // Initialize socket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}`;
    const newSocket = io(socketUrl, { auth: { userId: user.id } });
    setSocket(newSocket);

    // Fetch sessions
    fetchSessions();

    // Listen for new sessions
    newSocket.on('session-created', (data: any) => {
      fetchSessions();
    });

    // Listen for session updates
    newSocket.on('session-updated', () => {
      fetchSessions();
    });

    // Listen for session deletions
    newSocket.on('session-deleted', () => {
      fetchSessions();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user?.id]);

  // Fetch sessions from API
  const fetchSessions = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/sessions', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Filter sessions based on search query
  const filteredSessions = sessions.filter((session) => {
    const query = searchQuery.toLowerCase();
    return (
      session.name.toLowerCase().includes(query) ||
      session.currentAgent.toLowerCase().includes(query) ||
      session.creator.fullName.toLowerCase().includes(query)
    );
  });

  // Sort sessions by updatedAt (newest first)
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    const aDate = new Date(a.updatedAt).getTime();
    const bDate = new Date(b.updatedAt).getTime();
    return bDate - aDate;
  });

  // Handle session deletion
  const handleDeleteSession = useCallback(async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        // Remove from local state
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        
        // If this was the current session, clear it
        if (currentSessionId === sessionId) {
          onSelectSession('');
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }, [currentSessionId, onSelectSession]);

  return (
    <div className="w-64 bg-secondary-900 border-r border-secondary-800 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-secondary-800">
        <div className="relative">
          <FiSearch 
            size={16} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions..."
            className="w-full bg-secondary-800 border border-secondary-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-secondary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="spinner w-6 h-6" />
          </div>
        ) : sortedSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-secondary-500 p-4">
            <FiMessageSquare size={48} className="mb-4 opacity-50" />
            <p className="text-sm text-center">No sessions found</p>
            <p className="text-xs text-center mt-1">Start a new session to begin collaborating</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sortedSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={currentSessionId === session.id}
                onSelect={() => onSelectSession(session.id)}
                onDelete={() => handleDeleteSession(session.id, event as any)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-secondary-800">
        <CreateSessionButton onClick={onCreateSession} />
      </div>
    </div>
  );
};

// Helper for session creation modal
interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, agentType: string) => void;
}

export const CreateSessionModal = ({ isOpen, onClose, onCreate }: CreateSessionModalProps) => {
  const [name, setName] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<'claude' | 'codex' | 'hermes'>('claude');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Clear form on open
  useEffect(() => {
    if (isOpen) {
      setName('');
      setSelectedAgent('claude');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    onCreate(name.trim(), selectedAgent);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-secondary-800 border border-secondary-700 rounded-lg p-6 w-full max-w-md shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Create New Session</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary-700/50 transition-colors"
          >
            <FiX size={18} className="text-secondary-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-300 mb-1">
              Session Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Team Debugging, Product Brainstorm"
              className="w-full bg-secondary-900 border border-secondary-700 rounded-lg px-3 py-2 text-white placeholder-secondary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-300 mb-1">
              AI Agent
            </label>
            <div className="flex space-x-2">
              {Object.entries(AGENT_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedAgent(key as 'claude' | 'codex' | 'hermes')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                    selectedAgent === key
                      ? `bg-gradient-to-r ${config.color} text-white shadow-md`
                      : 'bg-secondary-900 text-secondary-400 hover:bg-secondary-700 border border-secondary-700'
                  }`}
                >
                  <span>{config.icon}</span>
                  <span>{config.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="btn btn-primary flex-1 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner w-4 h-4" />
                  <span>Creating...</span>
                </>
              ) : (
                'Create Session'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Close icon for modal
const FiX = ({ size, className }: { size: number; className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth={2} 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <line x1={18} y1={6} x2={6} y2={18} />
    <line x1={6} y1={6} x2={18} y2={18} />
  </svg>
);

export default SessionList;
