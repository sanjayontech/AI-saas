import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConversationModal from './ConversationModal';

const mockConversation = {
  id: 'conv-1',
  sessionId: 'session-123456789',
  startedAt: '2024-01-01T10:00:00Z',
  endedAt: '2024-01-01T10:15:00Z',
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello, I need help with my account',
      timestamp: '2024-01-01T10:00:00Z'
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hi there! I\'d be happy to help you with your account. What specific issue are you experiencing?',
      timestamp: '2024-01-01T10:00:05Z'
    },
    {
      id: 'msg-3',
      role: 'user',
      content: 'I can\'t log into my account',
      timestamp: '2024-01-01T10:01:00Z'
    }
  ],
  metrics: {
    messageCount: 3,
    durationSeconds: 900,
    avgResponseTime: 1200,
    userSatisfaction: 4.5,
    topicsDiscussed: ['account', 'login', 'authentication'],
    userIntent: 'account_support',
    goalAchieved: true
  },
  userInfo: {
    email: 'user@example.com',
    name: 'John Doe',
    location: 'New York'
  }
};

describe('ConversationModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open with conversation data', () => {
    render(
      <ConversationModal 
        conversation={mockConversation}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Conversation Details')).toBeInTheDocument();
    expect(screen.getByText(/Session: session-123456789/)).toBeInTheDocument();
    expect(screen.getByText(/Started:/)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ConversationModal 
        conversation={mockConversation}
        isOpen={false}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Conversation Details')).not.toBeInTheDocument();
  });

  it('does not render when no conversation provided', () => {
    render(
      <ConversationModal 
        conversation={null}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Conversation Details')).not.toBeInTheDocument();
  });

  it('displays conversation metrics correctly', () => {
    render(
      <ConversationModal 
        conversation={mockConversation}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Conversation Metrics')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Message count
    expect(screen.getByText('15m 0s')).toBeInTheDocument(); // Duration
    expect(screen.getByText('1200ms')).toBeInTheDocument(); // Avg response time
    expect(screen.getByText('★★★★☆')).toBeInTheDocument(); // Satisfaction (4.5 stars)
  });

  it('displays topics discussed', () => {
    render(
      <ConversationModal 
        conversation={mockConversation}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Topics Discussed')).toBeInTheDocument();
    expect(screen.getByText('account')).toBeInTheDocument();
    expect(screen.getByText('login')).toBeInTheDocument();
    expect(screen.getByText('authentication')).toBeInTheDocument();
  });

  it('displays user intent', () => {
    render(
      <ConversationModal 
        conversation={mockConversation}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('User Intent')).toBeInTheDocument();
    expect(screen.getByText('account_support')).toBeInTheDocument();
  });

  it('displays all messages with correct roles', () => {
    render(
      <ConversationModal 
        conversation={mockConversation}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Hello, I need help with my account')).toBeInTheDocument();
    expect(screen.getByText('Hi there! I\'d be happy to help you with your account. What specific issue are you experiencing?')).toBeInTheDocument();
    expect(screen.getByText('I can\'t log into my account')).toBeInTheDocument();

    // Check for user and assistant labels
    expect(screen.getAllByText('User')).toHaveLength(2);
    expect(screen.getAllByText('Assistant')).toHaveLength(1);
  });

  it('displays user information when available', () => {
    render(
      <ConversationModal 
        conversation={mockConversation}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('User Information')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
  });

  it('handles close button click', () => {
    render(
      <ConversationModal 
        conversation={mockConversation}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('handles X button click', () => {
    render(
      <ConversationModal 
        conversation={mockConversation}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Find the X button (should be the first button in the header)
    const xButton = screen.getAllByRole('button')[0];
    fireEvent.click(xButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('formats timestamps correctly', () => {
    render(
      <ConversationModal 
        conversation={mockConversation}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Check that timestamps are formatted as locale strings
    expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument();
  });

  it('handles conversation without metrics', () => {
    const conversationWithoutMetrics = {
      ...mockConversation,
      metrics: null
    };

    render(
      <ConversationModal 
        conversation={conversationWithoutMetrics}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Conversation Metrics')).not.toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
  });

  it('handles conversation without user info', () => {
    const conversationWithoutUserInfo = {
      ...mockConversation,
      userInfo: null
    };

    render(
      <ConversationModal 
        conversation={conversationWithoutUserInfo}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('User Information')).not.toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
  });

  it('handles conversation without topics', () => {
    const conversationWithoutTopics = {
      ...mockConversation,
      metrics: {
        ...mockConversation.metrics,
        topicsDiscussed: null
      }
    };

    render(
      <ConversationModal 
        conversation={conversationWithoutTopics}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Topics Discussed')).not.toBeInTheDocument();
  });

  it('formats satisfaction score correctly for different values', () => {
    const conversationWithLowSatisfaction = {
      ...mockConversation,
      metrics: {
        ...mockConversation.metrics,
        userSatisfaction: 2.3
      }
    };

    render(
      <ConversationModal 
        conversation={conversationWithLowSatisfaction}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('★★☆☆☆')).toBeInTheDocument();
  });

  it('handles null satisfaction score', () => {
    const conversationWithNullSatisfaction = {
      ...mockConversation,
      metrics: {
        ...mockConversation.metrics,
        userSatisfaction: null
      }
    };

    render(
      <ConversationModal 
        conversation={conversationWithNullSatisfaction}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});