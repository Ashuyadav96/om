import { useState, useEffect } from 'react';
import { FiChevronDown, FiCheck, FiZap } from 'react-icons/fi';

interface AgentConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  provider: string;
  isAvailable?: boolean;
}

const AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'claude',
    name: 'Claude',
    icon: '🤖',
    color: 'from-orange-500 to-amber-600',
    description: 'Best for reasoning and general tasks',
    provider: 'anthropic',
    isAvailable: true,
  },
  {
    id: 'codex',
    name: 'Codex',
    icon: '💻',
    color: 'from-green-500 to-emerald-600',
    description: 'Best for coding and debugging',
    provider: 'openai',
    isAvailable: true,
  },
  {
    id: 'hermes',
    name: 'Hermes',
    icon: '📚',
    color: 'from-purple-500 to-pink-600',
    description: 'Best for research and analysis',
    provider: 'huggingface',
    isAvailable: true,
  },
];

interface AgentSelectorProps {
  currentAgent: string;
  onSelect: (agentId: string) => void;
  disabled?: boolean;
  showDescription?: boolean;
}

export const AgentSelector = ({
  currentAgent,
  onSelect,
  disabled = false,
  showDescription = false,
}: AgentSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentConfig = AGENT_CONFIGS.find((a) => a.id === currentAgent);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#agent-selector')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSelect = (agentId: string) => {
    onSelect(agentId);
    setIsOpen(false);
  };

  if (!currentConfig) {
    return (
      <div className="inline-flex items-center justify-center px-3 py-1.5 bg-secondary-800 rounded-lg text-sm">
        Select Agent
      </div>
    );
  }

  return (
    <div id="agent-selector" className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center justify-between space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:bg-secondary-700/50'
        }`}
        style={{
          background: isOpen ? `linear-gradient(to right, ${currentConfig.color.replace('to', ',')})` : 'transparent',
        }}
      >
        <span className="flex items-center space-x-1">
          <span>{currentConfig.icon}</span>
          <span className={isOpen ? 'text-white' : 'text-secondary-300'}>{currentConfig.name}</span>
        </span>
        <FiChevronDown 
          size={14} 
          className={`transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-secondary-500'}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-secondary-800 border border-secondary-700 rounded-lg p-2 shadow-xl z-50 animate-in">
          {AGENT_CONFIGS.map((agent) => {
            const isCurrent = agent.id === currentAgent;
            return (
              <button
                key={agent.id}
                onClick={() => handleSelect(agent.id)}
                className={`w-full flex items-center justify-between p-2 rounded text-left transition-colors ${
                  isCurrent
                    ? 'bg-primary-600/20 text-white'
                    : 'text-secondary-300 hover:bg-secondary-700/50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{agent.icon}</span>
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    {showDescription && (
                      <p className="text-xs text-secondary-500">{agent.description}</p>
                    )}
                  </div>
                </div>
                {isCurrent && <FiCheck size={16} className="text-primary-500" />}
              </button>
            );
          })}

          <div className="border-t border-secondary-700 mt-2 pt-2">
            <p className="text-xs text-secondary-500 px-2">
              <FiZap size={12} className="inline mr-1" />
              Switch between AI agents
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Agent avatar component
export const AgentAvatar = ({
  agentId,
  size = 'md',
  showName = false,
}: {
  agentId: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}) => {
  const agent = AGENT_CONFIGS.find((a) => a.id === agentId);
  
  if (!agent) {
    return (
      <div className={`w-8 h-8 bg-secondary-700 rounded-full flex items-center justify-center`}>
        <span className="text-xs text-white">?</span>
      </div>
    );
  }

  const sizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  return (
    <div className="flex items-center space-x-2">
      <div 
        className={`rounded-full flex items-center justify-center ${sizes[size]}`}
        style={{
          background: `linear-gradient(to right, ${agent.color.replace('to', ',')})`,
        }}
      >
        <span className="text-white">{agent.icon}</span>
      </div>
      {showName && (
        <span className="text-sm text-white">{agent.name}</span>
      )}
    </div>
  );
};

// Agent status indicator
export const AgentStatus = ({
  agentId,
  isActive,
}: {
  agentId: string;
  isActive: boolean;
}) => {
  const agent = AGENT_CONFIGS.find((a) => a.id === agentId);
  
  if (!agent) return null;

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <AgentAvatar agentId={agentId} size="sm" />
        {isActive && (
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-secondary-900" />
        )}
      </div>
      <div>
        <p className="text-sm text-white">{agent.name}</p>
        <p className={`text-xs ${isActive ? 'text-green-500' : 'text-secondary-500'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </p>
      </div>
    </div>
  );
};

// Agent card for selection
export const AgentCard = ({
  agent,
  isSelected,
  onSelect,
}: {
  agent: AgentConfig;
  isSelected: boolean;
  onSelect: (agentId: string) => void;
}) => (
  <button
    onClick={() => onSelect(agent.id)}
    className={`w-full p-4 rounded-lg border transition-all ${
      isSelected
        ? 'border-primary-500 bg-primary-600/10 ring-1 ring-primary-500'
        : 'border-secondary-700 hover:border-secondary-600 hover:bg-secondary-800/50'
    }`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: `linear-gradient(to right, ${agent.color.replace('to', ',')})`,
          }}
        >
          <span className="text-xl">{agent.icon}</span>
        </div>
        <div className="text-left">
          <p className="font-semibold text-white">{agent.name}</p>
          <p className="text-sm text-secondary-400">{agent.description}</p>
          <p className="text-xs text-secondary-500 mt-1">
            {agent.provider} {agent.isAvailable ? '✓' : '✗'}
          </p>
        </div>
      </div>
      {isSelected && <FiCheck size={20} className="text-primary-500" />}
    </div>
  </button>
);

export default AgentSelector;
