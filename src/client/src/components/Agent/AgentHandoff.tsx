import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { FiArrowRight, FiUser, FiZap, FiClock } from 'react-icons/fi';
import { Socket, io } from 'socket.io-client';
import { AgentAvatar } from './AgentSelector';

interface User {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
}

interface AgentHandoffProps {
  sessionId: string;
  currentDriverId: string;
  currentAgent: string;
  users: User[];
  onHandoff: (userId: string) => void;
}

export const AgentHandoff = ({
  sessionId,
  currentDriverId,
  currentAgent,
  users,
  onHandoff,
}: AgentHandoffProps) => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [driver, setDriver] = useState<User | null>(null);
  const [lastActive, setLastActive] = useState<Record<string, Date>>({});

  // Initialize socket
  useEffect(() => {
    if (!user?.id || !sessionId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}`;
    const newSocket = io(socketUrl, { auth: { userId: user.id } });
    setSocket(newSocket);

    // Listen for driver changes
    newSocket.on('driver-changed', (data: { userId: string; timestamp: string }) => {
      setDriver(users.find((u) => u.id === data.userId) || null);
      setLastActive((prev) => ({
        ...prev,
        [data.userId]: new Date(data.timestamp),
      }));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user?.id, sessionId, users]);

  // Find current driver
  useEffect(() => {
    const currentDriver = users.find((u) => u.id === currentDriverId);
    setDriver(currentDriver || null);
  }, [currentDriverId, users]);

  // Update last active for current user
  useEffect(() => {
    if (user?.id) {
      setLastActive((prev) => ({
        ...prev,
        [user.id]: new Date(),
      }));
    }
  }, [user?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#handoff-dropdown')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleHandoff = (userId: string) => {
    if (socket && sessionId) {
      socket.emit('handoff', { sessionId, newDriverId: userId });
    }
    onHandoff(userId);
    setIsOpen(false);
  };

  const currentUserIsDriver = driver?.id === user?.id;

  // Filter out current driver from handoff options
  const handoffOptions = users.filter((u) => u.id !== driver?.id);

  if (!driver) {
    return (
      <div className="flex items-center space-x-2">
        <AgentAvatar agentId={currentAgent} size="sm" />
        <span className="text-sm text-secondary-400">No driver</span>
      </div>
    );
  }

  return (
    <div id="handoff-dropdown" className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 bg-secondary-800 rounded-lg hover:bg-secondary-700/50 transition-colors"
      >
        <AgentAvatar agentId={currentAgent} size="sm" />
        <div className="text-left">
          <p className="text-sm text-white">
            <FiUser size={12} className="inline mr-1" />
            {driver.fullName}
          </p>
          <p className="text-xs text-secondary-500">
            <FiZap size={10} className="inline mr-1" />
            Driving
          </p>
        </div>
        <FiArrowRight size={14} className="text-secondary-500" />
      </button>

      {isOpen && handoffOptions.length > 0 && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-secondary-800 border border-secondary-700 rounded-lg p-2 shadow-xl z-50">
          <p className="text-xs text-secondary-500 px-2 pb-1">
            Hand off to:
          </p>
          <div className="space-y-1">
            {handoffOptions.map((user) => (
              <button
                key={user.id}
                onClick={() => handleHandoff(user.id)}
                className="w-full flex items-center space-x-2 p-2 rounded text-left hover:bg-secondary-700/50 transition-colors text-sm"
              >
                <div className="w-6 h-6 rounded-full bg-secondary-700 flex items-center justify-center overflow-hidden">
                  {user.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user.fullName} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-white">{user.fullName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white truncate">{user.fullName}</p>
                  <p className="text-xs text-secondary-500">
                    {user.username}
                  </p>
                </div>
                {lastActive[user.id] && (
                  <span className="text-xs text-green-500">
                    <FiClock size={10} className="inline mr-0.5" />
                    {Math.floor((new Date().getTime() - new Date(lastActive[user.id]).getTime()) / 1000)}s
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentUserIsDriver && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-secondary-800" />
      )}
    </div>
  );
};

// Handoff indicator
export const HandoffIndicator = ({
  driverName,
  driverAvatar,
  onRequestHandoff,
}: {
  driverName: string;
  driverAvatar?: string;
  onRequestHandoff?: () => void;
}) => (
  <div className="flex items-center space-x-2 p-2 bg-secondary-800/50 rounded-lg">
    <div className="w-6 h-6 rounded-full bg-secondary-700 flex items-center justify-center overflow-hidden">
      {driverAvatar ? (
        <img src={driverAvatar} alt={driverName} className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs text-white">{driverName.charAt(0).toUpperCase()}</span>
      )}
    </div>
    <span className="text-sm text-secondary-300">
      Driving: {driverName}
    </span>
    {onRequestHandoff && (
      <button
        onClick={onRequestHandoff}
        className="text-xs text-primary-500 hover:text-primary-400 transition-colors"
      >
        Request handoff
      </button>
    )}
  </div>
);

// Handoff history
export const HandoffHistory = ({
  history,
}: {
  history: Array<{
    userId: string;
    userName: string;
    timestamp: Date;
    duration: number;
  }>;
}) => (
  <div className="space-y-2">
    <p className="text-xs text-secondary-500 uppercase tracking-wider">Handoff History</p>
    <div className="space-y-1.5">
      {history.map((entry, index) => (
        <div key={index} className="flex items-center justify-between p-2 bg-secondary-800/50 rounded">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-secondary-700 flex items-center justify-center">
              <span className="text-xs text-white">{entry.userName.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-sm text-white">{entry.userName}</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-secondary-400">
              {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-secondary-500">
              {entry.duration}s
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default AgentHandoff;
