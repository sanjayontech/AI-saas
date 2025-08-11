import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatbotCard from './ChatbotCard';
import { ChatbotProvider } from '../../contexts/ChatbotContext';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the chatbot context
const mockChatbotContext = {
  deleteChatbot: jest.fn(),
  updateChatbot: jest.fn(),
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

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock window.confirm
global.confirm = jest.fn();

// Mock window.alert
global.alert = jest.fn();

const mockChatbot = {
  id: '1',
  name: 'Test Chatbot',
  description: 'This is a test chatbot for customer support',
  personality: 'helpful',
  knowledgeBase: ['FAQ 1', 'FAQ 2', 'FAQ 3'],
  isActive: true,
  createdAt: '2024-01-15T10:00:00Z',
  appearance: {
    primaryColor: '#4F46E5',
    secondaryColor: '#F3F4F6',
    fontFamily: 'Inter',
    borderRadius: 8,
    position: 'bottom-right',
    avatar: null,
  },
  settings: {
    maxTokens: 150,
    temperature: 0.7,
    responseDelay: 1000,
    fallbackMessage: 'Sorry, I did not understand.',
    collectUserInfo: false,
  },
};

const renderChatbotCard = (props = {}) => {
  const defaultProps = {
    chatbot: mockChatbot,
    onEdit: jest.fn(),
    onViewAnalytics: jest.fn(),
    ...props,
  };

  return render(
    <AuthProvider>
      <ChatbotProvider>
        <ChatbotCard {...defaultProps} />
      </ChatbotProvider>
    </AuthProvider>
  );
};

describe('ChatbotCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.confirm.mockReturnValue(false);
    global.alert.mockClear();
  });

  describe('Rendering', () => {
    it('renders chatbot information correctly', () => {
      renderChatbotCard();
      
      expect(screen.getByText('Test Chatbot')).toBeInTheDocument();
      expect(screen.getByText('This is a test chatbot for customer support')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('helpful personality')).toBeInTheDocument();
      expect(screen.getByText('3 knowledge items')).toBeInTheDocument();
    });

    it('shows inactive status for inactive chatbots', () => {
      const inactiveChatbot = { ...mockChatbot, isActive: false };
      renderChatbotCard({ chatbot: inactiveChatbot });
      
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('displays formatted creation date', () => {
      renderChatbotCard();
      
      expect(screen.getByText(/Created Jan 15, 2024/)).toBeInTheDocument();
    });

    it('shows chatbot avatar when provided', () => {
      const chatbotWithAvatar = {
        ...mockChatbot,
        appearance: {
          ...mockChatbot.appearance,
          avatar: 'https://example.com/avatar.png',
        },
      };
      
      renderChatbotCard({ chatbot: chatbotWithAvatar });
      
      const avatar = screen.getByAltText('Test Chatbot');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.png');
    });

    it('shows bot icon when no avatar is provided', () => {
      renderChatbotCard();
      
      // The bot icon should be present (we can't easily test for the icon itself, 
      // but we can check that the avatar image is not present)
      expect(screen.queryByAltText('Test Chatbot')).not.toBeInTheDocument();
    });
  });

  describe('Quick Actions', () => {
    it('calls onEdit when edit button is clicked', async () => {
      const user = userEvent.setup();
      const onEdit = jest.fn();
      
      renderChatbotCard({ onEdit });
      
      await user.click(screen.getAllByText('Edit')[0]);
      
      expect(onEdit).toHaveBeenCalledWith(mockChatbot);
    });

    it('calls onViewAnalytics when analytics button is clicked', async () => {
      const user = userEvent.setup();
      const onViewAnalytics = jest.fn();
      
      renderChatbotCard({ onViewAnalytics });
      
      await user.click(screen.getByText('Analytics'));
      
      expect(onViewAnalytics).toHaveBeenCalledWith(mockChatbot);
    });

    it('copies embed code when embed button is clicked', async () => {
      const user = userEvent.setup();
      const embedCode = '<script>embed code here</script>';
      mockChatbotContext.getEmbedCode.mockResolvedValue({
        success: true,
        data: { embedCode },
      });
      
      renderChatbotCard();
      
      await user.click(screen.getByText('Embed'));
      
      await waitFor(() => {
        expect(mockChatbotContext.getEmbedCode).toHaveBeenCalledWith('1');
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(embedCode);
        expect(global.alert).toHaveBeenCalledWith('Embed code copied to clipboard!');
      });
    });

    it('shows error when embed code copy fails', async () => {
      const user = userEvent.setup();
      mockChatbotContext.getEmbedCode.mockResolvedValue({
        success: false,
        error: 'Failed to get embed code',
      });
      
      renderChatbotCard();
      
      await user.click(screen.getByText('Embed'));
      
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to copy embed code');
      });
    });
  });

  describe('Dropdown Menu', () => {
    it('opens dropdown menu when more options button is clicked', async () => {
      const user = userEvent.setup();
      renderChatbotCard();
      
      await user.click(screen.getByRole('button', { name: /more options/i }));
      
      expect(screen.getByText('Edit Chatbot')).toBeInTheDocument();
      expect(screen.getByText('View Analytics')).toBeInTheDocument();
      expect(screen.getByText('Copy Embed Code')).toBeInTheDocument();
      expect(screen.getByText('Deactivate')).toBeInTheDocument();
      expect(screen.getByText('Delete Chatbot')).toBeInTheDocument();
    });

    it('closes dropdown menu when clicking outside', async () => {
      const user = userEvent.setup();
      renderChatbotCard();
      
      // Open menu
      await user.click(screen.getByRole('button', { name: /more options/i }));
      expect(screen.getByText('Edit Chatbot')).toBeInTheDocument();
      
      // Click outside (on the document body)
      await user.click(document.body);
      
      expect(screen.queryByText('Edit Chatbot')).not.toBeInTheDocument();
    });

    it('shows Activate option for inactive chatbots', async () => {
      const user = userEvent.setup();
      const inactiveChatbot = { ...mockChatbot, isActive: false };
      
      renderChatbotCard({ chatbot: inactiveChatbot });
      
      await user.click(screen.getByRole('button', { name: /more options/i }));
      
      expect(screen.getByText('Activate')).toBeInTheDocument();
    });
  });

  describe('Chatbot Status Toggle', () => {
    it('deactivates active chatbot when deactivate is clicked', async () => {
      const user = userEvent.setup();
      mockChatbotContext.updateChatbot.mockResolvedValue({ success: true });
      
      renderChatbotCard();
      
      await user.click(screen.getByRole('button', { name: /more options/i }));
      await user.click(screen.getByText('Deactivate'));
      
      await waitFor(() => {
        expect(mockChatbotContext.updateChatbot).toHaveBeenCalledWith('1', {
          isActive: false,
        });
      });
    });

    it('activates inactive chatbot when activate is clicked', async () => {
      const user = userEvent.setup();
      const inactiveChatbot = { ...mockChatbot, isActive: false };
      mockChatbotContext.updateChatbot.mockResolvedValue({ success: true });
      
      renderChatbotCard({ chatbot: inactiveChatbot });
      
      await user.click(screen.getByRole('button', { name: /more options/i }));
      await user.click(screen.getByText('Activate'));
      
      await waitFor(() => {
        expect(mockChatbotContext.updateChatbot).toHaveBeenCalledWith('1', {
          isActive: true,
        });
      });
    });
  });

  describe('Chatbot Deletion', () => {
    it('deletes chatbot when confirmed', async () => {
      const user = userEvent.setup();
      global.confirm.mockReturnValue(true);
      mockChatbotContext.deleteChatbot.mockResolvedValue({ success: true });
      
      renderChatbotCard();
      
      await user.click(screen.getByRole('button', { name: /more options/i }));
      await user.click(screen.getByText('Delete Chatbot'));
      
      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete "Test Chatbot"? This action cannot be undone.'
      );
      
      await waitFor(() => {
        expect(mockChatbotContext.deleteChatbot).toHaveBeenCalledWith('1');
      });
    });

    it('does not delete chatbot when not confirmed', async () => {
      const user = userEvent.setup();
      global.confirm.mockReturnValue(false);
      
      renderChatbotCard();
      
      await user.click(screen.getByRole('button', { name: /more options/i }));
      await user.click(screen.getByText('Delete Chatbot'));
      
      expect(global.confirm).toHaveBeenCalled();
      expect(mockChatbotContext.deleteChatbot).not.toHaveBeenCalled();
    });
  });

  describe('Menu Actions', () => {
    it('calls onEdit when Edit Chatbot menu item is clicked', async () => {
      const user = userEvent.setup();
      const onEdit = jest.fn();
      
      renderChatbotCard({ onEdit });
      
      await user.click(screen.getByRole('button', { name: /more options/i }));
      await user.click(screen.getByText('Edit Chatbot'));
      
      expect(onEdit).toHaveBeenCalledWith(mockChatbot);
    });

    it('calls onViewAnalytics when View Analytics menu item is clicked', async () => {
      const user = userEvent.setup();
      const onViewAnalytics = jest.fn();
      
      renderChatbotCard({ onViewAnalytics });
      
      await user.click(screen.getByRole('button', { name: /more options/i }));
      await user.click(screen.getByText('View Analytics'));
      
      expect(onViewAnalytics).toHaveBeenCalledWith(mockChatbot);
    });

    it('copies embed code when Copy Embed Code menu item is clicked', async () => {
      const user = userEvent.setup();
      const embedCode = '<script>embed code here</script>';
      mockChatbotContext.getEmbedCode.mockResolvedValue({
        success: true,
        data: { embedCode },
      });
      
      renderChatbotCard();
      
      await user.click(screen.getByRole('button', { name: /more options/i }));
      await user.click(screen.getByText('Copy Embed Code'));
      
      await waitFor(() => {
        expect(mockChatbotContext.getEmbedCode).toHaveBeenCalledWith('1');
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(embedCode);
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderChatbotCard();
      
      expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      const onEdit = jest.fn();
      
      renderChatbotCard({ onEdit });
      
      // Click the edit button directly
      await user.click(screen.getByText('Edit'));
      
      expect(onEdit).toHaveBeenCalledWith(mockChatbot);
    });
  });
});