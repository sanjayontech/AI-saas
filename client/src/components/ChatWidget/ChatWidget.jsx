import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, X, MessageCircle, Minimize2 } from 'lucide-react';

const ChatWidget = ({ 
  chatbotId, 
  config = {}, 
  position = 'bottom-right',
  theme = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Default theme configuration
  const defaultTheme = {
    primaryColor: '#3B82F6',
    secondaryColor: '#F3F4F6',
    textColor: '#1F2937',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    ...theme
  };

  // Position styles
  const positionStyles = {
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  };

  useEffect(() => {
    // Fetch widget configuration from server
    const fetchConfig = async () => {
      try {
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
        const response = await fetch(`${serverUrl}/api/v1/widget/${chatbotId}/config`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Update config with server data
            setMessages([{
              id: 'welcome',
              role: 'assistant',
              content: data.data.welcomeMessage || config.welcomeMessage || 'Hello! How can I help you today?',
              timestamp: new Date()
            }]);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch widget config:', error);
      }
    };

    fetchConfig();

    // Initialize socket connection
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    socketRef.current = io(serverUrl, {
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to chat server');
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from chat server');
    });

    socketRef.current.on('chatResponse', (data) => {
      if (data.sessionId === sessionId) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        }]);
        setIsLoading(false);
      }
    });

    socketRef.current.on('error', (error) => {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        isError: true
      }]);
      setIsLoading(false);
    });

    // Welcome message is now set in fetchConfig

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [chatbotId, sessionId, config.welcomeMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !isConnected) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Send message via socket
    socketRef.current.emit('chatMessage', {
      chatbotId,
      sessionId,
      message: inputMessage.trim(),
      timestamp: new Date().toISOString()
    });

    setInputMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleWidget = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
      // Focus input when opening
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div 
      className="fixed z-50 font-sans"
      style={{
        ...positionStyles[position],
        fontFamily: defaultTheme.fontFamily
      }}
    >
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={toggleWidget}
          className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          style={{
            backgroundColor: defaultTheme.primaryColor,
            color: 'white'
          }}
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
          {!isConnected && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="flex flex-col bg-white shadow-2xl border border-gray-200 overflow-hidden"
          style={{
            width: '350px',
            height: isMinimized ? '60px' : '500px',
            borderRadius: defaultTheme.borderRadius,
            backgroundColor: defaultTheme.backgroundColor,
            transition: 'height 0.3s ease-in-out'
          }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 text-white"
            style={{ backgroundColor: defaultTheme.primaryColor }}
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <MessageCircle size={16} />
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  {config.title || 'Chat Support'}
                </h3>
                <p className="text-xs opacity-90">
                  {isConnected ? 'Online' : 'Connecting...'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMinimize}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                aria-label={isMinimized ? 'Expand' : 'Minimize'}
              >
                <Minimize2 size={16} />
              </button>
              <button
                onClick={toggleWidget}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === 'user'
                          ? 'text-white'
                          : message.isError
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'border border-gray-200'
                      }`}
                      style={{
                        backgroundColor: message.role === 'user' 
                          ? defaultTheme.primaryColor 
                          : message.isError 
                          ? undefined 
                          : defaultTheme.secondaryColor,
                        color: message.role === 'user' 
                          ? 'white' 
                          : defaultTheme.textColor
                      }}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-white text-opacity-70' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div 
                      className="px-4 py-2 rounded-lg border border-gray-200"
                      style={{ backgroundColor: defaultTheme.secondaryColor }}
                    >
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex space-x-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={!isConnected || isLoading}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      borderRadius: defaultTheme.borderRadius,
                      fontFamily: defaultTheme.fontFamily
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || !isConnected || isLoading}
                    className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    style={{ 
                      backgroundColor: defaultTheme.primaryColor,
                      borderRadius: defaultTheme.borderRadius
                    }}
                    aria-label="Send message"
                  >
                    <Send size={16} />
                  </button>
                </div>
                
                {!isConnected && (
                  <p className="text-xs text-red-500 mt-2">
                    Connection lost. Trying to reconnect...
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatWidget;