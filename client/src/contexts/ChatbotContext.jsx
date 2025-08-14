import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { chatbotAPI } from '../utils/api';
import { useAuth } from './AuthContext';

const ChatbotContext = createContext();

export const useChatbot = () => {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
};

export const ChatbotProvider = ({ children }) => {
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbot, setSelectedChatbot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  const loadChatbots = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await chatbotAPI.getAll();
      const chatbotData = response.data?.chatbots || [];
      setChatbots(chatbotData);
      
      // Auto-select first chatbot if none selected
      if (chatbotData.length > 0 && !selectedChatbot) {
        setSelectedChatbot(chatbotData[0]);
      }
    } catch (err) {
      setError(err.message);
      setChatbots([]); // Ensure chatbots is always an array
    } finally {
      setLoading(false);
    }
  }, [selectedChatbot]);

  // Load chatbots when authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      loadChatbots();
    }
  }, [isAuthenticated, loadChatbots]);

  const createChatbot = async (chatbotData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await chatbotAPI.create(chatbotData);
      const newChatbot = response.data;
      setChatbots(prev => [...prev, newChatbot]);
      return { success: true, data: newChatbot };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateChatbot = async (id, chatbotData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await chatbotAPI.update(id, chatbotData);
      const updatedChatbot = response.data;
      setChatbots(prev => prev.map(bot => 
        bot.id === id ? updatedChatbot : bot
      ));
      return { success: true, data: updatedChatbot };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteChatbot = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await chatbotAPI.delete(id);
      setChatbots(prev => prev.filter(bot => bot.id !== id));
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const testChatbot = async (id, message, context = {}) => {
    try {
      const response = await chatbotAPI.testMessage(id, message, context);
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const getChatbotAnalytics = async (id, timeRange = '7d') => {
    try {
      const response = await chatbotAPI.getAnalytics(id, timeRange);
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const getEmbedCode = async (id) => {
    try {
      const response = await chatbotAPI.getEmbedCode(id);
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const value = {
    chatbots,
    selectedChatbot,
    setSelectedChatbot,
    loading,
    error,
    loadChatbots,
    createChatbot,
    updateChatbot,
    deleteChatbot,
    testChatbot,
    getChatbotAnalytics,
    getEmbedCode,
  };

  return (
    <ChatbotContext.Provider value={value}>
      {children}
    </ChatbotContext.Provider>
  );
};