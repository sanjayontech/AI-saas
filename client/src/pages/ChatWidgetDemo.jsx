import React, { useState } from 'react';
import ChatWidget from '../components/ChatWidget/ChatWidget';

const ChatWidgetDemo = () => {
  const [widgetConfig, setWidgetConfig] = useState({
    chatbotId: 'demo-chatbot-1',
    title: 'Demo Support Chat',
    welcomeMessage: 'Hello! I\'m a demo chatbot. How can I help you today?',
    position: 'bottom-right',
    theme: {
      primaryColor: '#3B82F6',
      secondaryColor: '#F3F4F6',
      textColor: '#1F2937',
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }
  });

  const [embedCode, setEmbedCode] = useState('');

  const generateEmbedCode = () => {
    const code = `<!-- AI Chatbot Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/widget/chat-widget.iife.js';
    script.setAttribute('data-chatbot-id', '${widgetConfig.chatbotId}');
    script.setAttribute('data-position', '${widgetConfig.position}');
    script.setAttribute('data-server-url', '${process.env.REACT_APP_SERVER_URL || 'http://localhost:3000'}');
    script.setAttribute('data-primary-color', '${widgetConfig.theme.primaryColor}');
    script.setAttribute('data-secondary-color', '${widgetConfig.theme.secondaryColor}');
    script.setAttribute('data-text-color', '${widgetConfig.theme.textColor}');
    script.setAttribute('data-background-color', '${widgetConfig.theme.backgroundColor}');
    script.setAttribute('data-border-radius', '${widgetConfig.theme.borderRadius}');
    script.setAttribute('data-font-family', '${widgetConfig.theme.fontFamily}');
    document.head.appendChild(script);
  })();
</script>`;
    setEmbedCode(code);
  };

  const updateConfig = (key, value) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setWidgetConfig(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setWidgetConfig(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Chat Widget Demo & Configuration
          </h1>
          <p className="text-gray-600 mb-6">
            Configure and test your embeddable chat widget. The widget will appear in the bottom-right corner.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Configuration Panel */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Widget Configuration</h2>
              
              {/* Basic Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700">Basic Settings</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chatbot ID
                  </label>
                  <input
                    type="text"
                    value={widgetConfig.chatbotId}
                    onChange={(e) => updateConfig('chatbotId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={widgetConfig.title}
                    onChange={(e) => updateConfig('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Welcome Message
                  </label>
                  <textarea
                    value={widgetConfig.welcomeMessage}
                    onChange={(e) => updateConfig('welcomeMessage', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <select
                    value={widgetConfig.position}
                    onChange={(e) => updateConfig('position', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="center">Center</option>
                  </select>
                </div>
              </div>

              {/* Theme Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700">Theme Settings</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Primary Color
                    </label>
                    <input
                      type="color"
                      value={widgetConfig.theme.primaryColor}
                      onChange={(e) => updateConfig('theme.primaryColor', e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Secondary Color
                    </label>
                    <input
                      type="color"
                      value={widgetConfig.theme.secondaryColor}
                      onChange={(e) => updateConfig('theme.secondaryColor', e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Text Color
                    </label>
                    <input
                      type="color"
                      value={widgetConfig.theme.textColor}
                      onChange={(e) => updateConfig('theme.textColor', e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Background Color
                    </label>
                    <input
                      type="color"
                      value={widgetConfig.theme.backgroundColor}
                      onChange={(e) => updateConfig('theme.backgroundColor', e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Border Radius
                  </label>
                  <input
                    type="text"
                    value={widgetConfig.theme.borderRadius}
                    onChange={(e) => updateConfig('theme.borderRadius', e.target.value)}
                    placeholder="12px"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Font Family
                  </label>
                  <input
                    type="text"
                    value={widgetConfig.theme.fontFamily}
                    onChange={(e) => updateConfig('theme.fontFamily', e.target.value)}
                    placeholder="system-ui, -apple-system, sans-serif"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Embed Code Panel */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Integration Code</h2>
              
              <button
                onClick={generateEmbedCode}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Generate Embed Code
              </button>

              {embedCode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Copy this code to your website:
                  </label>
                  <textarea
                    value={embedCode}
                    readOnly
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
                    onClick={(e) => e.target.select()}
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Click the code above to select all, then copy and paste it into your website's HTML.
                  </p>
                </div>
              )}

              {/* Usage Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Integration Instructions:</h3>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Configure your widget settings above</li>
                  <li>Click "Generate Embed Code"</li>
                  <li>Copy the generated code</li>
                  <li>Paste it into your website's HTML (preferably before the closing &lt;/body&gt; tag)</li>
                  <li>The widget will automatically initialize when the page loads</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Notice */}
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-green-800 mb-1">Live Preview</h3>
          <p className="text-sm text-green-700">
            The chat widget is currently active on this page with your configured settings. 
            Look for the chat button in the {widgetConfig.position.replace('-', ' ')} corner to test it!
          </p>
        </div>
      </div>

      {/* Live Chat Widget */}
      <ChatWidget
        chatbotId={widgetConfig.chatbotId}
        config={widgetConfig}
        position={widgetConfig.position}
        theme={widgetConfig.theme}
      />
    </div>
  );
};

export default ChatWidgetDemo;