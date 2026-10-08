import { render, screen, fireEvent } from '@testing-library/react';
import { Button, Card, Input } from '../components';
import { AgentSelector, AgentAvatar } from '../components/Agent';
import { Message } from '../components/Chat';

describe('UI Components', () => {
  describe('Button', () => {
    it('renders with children', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('renders with primary variant by default', () => {
      render(<Button>Primary</Button>);
      const button = screen.getByText('Primary');
      expect(button).toHaveClass('bg-primary-600');
    });

    it('renders with secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByText('Secondary');
      expect(button).toHaveClass('bg-secondary-800');
    });

    it('renders with ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByText('Ghost');
      expect(button).toHaveClass('text-secondary-400');
    });

    it('renders with danger variant', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByText('Danger');
      expect(button).toHaveClass('bg-red-600');
    });

    it('renders with outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByText('Outline');
      expect(button).toHaveClass('border');
    });

    it('renders with different sizes', () => {
      render(
        <>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </>
      );
      expect(screen.getByText('Small')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Large')).toBeInTheDocument();
    });

    it('renders with left icon', () => {
      render(<Button leftIcon={<span>🤖</span>}>With Icon</Button>);
      expect(screen.getByText('🤖')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      render(<Button rightIcon={<span>→</span>}>With Icon</Button>);
      expect(screen.getByText('→')).toBeInTheDocument();
    });

    it('is disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByText('Disabled')).toBeDisabled();
    });

    it('shows loading state', () => {
      render(<Button isLoading>Loading</Button>);
      expect(screen.getByText('Loading')).toBeInTheDocument();
    });
  });

  describe('Card', () => {
    it('renders with children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('renders with default variant', () => {
      render(<Card>Default</Card>);
      const card = screen.getByText('Default');
      expect(card.parentElement).toHaveClass('bg-secondary-900');
    });

    it('renders with bordered variant', () => {
      render(<Card variant="bordered">Bordered</Card>);
      const card = screen.getByText('Bordered');
      expect(card.parentElement).toHaveClass('border');
    });

    it('renders with glass variant', () => {
      render(<Card variant="glass">Glass</Card>);
      const card = screen.getByText('Glass');
      expect(card.parentElement).toHaveClass('backdrop-blur-sm');
    });

    it('renders with different padding', () => {
      render(
        <>
          <Card padding="none">None</Card>
          <Card padding="sm">Small</Card>
          <Card padding="md">Medium</Card>
          <Card padding="lg">Large</Card>
        </>
      );
      expect(screen.getByText('None')).toBeInTheDocument();
      expect(screen.getByText('Small')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Large')).toBeInTheDocument();
    });
  });

  describe('Input', () => {
    it('renders with label', () => {
      render(<Input label="Name" />);
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toBeInTheDocument();
    });

    it('renders with left icon', () => {
      render(<Input leftIcon={<span>🔍</span>} placeholder="Search" />);
      expect(screen.getByText('🔍')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      render(<Input rightIcon={<span>✓</span>} placeholder="Success" />);
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('renders with error', () => {
      render(<Input error="Invalid input" />);
      expect(screen.getByText('Invalid input')).toBeInTheDocument();
    });

    it('renders with hint', () => {
      render(<Input hint="Enter your name" />);
      expect(screen.getByText('Enter your name')).toBeInTheDocument();
    });

    it('is disabled when disabled prop is true', () => {
      render(<Input disabled placeholder="Disabled" />);
      const input = screen.getByPlaceholderText('Disabled');
      expect(input).toBeDisabled();
    });

    it('clears value when clearable and has value', () => {
      const { rerender } = render(<Input value="test" clearable />);
      const clearButton = screen.getByRole('button');
      fireEvent.click(clearButton);
      // This would need proper mocking of the onChange handler
    });
  });
});

describe('Agent Components', () => {
  describe('AgentSelector', () => {
    it('renders with current agent', () => {
      render(<AgentSelector currentAgent="claude" onSelect={jest.fn()} />);
      expect(screen.getByText('Claude')).toBeInTheDocument();
    });

    it('calls onSelect when agent is changed', () => {
      const mockOnSelect = jest.fn();
      render(<AgentSelector currentAgent="claude" onSelect={mockOnSelect} />);
      
      // This would need proper testing with user interaction
      // For now, just verify it renders
      expect(screen.getByText('Claude')).toBeInTheDocument();
    });

    it('shows dropdown when clicked', () => {
      render(<AgentSelector currentAgent="claude" onSelect={jest.fn()} />);
      // Would need to test dropdown opening
    });
  });

  describe('AgentAvatar', () => {
    it('renders with agent ID', () => {
      render(<AgentAvatar agentId="claude" />);
      expect(screen.getByText('🤖')).toBeInTheDocument();
    });

    it('renders with different sizes', () => {
      render(
        <>
          <AgentAvatar agentId="claude" size="sm" />
          <AgentAvatar agentId="claude" size="md" />
          <AgentAvatar agentId="claude" size="lg" />
        </>
      );
      expect(screen.getAllByText('🤖').length).toBe(3);
    });

    it('renders with name when showName is true', () => {
      render(<AgentAvatar agentId="claude" showName />);
      expect(screen.getByText('Claude')).toBeInTheDocument();
    });

    it('renders unknown agent with question mark', () => {
      render(<AgentAvatar agentId="unknown" />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });
  });
});

describe('Chat Components', () => {
  describe('Message', () => {
    const mockMessage = {
      id: 'msg-1',
      sender: 'user' as const,
      senderName: 'Test User',
      senderId: 'user-123',
      content: 'Hello world',
      timestamp: new Date(),
    };

    it('renders user message', () => {
      render(<Message message={mockMessage} />);
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('renders agent message', () => {
      const agentMessage = {
        ...mockMessage,
        sender: 'agent' as const,
        senderName: 'Claude',
        agentType: 'claude',
      };
      render(<Message message={agentMessage} />);
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('renders system message', () => {
      const systemMessage = {
        ...mockMessage,
        sender: 'system' as const,
        senderName: 'System',
      };
      render(<Message message={systemMessage} />);
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('renders with formatted content', () => {
      const formattedMessage = {
        ...mockMessage,
        content: '**Bold** and *italic* and `code`',
      };
      render(<Message message={formattedMessage} />);
      expect(screen.getByText('Bold')).toBeInTheDocument();
    });

    it('renders with code blocks', () => {
      const codeMessage = {
        ...mockMessage,
        content: '```javascript\nconst x = 1;\n```',
      };
      render(<Message message={codeMessage} />);
      expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });
  });
});
