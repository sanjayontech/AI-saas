import React from 'react';
import { createRoot } from 'react-dom/client';
import ChatWidget from './ChatWidget';

// Embeddable widget class that can be instantiated on any website
class EmbeddableChatWidget {
  constructor(config) {
    this.config = {
      chatbotId: null,
      position: 'bottom-right',
      theme: {},
      containerId: null,
      serverUrl: 'http://localhost:3000',
      ...config
    };
    
    this.container = null;
    this.root = null;
    this.isInitialized = false;
  }

  // Initialize the widget
  init() {
    if (this.isInitialized) {
      console.warn('Chat widget is already initialized');
      return;
    }

    if (!this.config.chatbotId) {
      console.error('ChatBot ID is required to initialize the widget');
      return;
    }

    this.createContainer();
    this.injectStyles();
    this.renderWidget();
    this.isInitialized = true;
  }

  // Create container element
  createContainer() {
    if (this.config.containerId) {
      this.container = document.getElementById(this.config.containerId);
      if (!this.container) {
        console.error(`Container with ID '${this.config.containerId}' not found`);
        return;
      }
    } else {
      // Create a new container and append to body
      this.container = document.createElement('div');
      this.container.id = `chat-widget-${this.config.chatbotId}`;
      this.container.style.cssText = `
        position: fixed;
        z-index: 999999;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
  }

  // Inject necessary styles
  injectStyles() {
    const styleId = 'chat-widget-styles';
    
    // Check if styles are already injected
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Chat Widget Styles */
      .chat-widget-container * {
        box-sizing: border-box;
        pointer-events: auto;
      }
      
      .chat-widget-container {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.5;
      }

      /* Animation keyframes */
      @keyframes chat-widget-bounce {
        0%, 80%, 100% {
          transform: scale(0);
        }
        40% {
          transform: scale(1);
        }
      }

      .chat-widget-bounce {
        animation: chat-widget-bounce 1.4s infinite ease-in-out both;
      }

      /* Responsive styles */
      @media (max-width: 480px) {
        .chat-widget-container {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          top: auto !important;
          transform: none !important;
          width: 100% !important;
          height: auto !important;
        }
        
        .chat-widget-container > div {
          width: 100% !important;
          height: 100vh !important;
          border-radius: 0 !important;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  // Render the React widget
  renderWidget() {
    if (!this.container) return;

    // Add container class
    this.container.className = 'chat-widget-container';

    // Create React root and render
    this.root = createRoot(this.container);
    this.root.render(
      React.createElement(ChatWidget, {
        chatbotId: this.config.chatbotId,
        config: this.config,
        position: this.config.position,
        theme: this.config.theme,
        serverUrl: this.config.serverUrl
      })
    );
  }

  // Update widget configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (this.isInitialized) {
      this.renderWidget();
    }
  }

  // Show the widget
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  // Hide the widget
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  // Destroy the widget
  destroy() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    this.container = null;
    this.isInitialized = false;
  }

  // Get widget status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      chatbotId: this.config.chatbotId,
      position: this.config.position
    };
  }
}

// Global function to create widget instances
window.createChatWidget = (config) => {
  return new EmbeddableChatWidget(config);
};

// Auto-initialize if config is provided via data attributes
document.addEventListener('DOMContentLoaded', () => {
  const scripts = document.querySelectorAll('script[data-chatbot-id]');
  
  scripts.forEach(script => {
    const chatbotId = script.getAttribute('data-chatbot-id');
    const position = script.getAttribute('data-position') || 'bottom-right';
    const serverUrl = script.getAttribute('data-server-url') || 'http://localhost:3000';
    
    // Parse theme from data attributes
    const theme = {};
    const themeAttributes = ['primary-color', 'secondary-color', 'text-color', 'background-color', 'border-radius', 'font-family'];
    
    themeAttributes.forEach(attr => {
      const value = script.getAttribute(`data-${attr}`);
      if (value) {
        const camelCaseAttr = attr.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        theme[camelCaseAttr] = value;
      }
    });

    if (chatbotId) {
      const widget = new EmbeddableChatWidget({
        chatbotId,
        position,
        theme,
        serverUrl
      });
      
      widget.init();
      
      // Store reference globally for potential access
      window[`chatWidget_${chatbotId}`] = widget;
    }
  });
});

export default EmbeddableChatWidget;