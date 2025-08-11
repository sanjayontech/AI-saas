import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chatbots from './Chatbots';
import { ChatbotProvider } from '../../contexts/ChatbotContext';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the chatbot context
const mockChatbotContext = {
  chatbots: [],
  loading: false,
  error: null,
  loadChatbots: jest.fn(),
  createChatbot: jest.fn(),
  updateChatbot: jest.fn(),
  deleteChatbot: jest.fn(),
  getEmbedCode: jest.fn(),
};

jest.mock('../../contexts/ChatbotContext', () => ({
  useChatbot: () => mockChatbotContext,
  ChatbotProvider: ({ children }) => <div>{children}</div>,
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: () => true,
    user: { id: '1', email: 'test@example.com' },
  }),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

// Mock the ChatbotWizard component
jest.mock('../../components/Chatbot/ChatbotWizard', () => {
  return function MockChatbotWizard({ isOpen, onClose, editingChatbot }) {
    if (!isOpen) return null;
    return (
      <div data-testid="chatbot-wizard">
        <h2>{editingChatbot ? 'Edit Chatbot' : 'Create New Chatbot'}</h2>
        <button onClick={onClose}>Close Wizard</button>
      </div>
    );
  };
});

// Mock the ChatbotCard component
jest.mock('../../components/Chatbot/ChatbotCard', () => {
  return function MockChatbotCard({ chatbot, onEdit, onViewAnalytics }) {
    return (
      <div data-testid={`chatbot-card-${chatbot.id}`}>
        <h3>{chatbot.name}</h3>
        <p>{chatbot.description}</p>
        <button onClick={() => onEdit(chatbot)}>Edit</button>
        <button onClick={() => onViewAnalytics(chatbot)}>Analytics</button>
      </div>
    );
  };
});

const mockChatbots = [
  {
    id: '1',
    name: 'Customer Support Bot',
    description: 'Helps customers with common questions',
    personality: 'helpful',
    knowledgeBase: ['FAQ 1', 'FAQ 2'],
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    appearance: { primaryColor: '#4F46E5' },
    settings: { maxTokens: 150 },
  },
  {
    id: '2',
    name: 'Sales Assistant',
    description: 'Assists with product information and sales',
    personality: 'friendly',
    knowledgeBase: ['Product info'],
    isActive: false,
    createdAt: '2024-01-10T10:00:00Z',
    appearance: { primaryColor: '#10B981' },
    settings: { maxTokens: 200 },
  },
  {
    id: '3',
    name: 'Technical Support',
    description: 'Provides technical assistance',
    personality: 'technical',
    knowledgeBase: ['Tech docs'],
    isActive: true,
    createdAt: '2024-01-05T10:00:00Z',
    appearance: { primaryColor: '#F59E0B' },
    settings: { maxTokens: 300 },
  },
];

const renderChatbots = (contextOverrides = {}) => {
  const contextValue = { ...mockChatbotContext, ...contextOverrides };
  
  return render(
    <AuthProvider>
      <ChatbotProvider value={contextValue}>
        <Chatbots />
      </ChatbotProvider>
    </AuthProvider>
  );
};

describe('Chatbots Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading and no chatbots', () => {
      renderChatbots({ loading: true, chatbots: [] });
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('does not show loading spinner when chatbots exist', () => {
      renderChatbots({ loading: true, chatbots: mockChatbots });
      
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no chatbots exist', () => {
      renderChatbots({ chatbots: [] });
      
      expect(screen.getByText('No chatbots yet')).toBeInTheDocument();
      expect(screen.getByText('Get started by creating your first AI chatbot')).toBeInTheDocument();
      expect(screen.getByText('Create Your First Chatbot')).toBeInTheDocument();
    });

    it('opens wizard when Create Your First Chatbot is clicked', async () => {
      const user = userEvent.setup();
      renderChatbots({ chatbots: [] });
      
      await user.click(screen.getByText('Create Your First Chatbot'));
      
      expect(screen.getByTestId('chatbot-wizard')).toBeInTheDocument();
      expect(screen.getByText('Create New Chatbot')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when there is an error', () => {
      renderChatbots({ error: 'Failed to load chatbots' });
      
      expect(screen.getByText('Error loading chatbots')).toBeInTheDocument();
      expect(screen.getByText('Failed to load chatbots')).toBeInTheDocument();
    });

    it('retries loading when retry button is clicked', async () => {
      const user = userEvent.setup();
      const loadChatbots = jest.fn();
      
      renderChatbots({ error: 'Failed to load chatbots', loadChatbots });
      
      await user.click(screen.getByText('Retry'));
      
      expect(loadChatbots).toHaveBeenCalled();
    });
  });

  describe('Chatbots List', () => {
    it('renders all chatbots when they exist', () => {
      renderChatbots({ chatbots: mockChatbots });
      
      expect(screen.getByText('Customer Support Bot')).toBeInTheDocument();
      expect(screen.getByText('Sales Assistant')).toBeInTheDocument();
      expect(screen.getByText('Technical Support')).toBeInTheDocument();
    });

    it('shows correct stats summary', () => {
      renderChatbots({ chatbots: mockChatbots });
      
      expect(screen.getByText('3')).toBeInTheDocument(); // Total
      expect(screen.getByText('2')).toBeInTheDocument(); // Active
      expect(screen.getByText('1')).toBeInTheDocument(); // Inactive
    });
  });

  describe('Search and Filter', () => {
    it('filters chatbots by search term', async () => {
      const user = userEvent.setup();
      renderChatbots({ chatbots: mockChatbots });
      
      const searchInput = screen.getByPlaceholderText('Search chatbots...');
      await user.type(searchInput, 'Customer');
      
      expect(screen.getByText('Customer Support Bot')).toBeInTheDocument();
      expect(screen.queryByText('Sales Assistant')).not.toBeInTheDocument();
      expect(screen.queryByText('Technical Support')).not.toBeInTheDocument();
    });

    it('filters chatbots by status', async () => {
      const user = userEvent.setup();
      renderChatbots({ chatbots: mockChatbots });
      
      const filterSelect = screen.getByDisplayValue('All Chatbots');
      await user.selectOptions(filterSelect, 'active');
      
      expect(screen.getByText('Customer Support Bot')).toBeInTheDocument();
      expect(screen.queryByText('Sales Assistant')).not.toBeInTheDocument();
      expect(screen.getByText('Technical Support')).toBeInTheDocument();
    });

    it('shows no results message when search yields no results', async () => {
      const user = userEvent.setup();
      renderChatbots({ chatbots: mockChatbots });
      
      const searchInput = screen.getByPlaceholderText('Search chatbots...');
      await user.type(searchInput, 'NonexistentBot');
      
      expect(screen.getByText('No chatbots found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filter criteria')).toBeInTheDocument();
    });

    it('clears filters when Clear Filters is clicked', async () => {
      const user = userEvent.setup();
      renderChatbots({ chatbots: mockChatbots });
      
      // Apply filters
      const searchInput = screen.getByPlaceholderText('Search chatbots...');
      await user.type(searchInput, 'NonexistentBot');
      
      // Clear filters
      await user.click(screen.getByText('Clear Filters'));
      
      expect(searchInput).toHaveValue('');
      expect(screen.getByDisplayValue('All Chatbots')).toBeInTheDocument();
    });
  });

  describe('View Mode Toggle', () => {
    it('switches between grid and list view modes', async () => {
      const user = userEvent.setup();
      renderChatbots({ chatbots: mockChatbots });
      
      // Should start in grid mode
      const gridButton = screen.getByRole('button', { name: /grid view/i });
      const listButton = screen.getByRole('button', { name: /list view/i });
      
      expect(gridButton).toHaveClass('bg-indigo-100');
      
      // Switch to list mode
      await user.click(listButton);
      
      expect(listButton).toHaveClass('bg-indigo-100');
      expect(gridButton).not.toHaveClass('bg-indigo-100');
    });
  });

  describe('Create Chatbot', () => {
    it('opens wizard when Create Chatbot button is clicked', async () => {
      const user = userEvent.setup();
      renderChatbots({ chatbots: mockChatbots });
      
      await user.click(screen.getByText('Create Chatbot'));
      
      expect(screen.getByTestId('chatbot-wizard')).toBeInTheDocument();
      expect(screen.getByText('Create New Chatbot')).toBeInTheDocument();
    });

    it('closes wizard when close button is clicked', async () => {
      const user = userEvent.setup();
      renderChatbots({ chatbots: mockChatbots });
      
      // Open wizard
      await user.click(screen.getByText('Create Chatbot'));
      expect(screen.getByTestId('chatbot-wizard')).toBeInTheDocument();
      
      // Close wizard
      await user.click(screen.getByText('Close Wizard'));
      expect(screen.queryByTestId('chatbot-wizard')).not.toBeInTheDocument();
    });
  });

  describe('Edit Chatbot', () => {
    it('opens wizard in edit mode when edit is clicked', async () => {
      const user = userEvent.setup();
      renderChatbots({ chatbots: mockChatbots });
      
      await user.click(screen.getAllByText('Edit')[0]);
      
      expect(screen.getByTestId('chatbot-wizard')).toBeInTheDocument();
      expect(screen.getByText('Edit Chatbot')).toBeInTheDocument();
    });
  });

  describe('View Analytics', () => {
    it('handles analytics view when analytics button is clicked', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      renderChatbots({ chatbots: mockChatbots });
      
      await user.click(screen.getAllByText('Analytics')[0]);
      
      expect(consoleSpy).toHaveBeenCalledWith('View analytics for:', 'Customer Support Bot');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Page Header', () => {
    it('renders correct page title and description', () => {
      renderChatbots({ chatbots: mockChatbots });
      
      expect(screen.getByText('Chatbots')).toBeInTheDocument();
      expect(screen.getByText('Create and manage your AI chatbots')).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('loads chatbots on component mount', () => {
      const loadChatbots = jest.fn();
      renderChatbots({ loadChatbots });
      
      expect(loadChatbots).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('renders responsive layout classes', () => {
      renderChatbots({ chatbots: mockChatbots });
      
      // Check for responsive grid classes
      const gridContainer = screen.getByText('Customer Support Bot').closest('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
    });
  });
});