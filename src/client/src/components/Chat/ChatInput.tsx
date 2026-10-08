import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Socket } from 'socket.io-client';
import * as Y from 'yjs';

interface ChatInputProps {
  sessionId: string;
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const AGENT_COMMANDS = [
  { command: '/claude', description: 'Switch to Claude agent' },
  { command: '/codex', description: 'Switch to Codex agent' },
  { command: '/hermes', description: 'Switch to Hermes agent' },
  { command: '/help', description: 'Show available commands' },
  { command: '/clear', description: 'Clear the chat' },
  { command: '/users', description: 'List active users in session' },
];

export const ChatInput = ({
  sessionId,
  onSend,
  disabled = false,
  placeholder = 'Type your message here...'
}: ChatInputProps) => {
  const { user } = useUser();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [commandIndex, setCommandIndex] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commandsRef = useRef<HTMLDivElement>(null);

  // Initialize socket
  useEffect(() => {
    if (!user?.id || !sessionId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}`;
    
    const newSocket = io(socketUrl, {
      auth: { userId: user.id },
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user?.id, sessionId]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Check for command prefix
    if (e.target.value.startsWith('/')) {
      setShowCommands(true);
      // Find matching commands
      const matches = AGENT_COMMANDS.filter(cmd => 
        cmd.command.startsWith(e.target.value.toLowerCase())
      );
      if (matches.length > 0) {
        setCommandIndex(0);
      }
    } else {
      setShowCommands(false);
    }

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }

    // Send typing indicator
    if (socket) {
      socket.emit('typing', { 
        sessionId, 
        isTyping: e.target.value.length > 0 
      });
    }
  }, [socket, sessionId]);

  // Handle command selection
  const handleCommandSelect = useCallback((command: string) => {
    setInputValue(command + ' ');
    setShowCommands(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Handle key down
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle command navigation
    if (showCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCommandIndex((prev) => Math.min(prev + 1, AGENT_COMMANDS.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCommandIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleCommandSelect(AGENT_COMMANDS[commandIndex].command);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommands(false);
      }
      return;
    }

    // Handle submit on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    }
  }, [showCommands, commandIndex, handleCommandSelect]);

  // Handle form submit
  const handleSubmit = useCallback((e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || disabled || isLoading) return;

    // Handle commands
    if (inputValue.startsWith('/')) {
      handleCommand(inputValue);
      setInputValue('');
      return;
    }

    setIsLoading(true);
    try {
      onSend(inputValue.trim());
    } finally {
      setIsLoading(false);
    }
    
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputValue, disabled, isLoading, onSend]);

  // Handle command
  const handleCommand = useCallback((command: string) => {
    const cmd = command.slice(1).trim().toLowerCase();
    
    switch (cmd) {
      case 'claude':
      case 'codex':
      case 'hermes':
        // Switch agent - this would be handled by parent
        break;
      case 'help':
        showHelp();
        break;
      case 'clear':
        // Clear chat - would need to be handled by parent
        break;
      case 'users':
        // List users - would need socket implementation
        break;
      default:
        // Unknown command
        break;
    }
  }, []);

  // Show help in chat
  const showHelp = useCallback(() => {
    const helpText = [
      '**Available Commands:**',
      '',
      ...AGENT_COMMANDS.map(cmd => `- ${cmd.command}: ${cmd.description}`),
      '',
      '*Tip: Type / to see commands*'
    ].join('\n');
    
    onSend(helpText);
  }, [onSend]);

  // Close commands when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandsRef.current && !commandsRef.current.contains(event.target as Node)) {
        setShowCommands(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter commands based on input
  const filteredCommands = AGENT_COMMANDS.filter(cmd => 
    cmd.command.startsWith(inputValue.toLowerCase())
  );

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-end space-x-3 bg-secondary-900 border border-secondary-700 rounded-lg p-1 focus-within:ring-1 focus-within:ring-primary-500 transition-all">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-secondary-500 resize-none p-2 min-h-[44px]"
            disabled={disabled || isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || disabled || isLoading}
            className="btn btn-primary px-4 py-2 rounded-md disabled:opacity-50 flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <span className="spinner w-4 h-4" />
                <span>Sending...</span>
              </>
            ) : (
              <span>Send</span>
            )}
          </button>
        </div>
      </form>

      {/* Commands popup */}
      {showCommands && filteredCommands.length > 0 && (
        <div 
          ref={commandsRef}
          className="absolute bottom-full left-0 right-0 bg-secondary-800 border border-secondary-700 rounded-lg p-2 mb-2 max-h-60 overflow-y-auto z-50 shadow-lg"
        >
          {filteredCommands.map((cmd, index) => (
            <div
              key={cmd.command}
              onClick={() => handleCommandSelect(cmd.command)}
              className={`px-3 py-2 rounded cursor-pointer transition-colors ${
                index === commandIndex 
                  ? 'bg-primary-600 text-white' 
                  : 'text-secondary-300 hover:bg-secondary-700'
              }`}
            >
              <span className="text-primary-400">{cmd.command}</span>
              <span className="ml-3 text-sm">{cmd.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex justify-between px-2 mt-2 text-xs text-secondary-500">
        <div className="flex space-x-4">
          <button 
            type="button"
            onClick={() => setInputValue('/')}
            className="hover:text-white transition-colors"
          >
            / Commands
          </button>
        </div>
        <div>
          {inputValue.length > 0 && (
            <span>{inputValue.length} chars</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
