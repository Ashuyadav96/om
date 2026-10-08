import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { FiCopy, FiEdit2, FiTrash2, FiMoreVertical, FiCheck, FiX } from 'react-icons/fi';

interface MessageProps {
  message: {
    id: string;
    sender: 'user' | 'agent' | 'system';
    senderName: string;
    senderId?: string;
    content: string;
    timestamp: Date | string;
    agentType?: string;
    edited?: boolean;
    metadata?: any;
  };
  onEdit?: (id: string, newContent: string) => void;
  onDelete?: (id: string) => void;
  onCopy?: (content: string) => void;
  showActions?: boolean;
}

const AGENT_CONFIG = {
  claude: { name: 'Claude', color: 'from-orange-500 to-amber-600', icon: '🤖', bg: 'bg-orange-500' },
  codex: { name: 'Codex', color: 'from-green-500 to-emerald-600', icon: '💻', bg: 'bg-green-500' },
  hermes: { name: 'Hermes', color: 'from-purple-500 to-pink-600', icon: '📚', bg: 'bg-purple-500' },
} as const;

const MessageActions = ({
  message,
  onEdit,
  onDelete,
  onCopy,
}: {
  message: MessageProps['message'];
  onEdit: MessageProps['onEdit'];
  onDelete: MessageProps['onDelete'];
  onCopy: MessageProps['onCopy'];
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const actionsRef = useRef<HTMLDivElement>(null);

  const { user } = useUser();
  const canEdit = message.sender === 'user' && message.senderId === user?.id;

  // Close actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    onCopy?.(message.content);
    setShowActions(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(message.content);
    setShowActions(false);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() !== message.content) {
      onEdit?.(message.id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete?.(message.id);
    setShowActions(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center space-x-2 mt-1">
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSaveEdit();
            }
            if (e.key === 'Escape') {
              setIsEditing(false);
            }
          }}
          className="flex-1 bg-secondary-800 border border-secondary-600 rounded px-2 py-1 text-sm outline-none"
          autoFocus
        />
        <button
          onClick={handleSaveEdit}
          className="p-1 text-green-500 hover:bg-green-500/10 rounded"
        >
          <FiCheck size={14} />
        </button>
        <button
          onClick={() => setIsEditing(false)}
          className="p-1 text-red-500 hover:bg-red-500/10 rounded"
        >
          <FiX size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={actionsRef} className="relative">
      <button
        onClick={() => setShowActions(!showActions)}
        className="p-1 rounded hover:bg-secondary-800/50 transition-colors"
      >
        <FiMoreVertical size={16} className="text-secondary-500" />
      </button>

      {showActions && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-secondary-800 border border-secondary-700 rounded-lg p-2 shadow-lg z-50">
          <button
            onClick={handleCopy}
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-secondary-300 hover:bg-secondary-700 rounded"
          >
            <FiCopy size={14} />
            <span>Copy</span>
          </button>

          {canEdit && (
            <>
              <button
                onClick={handleEdit}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-secondary-300 hover:bg-secondary-700 rounded"
              >
                <FiEdit2 size={14} />
                <span>Edit</span>
              </button>
              
              <button
                onClick={handleDelete}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded"
              >
                <FiTrash2 size={14} />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const CodeBlock = ({ code, language }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-secondary-900 border border-secondary-700 rounded-lg p-4 my-3 overflow-x-auto">
      <div className="absolute top-2 right-2 flex items-center space-x-2">
        {language && (
          <span className="text-xs text-secondary-500">{language}</span>
        )}
        <button
          onClick={handleCopy}
          className="text-xs text-secondary-500 hover:text-white transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const MessageContent = ({ content }: { content: string }) => {
  // Parse message content for code blocks and formatting
  const parts = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  const inlineCodeRegex = /`([^`]+)`/g;
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const italicRegex = /\*([^*]+)\*/g;

  let lastIndex = 0;
  let match;

  // Process code blocks
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before the code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, match.index),
      });
    }

    // Add the code block
    parts.push({
      type: 'code-block',
      language: match[1],
      content: match[2],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex),
    });
  }

  // Process each part for inline formatting
  return (
    <div className="whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.type === 'code-block') {
          return (
            <CodeBlock 
              key={index} 
              code={part.content} 
              language={part.language || undefined} 
            />
          );
        }

        // Process inline formatting
        let inlineContent = part.content;
        
        // Bold
        inlineContent = inlineContent.replace(boldRegex, '<strong>$1</strong>');
        
        // Italic
        inlineContent = inlineContent.replace(italicRegex, '<em>$1</em>');
        
        // Inline code
        inlineContent = inlineContent.replace(inlineCodeRegex, '<code class="bg-secondary-800 px-1 rounded">$1</code>');

        return (
          <span 
            key={index} 
            dangerouslySetInnerHTML={{ __html: inlineContent }}
          />
        );
      })}
    </div>
  );
};

export const Message = ({
  message,
  onEdit,
  onDelete,
  onCopy,
  showActions = true,
}: MessageProps) => {
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
        <div className="flex justify-between items-start">
          <div>
            {!isCurrentUser && !isAgent && (
              <span className="text-xs text-secondary-400 block mb-1">{message.senderName}</span>
            )}
            
            <MessageContent content={message.content} />
            
            {message.edited && (
              <span className="text-xs text-secondary-500 italic">(edited)</span>
            )}
          </div>
          
          {showActions && (
            <div className="ml-2 flex-shrink-0">
              <MessageActions
                message={message}
                onEdit={onEdit}
                onDelete={onDelete}
                onCopy={onCopy}
              />
            </div>
          )}
        </div>
        
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

export default Message;
