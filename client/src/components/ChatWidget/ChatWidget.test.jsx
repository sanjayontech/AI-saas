import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatWidget from './ChatWidget';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn()
  }))
}));

describe('ChatWidget', () => {
  const defaultProps = {
    chatbotId: 'test-chatbot-1',
    config: {
      title: 'Test Chat',
      welcomeMessage: 'Hello! How can I help you?'
    },
    position: 'bottom-right',
    theme: {
      primaryColor: '#3B82F6',
      secondaryColor: '#F3F4F6',
      textColor: '#1F2937',
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders chat button when closed', () => {
    render(<ChatWidget {...defaultProps} />);
    
    const chatButton = screen.getByLabelText('Open chat');
    expect(chatButton).toBeInTheDocument();
  });

  test('opens chat window when button is clicked', () => {
    render(<ChatWidget {...defaultProps} />);
    
    const chatButton = screen.getByLabelText('Open chat');
    fireEvent.click(chatButton);
    
    expect(screen.getByText('Test Chat')).toBeInTheDocument();
    expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
  });

  test('displays welcome message', () => {
    render(<ChatWidget {...defaultProps} />);
    
    const chatButton = screen.getByLabelText('Open chat');
    fireEvent.click(chatButton);
    
    expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
  });

  test('allows typing and sending messages', async () => {
    render(<ChatWidget {...defaultProps} />);
    
    const chatButton = screen.getByLabelText('Open chat');
    fireEvent.click(chatButton);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByLabelText('Send message');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    expect(input.value).toBe('Test message');
    
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  test('closes chat window when close button is clicked', () => {
    render(<ChatWidget {...defaultProps} />);
    
    // Open chat
    const chatButton = screen.getByLabelText('Open chat');
    fireEvent.click(chatButton);
    
    // Close chat
    const closeButton = screen.getByLabelText('Close chat');
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('Test Chat')).not.toBeInTheDocument();
  });

  test('minimizes and expands chat window', () => {
    render(<ChatWidget {...defaultProps} />);
    
    // Open chat
    const chatButton = screen.getByLabelText('Open chat');
    fireEvent.click(chatButton);
    
    // Minimize chat
    const minimizeButton = screen.getByLabelText('Minimize');
    fireEvent.click(minimizeButton);
    
    // Check if input is not visible (minimized)
    expect(screen.queryByPlaceholderText('Type your message...')).not.toBeInTheDocument();
    
    // Expand chat
    const expandButton = screen.getByLabelText('Expand');
    fireEvent.click(expandButton);
    
    // Check if input is visible again
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
  });

  test('applies custom theme colors', () => {
    const customTheme = {
      primaryColor: '#FF0000',
      secondaryColor: '#00FF00',
      textColor: '#0000FF',
      backgroundColor: '#FFFF00',
      borderRadius: '8px',
      fontFamily: 'Arial, sans-serif'
    };

    render(<ChatWidget {...defaultProps} theme={customTheme} />);
    
    const chatButton = screen.getByLabelText('Open chat');
    expect(chatButton).toHaveStyle({ backgroundColor: '#FF0000' });
  });

  test('handles different positions', () => {
    const { rerender } = render(<ChatWidget {...defaultProps} position="bottom-left" />);
    
    let container = screen.getByLabelText('Open chat').closest('div');
    expect(container).toHaveStyle({ left: '20px', bottom: '20px' });
    
    rerender(<ChatWidget {...defaultProps} position="center" />);
    
    container = screen.getByLabelText('Open chat').closest('div');
    expect(container).toHaveStyle({ 
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)' 
    });
  });

  test('sends message on Enter key press', async () => {
    render(<ChatWidget {...defaultProps} />);
    
    const chatButton = screen.getByLabelText('Open chat');
    fireEvent.click(chatButton);
    
    const input = screen.getByPlaceholderText('Type your message...');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
    
    expect(input.value).toBe('');
  });

  test('does not send empty messages', () => {
    render(<ChatWidget {...defaultProps} />);
    
    const chatButton = screen.getByLabelText('Open chat');
    fireEvent.click(chatButton);
    
    const sendButton = screen.getByLabelText('Send message');
    
    // Try to send empty message
    fireEvent.click(sendButton);
    
    // Should only have welcome message
    const messages = screen.getAllByText(/Hello! How can I help you?/);
    expect(messages).toHaveLength(1);
  });
});