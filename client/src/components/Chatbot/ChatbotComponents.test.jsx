import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatbotCard from './ChatbotCard';
import { ChatbotProvider } from '../../contexts/ChatbotContext';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the contexts
jest.mock('../../contexts/ChatbotContext', () => ({
  useChatbot: () => ({
    createChatbot: jest.fn(),
    updateChatbot: jest.fn(),
    deleteChatbot: jest.fn(),
    getEmbedCode: jest.fn(),
    loading: false,
  }),
  ChatbotProvider: ({ children }) => <div>{children}</div>,
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: () => true,
    user: { id: '1', email: 'test@example.com' },
  }),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

const mockChatbot = {
  id: '1',
  name: 'Test Chatbot',
  description: 'Test Description',
  personality: 'helpful',
  knowledgeBase: ['FAQ 1', 'FAQ 2'],
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

describe('Chatbot Components Integration', () => {
  it('renders ChatbotCard without crashing', () => {
    render(
      <AuthProvider>
        <ChatbotProvider>
          <ChatbotCard
            chatbot={mockChatbot}
            onEdit={jest.fn()}
            onViewAnalytics={jest.fn()}
          />
        </ChatbotProvider>
      </AuthProvider>
    );
    
    expect(screen.getByText('Test Chatbot')).toBeInTheDocument();
  });

  it('can import ChatbotCard successfully', () => {
    expect(ChatbotCard).toBeDefined();
  });
});