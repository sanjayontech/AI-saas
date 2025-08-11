import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatbotWizard from './ChatbotWizard';
import { ChatbotProvider } from '../../contexts/ChatbotContext';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the chatbot context
const mockChatbotContext = {
  createChatbot: jest.fn(),
  updateChatbot: jest.fn(),
  loading: false,
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

const renderChatbotWizard = (props = {}) => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    editingChatbot: null,
    ...props,
  };

  return render(
    <AuthProvider>
      <ChatbotProvider>
        <ChatbotWizard {...defaultProps} />
      </ChatbotProvider>
    </AuthProvider>
  );
};

describe('ChatbotWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the wizard when open', () => {
      renderChatbotWizard();
      
      expect(screen.getByText('Create New Chatbot')).toBeInTheDocument();
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      renderChatbotWizard({ isOpen: false });
      
      expect(screen.queryByText('Create New Chatbot')).not.toBeInTheDocument();
    });

    it('renders edit mode when editing chatbot', () => {
      const editingChatbot = {
        id: '1',
        name: 'Test Bot',
        description: 'Test Description',
        personality: 'helpful',
        knowledgeBase: ['item1', 'item2'],
        appearance: {
          primaryColor: '#4F46E5',
          secondaryColor: '#F3F4F6',
          fontFamily: 'Inter',
          borderRadius: 8,
          position: 'bottom-right',
          avatar: '',
        },
        settings: {
          maxTokens: 150,
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'Sorry, I did not understand.',
          collectUserInfo: false,
        },
      };

      renderChatbotWizard({ editingChatbot });
      
      expect(screen.getByText('Edit Chatbot')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Bot')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('shows all wizard steps', () => {
      renderChatbotWizard();
      
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Personality & Behavior')).toBeInTheDocument();
      expect(screen.getByText('Appearance & Branding')).toBeInTheDocument();
      expect(screen.getByText('Preview & Deploy')).toBeInTheDocument();
    });

    it('navigates to next step when Next button is clicked', async () => {
      const user = userEvent.setup();
      renderChatbotWizard();
      
      // Fill required fields
      await user.type(screen.getByLabelText('Chatbot Name'), 'Test Bot');
      await user.type(screen.getByLabelText('Description'), 'Test Description');
      
      // Click Next
      await user.click(screen.getByText('Next'));
      
      expect(screen.getByText('Personality Type')).toBeInTheDocument();
    });

    it('navigates to previous step when Previous button is clicked', async () => {
      const user = userEvent.setup();
      renderChatbotWizard();
      
      // Fill required fields and go to step 2
      await user.type(screen.getByLabelText('Chatbot Name'), 'Test Bot');
      await user.type(screen.getByLabelText('Description'), 'Test Description');
      await user.click(screen.getByText('Next'));
      
      // Go back to step 1
      await user.click(screen.getByText('Previous'));
      
      expect(screen.getByLabelText('Chatbot Name')).toBeInTheDocument();
    });

    it('disables Previous button on first step', () => {
      renderChatbotWizard();
      
      expect(screen.getByText('Previous')).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for required fields', async () => {
      const user = userEvent.setup();
      renderChatbotWizard();
      
      // Try to go to next step without filling required fields
      await user.click(screen.getByText('Next'));
      
      expect(screen.getByText('Chatbot name is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });

    it('clears validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      renderChatbotWizard();
      
      // Trigger validation error
      await user.click(screen.getByText('Next'));
      expect(screen.getByText('Chatbot name is required')).toBeInTheDocument();
      
      // Start typing to clear error
      await user.type(screen.getByLabelText('Chatbot Name'), 'Test');
      expect(screen.queryByText('Chatbot name is required')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('creates new chatbot when form is submitted', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      mockChatbotContext.createChatbot.mockResolvedValue({ success: true });
      
      renderChatbotWizard({ onClose });
      
      // Fill out the form
      await user.type(screen.getByLabelText('Chatbot Name'), 'Test Bot');
      await user.type(screen.getByLabelText('Description'), 'Test Description');
      
      // Navigate through all steps
      await user.click(screen.getByText('Next')); // Step 2
      await user.click(screen.getByText('Next')); // Step 3
      await user.click(screen.getByText('Next')); // Step 4
      
      // Submit
      await user.click(screen.getByText('Create Chatbot'));
      
      await waitFor(() => {
        expect(mockChatbotContext.createChatbot).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Bot',
            description: 'Test Description',
          })
        );
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('updates existing chatbot when editing', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      const editingChatbot = {
        id: '1',
        name: 'Existing Bot',
        description: 'Existing Description',
        personality: 'helpful',
        knowledgeBase: [],
        appearance: {
          primaryColor: '#4F46E5',
          secondaryColor: '#F3F4F6',
          fontFamily: 'Inter',
          borderRadius: 8,
          position: 'bottom-right',
          avatar: '',
        },
        settings: {
          maxTokens: 150,
          temperature: 0.7,
          responseDelay: 1000,
          fallbackMessage: 'Sorry, I did not understand.',
          collectUserInfo: false,
        },
      };
      
      mockChatbotContext.updateChatbot.mockResolvedValue({ success: true });
      
      renderChatbotWizard({ onClose, editingChatbot });
      
      // Navigate to final step
      await user.click(screen.getByText('Next')); // Step 2
      await user.click(screen.getByText('Next')); // Step 3
      await user.click(screen.getByText('Next')); // Step 4
      
      // Submit
      await user.click(screen.getByText('Update Chatbot'));
      
      await waitFor(() => {
        expect(mockChatbotContext.updateChatbot).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            name: 'Existing Bot',
            description: 'Existing Description',
          })
        );
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Appearance Customization', () => {
    it('updates appearance settings', async () => {
      const user = userEvent.setup();
      renderChatbotWizard();
      
      // Navigate to appearance step
      await user.type(screen.getByLabelText('Chatbot Name'), 'Test Bot');
      await user.type(screen.getByLabelText('Description'), 'Test Description');
      await user.click(screen.getByText('Next')); // Step 2
      await user.click(screen.getByText('Next')); // Step 3
      
      // Update primary color
      const colorInput = screen.getByDisplayValue('#4F46E5');
      await user.clear(colorInput);
      await user.type(colorInput, '#FF0000');
      
      // Update font family
      await user.selectOptions(screen.getByLabelText('Font Family'), 'Roboto');
      
      expect(colorInput).toHaveValue('#FF0000');
      expect(screen.getByDisplayValue('Roboto')).toBeInTheDocument();
    });

    it('shows live preview of appearance changes', async () => {
      const user = userEvent.setup();
      renderChatbotWizard();
      
      // Navigate to appearance step
      await user.type(screen.getByLabelText('Chatbot Name'), 'Test Bot');
      await user.type(screen.getByLabelText('Description'), 'Test Description');
      await user.click(screen.getByText('Next')); // Step 2
      await user.click(screen.getByText('Next')); // Step 3
      
      // Check that preview exists
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });
  });

  describe('Knowledge Base', () => {
    it('handles knowledge base input', async () => {
      const user = userEvent.setup();
      renderChatbotWizard();
      
      // Navigate to personality step
      await user.type(screen.getByLabelText('Chatbot Name'), 'Test Bot');
      await user.type(screen.getByLabelText('Description'), 'Test Description');
      await user.click(screen.getByText('Next')); // Step 2
      
      // Add knowledge base content
      const knowledgeTextarea = screen.getByLabelText('Knowledge Base');
      await user.type(knowledgeTextarea, 'FAQ item 1\nFAQ item 2\nFAQ item 3');
      
      expect(knowledgeTextarea).toHaveValue('FAQ item 1\nFAQ item 2\nFAQ item 3');
    });
  });

  describe('Close Functionality', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      renderChatbotWizard({ onClose });
      
      await user.click(screen.getByRole('button', { name: /close/i }));
      
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      renderChatbotWizard({ onClose });
      
      await user.click(screen.getByText('Cancel'));
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      mockChatbotContext.loading = true;
      
      renderChatbotWizard();
      
      // Navigate to final step
      await user.type(screen.getByLabelText('Chatbot Name'), 'Test Bot');
      await user.type(screen.getByLabelText('Description'), 'Test Description');
      await user.click(screen.getByText('Next')); // Step 2
      await user.click(screen.getByText('Next')); // Step 3
      await user.click(screen.getByText('Next')); // Step 4
      
      // Check loading state
      expect(screen.getByText('Create Chatbot')).toBeDisabled();
    });
  });
});