import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConversationHistory from './ConversationHistory';
import * as api from '../../utils/api';

// Mock the API
jest.mock('../../utils/api');

const mockConversations = [
  {
    id: 'conv-1',
    sessionId: 'session-123',
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
        content: 'Hi there! I\'d be happy to help you with your account.',
        timestamp: '2024-01-01T10:00:05Z'
      }
    ],
    metrics: {
      messageCount: 2,
      durationSeconds: 900,
      avgResponseTime: 1000,
      userSatisfaction: 4.5,
      goalAchieved: true
    }
  },
  {
    id: 'conv-2',
    sessionId: 'session-456',
    startedAt: '2024-01-01T11:00:00Z',
    endedAt: '2024-01-01T11:10:00Z',
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        content: 'What are your business hours?',
        timestamp: '2024-01-01T11:00:00Z'
      }
    ],
    metrics: {
      messageCount: 1,
      durationSeconds: 600,
      avgResponseTime: 800,
      userSatisfaction: 3.0,
      goalAchieved: false
    }
  }
];

const mockPagination = {
  page: 1,
  limit: 10,
  total: 2,
  pages: 1
};

describe('ConversationHistory', () => {
  const mockOnConversationSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    api.analyticsAPI = {
      getConversationHistory: jest.fn().mockResolvedValue({
        success: true,
        data: {
          conversations: mockConversations,
          pagination: mockPagination
        }
      })
    };
  });

  it('renders conversation history with data', async () => {
    render(
      <ConversationHistory 
        chatbotId="chatbot-1" 
        onConversationSelect={mockOnConversationSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Conversation History')).toBeInTheDocument();
      expect(screen.getByText('Session: session-1...')).toBeInTheDocument();
      expect(screen.getByText('Session: session-4...')).toBeInTheDocument();
    });

    // Check conversation details
    expect(screen.getByText('User: Hello, I need help with my account')).toBeInTheDocument();
    expect(screen.getByText('2 messages')).toBeInTheDocument();
    expect(screen.getByText('Duration: 15m 0s')).toBeInTheDocument();
    expect(screen.getByText('Avg Response: 1000ms')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(
      <ConversationHistory 
        chatbotId="chatbot-1" 
        onConversationSelect={mockOnConversationSelect}
      />
    );

    expect(screen.getByRole('generic', { name: /loading/i })).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    render(
      <ConversationHistory 
        chatbotId="chatbot-1" 
        onConversationSelect={mockOnConversationSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search conversations...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search conversations...');
    const searchButton = screen.getByText('Search');

    fireEvent.change(searchInput, { target: { value: 'account' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(api.analyticsAPI.getConversationHistory).toHaveBeenCalledWith(
        'chatbot-1',
        expect.objectContaining({
          search: 'account'
        })
      );
    });
  });

  it('toggles filters visibility', async () => {
    render(
      <ConversationHistory 
        chatbotId="chatbot-1" 
        onConversationSelect={mockOnConversationSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Min Satisfaction')).toBeInTheDocument();
  });

  it('handles filter changes', async () => {
    render(
      <ConversationHistory 
        chatbotId="chatbot-1" 
        onConversationSelect={mockOnConversationSelect}
      />
    );

    await waitFor(() => {
      const filtersButton = screen.getByText('Filters');
      fireEvent.click(filtersButton);
    });

    const startDateInput = screen.getByLabelText('Start Date');
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

    await waitFor(() => {
      expect(api.analyticsAPI.getConversationHistory).toHaveBeenCalledWith(
        'chatbot-1',
        expect.objectContaining({
          startDate: '2024-01-01'
        })
      );
    });
  });

  it('handles conversation selection', async () => {
    render(
      <ConversationHistory 
        chatbotId="chatbot-1" 
        onConversationSelect={mockOnConversationSelect}
      />
    );

    await waitFor(() => {
      const conversationElement = screen.getByText('Session: session-1...');
      // Click on the conversation container
      fireEvent.click(conversationElement.closest('.cursor-pointer') || conversationElement.parentElement);
    });

    expect(mockOnConversationSelect).toHaveBeenCalledWith(mockConversations[0]);
  });

  it('handles pagination', async () => {
    const mockPaginationMultiPage = {
      page: 1,
      limit: 10,
      total: 25,
      pages: 3
    };

    api.analyticsAPI.getConversationHistory.mockResolvedValue({
      success: true,
      data: {
        conversations: mockConversations,
        pagination: mockPaginationMultiPage
      }
    });

    render(
      <ConversationHistory 
        chatbotId="chatbot-1" 
        onConversationSelect={mockOnConversationSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('Showing 1 to 10 of 25 conversations')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(api.analyticsAPI.getConversationHistory).toHaveBeenCalledWith(
        'chatbot-1',
        expect.objectContaining({
          page: 2
        })
      );
    });
  });

  it('shows no conversations message when empty', async () => {
    api.analyticsAPI.getConversationHistory.mockResolvedValue({
      success: true,
      data: {
        conversations: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      }
    });

    render(
      <ConversationHistory 
        chatbotId="chatbot-1" 
        onConversationSelect={mockOnConversationSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No conversations found')).toBeInTheDocument();
      expect(screen.getByText('Conversations will appear here once users start chatting')).toBeInTheDocument();
    });
  });

  it('handles API errors', async () => {
    api.analyticsAPI.getConversationHistory.mockRejectedValue(new Error('API Error'));

    render(
      <ConversationHistory 
        chatbotId="chatbot-1" 
        onConversationSelect={mockOnConversationSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('formats satisfaction scores correctly', async () => {
    render(
      <ConversationHistory 
        chatbotId="chatbot-1" 
        onConversationSelect={mockOnConversationSelect}
      />
    );

    await waitFor(() => {
      // Should show 4.5 stars as ★★★★☆
      expect(screen.getByText('★★★★☆')).toBeInTheDocument();
      // Should show 3.0 stars as ★★★☆☆
      expect(screen.getByText('★★★☆☆')).toBeInTheDocument();
    });
  });

  it('shows goal achieved badge', async () => {
    render(
      <ConversationHistory 
        chatbotId="chatbot-1" 
        onConversationSelect={mockOnConversationSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Goal Achieved')).toBeInTheDocument();
    });
  });
});