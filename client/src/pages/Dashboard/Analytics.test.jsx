import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Analytics from './Analytics';
import { ChatbotProvider } from '../../contexts/ChatbotContext';
import { AuthProvider } from '../../contexts/AuthContext';
import * as api from '../../utils/api';

// Mock the API
jest.mock('../../utils/api');

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>
}));

const mockChatbot = {
  id: 'chatbot-1',
  name: 'Test Chatbot',
  description: 'Test chatbot description'
};

const mockMetrics = {
  totalConversations: 150,
  totalMessages: 450,
  averageResponseTime: 1200,
  userSatisfactionScore: 4.2,
  totalRatings: 75
};

const mockPerformanceTrends = [
  {
    date: '2024-01-01',
    totalConversations: 10,
    avgResponseTime: 1000,
    userSatisfactionScore: 4.0
  },
  {
    date: '2024-01-02',
    totalConversations: 15,
    avgResponseTime: 1100,
    userSatisfactionScore: 4.2
  }
];

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
        content: 'Hello',
        timestamp: '2024-01-01T10:00:00Z'
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there! How can I help you?',
        timestamp: '2024-01-01T10:00:05Z'
      }
    ],
    metrics: {
      messageCount: 2,
      durationSeconds: 900,
      avgResponseTime: 1000,
      userSatisfaction: 4.5
    }
  }
];

const renderWithProviders = (component, { selectedChatbot = mockChatbot } = {}) => {
  const mockChatbotContext = {
    chatbots: [mockChatbot],
    selectedChatbot,
    loading: false,
    error: null,
    createChatbot: jest.fn(),
    updateChatbot: jest.fn(),
    deleteChatbot: jest.fn(),
    selectChatbot: jest.fn()
  };

  const mockAuthContext = {
    user: { id: 'user-1', email: 'test@example.com' },
    token: 'mock-token',
    login: jest.fn(),
    logout: jest.fn(),
    loading: false
  };

  return render(
    <BrowserRouter>
      <AuthProvider value={mockAuthContext}>
        <ChatbotProvider value={mockChatbotContext}>
          {component}
        </ChatbotProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    api.analyticsAPI = {
      getDashboardMetrics: jest.fn().mockResolvedValue({
        success: true,
        data: { metrics: mockMetrics }
      }),
      getPerformanceInsights: jest.fn().mockResolvedValue({
        success: true,
        data: { performanceTrends: mockPerformanceTrends }
      }),
      getConversationHistory: jest.fn().mockResolvedValue({
        success: true,
        data: {
          conversations: mockConversations,
          pagination: { page: 1, limit: 10, total: 1, pages: 1 }
        }
      }),
      exportAnalyticsData: jest.fn().mockResolvedValue('mock-export-data')
    };
  });

  it('renders analytics page with chatbot selected', async () => {
    renderWithProviders(<Analytics />);

    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Monitor performance for Test Chatbot')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total conversations
      expect(screen.getByText('450')).toBeInTheDocument(); // Total messages
      expect(screen.getByText('1200ms')).toBeInTheDocument(); // Avg response time
      expect(screen.getByText('4.2★')).toBeInTheDocument(); // Satisfaction score
    });
  });

  it('shows no chatbot selected message when no chatbot is selected', () => {
    renderWithProviders(<Analytics />, { selectedChatbot: null });

    expect(screen.getByText('No Chatbot Selected')).toBeInTheDocument();
    expect(screen.getByText('Please select a chatbot from the sidebar to view analytics')).toBeInTheDocument();
  });

  it('handles time range changes', async () => {
    renderWithProviders(<Analytics />);

    const timeRangeSelect = screen.getByDisplayValue('Last 30 days');
    fireEvent.change(timeRangeSelect, { target: { value: '7d' } });

    await waitFor(() => {
      expect(api.analyticsAPI.getDashboardMetrics).toHaveBeenCalledWith(
        mockChatbot.id,
        { period: '7d' }
      );
    });
  });

  it('handles export functionality', async () => {
    // Mock URL.createObjectURL and related functions
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn()
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    renderWithProviders(<Analytics />);

    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(api.analyticsAPI.exportAnalyticsData).toHaveBeenCalledWith(
        mockChatbot.id,
        expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String),
          format: 'json'
        })
      );
    });

    expect(mockLink.click).toHaveBeenCalled();
  });

  it('displays error message when API fails', async () => {
    api.analyticsAPI.getDashboardMetrics.mockRejectedValue(new Error('API Error'));

    renderWithProviders(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('renders charts with data', async () => {
    renderWithProviders(<Analytics />);

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    renderWithProviders(<Analytics />);

    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('renders conversation history section', async () => {
    renderWithProviders(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText('Conversation History')).toBeInTheDocument();
    });
  });

  it('renders real-time monitor section', async () => {
    renderWithProviders(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText('Real-Time Monitor')).toBeInTheDocument();
    });
  });

  it('handles conversation selection', async () => {
    renderWithProviders(<Analytics />);

    await waitFor(() => {
      const conversationElement = screen.getByText('Session: session-1...');
      fireEvent.click(conversationElement);
    });

    // Modal should open (tested separately in ConversationModal tests)
  });
});