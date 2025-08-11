import React, { useState } from 'react';
import { 
  Bot, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Copy, 
  ExternalLink, 
  BarChart3,
  Power,
  PowerOff
} from 'lucide-react';
import { Card, Button } from '../UI';
import { useChatbot } from '../../contexts/ChatbotContext';

const ChatbotCard = ({ chatbot, onEdit, onViewAnalytics }) => {
  const { deleteChatbot, updateChatbot, getEmbedCode } = useChatbot();
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleActive = async () => {
    setLoading(true);
    await updateChatbot(chatbot.id, { 
      isActive: !chatbot.isActive 
    });
    setLoading(false);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${chatbot.name}"? This action cannot be undone.`)) {
      await deleteChatbot(chatbot.id);
    }
    setShowMenu(false);
  };

  const handleCopyEmbedCode = async () => {
    try {
      const result = await getEmbedCode(chatbot.id);
      if (result.success) {
        await navigator.clipboard.writeText(result.data.embedCode);
        // You might want to show a toast notification here
        alert('Embed code copied to clipboard!');
      }
    } catch (error) {
      alert('Failed to copy embed code');
    }
    setShowMenu(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="relative">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: chatbot.appearance?.primaryColor || '#4F46E5' }}
          >
            {chatbot.appearance?.avatar ? (
              <img 
                src={chatbot.appearance.avatar} 
                alt={chatbot.name}
                className="w-full h-full rounded-lg object-cover"
              />
            ) : (
              <Bot className="h-6 w-6" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {chatbot.name}
              </h3>
              <div className="flex items-center space-x-1">
                {chatbot.isActive ? (
                  <div className="flex items-center text-green-600">
                    <Power className="h-4 w-4 mr-1" />
                    <span className="text-xs font-medium">Active</span>
                  </div>
                ) : (
                  <div className="flex items-center text-gray-400">
                    <PowerOff className="h-4 w-4 mr-1" />
                    <span className="text-xs font-medium">Inactive</span>
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {chatbot.description}
            </p>
            
            <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
              <span>Created {formatDate(chatbot.createdAt)}</span>
              <span>•</span>
              <span className="capitalize">{chatbot.personality} personality</span>
              <span>•</span>
              <span>{chatbot.knowledgeBase?.length || 0} knowledge items</span>
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            aria-label="More options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border z-20">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onEdit(chatbot);
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4 mr-3" />
                    Edit Chatbot
                  </button>
                  
                  <button
                    onClick={() => {
                      onViewAnalytics(chatbot);
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <BarChart3 className="h-4 w-4 mr-3" />
                    View Analytics
                  </button>
                  
                  <button
                    onClick={handleCopyEmbedCode}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Copy className="h-4 w-4 mr-3" />
                    Copy Embed Code
                  </button>
                  
                  <button
                    onClick={handleToggleActive}
                    disabled={loading}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    {chatbot.isActive ? (
                      <>
                        <PowerOff className="h-4 w-4 mr-3" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Power className="h-4 w-4 mr-3" />
                        Activate
                      </>
                    )}
                  </button>
                  
                  <div className="border-t border-gray-100 my-1" />
                  
                  <button
                    onClick={handleDelete}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-3" />
                    Delete Chatbot
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(chatbot)}
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewAnalytics(chatbot)}
          >
            <BarChart3 className="h-3 w-3 mr-1" />
            Analytics
          </Button>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyEmbedCode}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Embed
        </Button>
      </div>
    </Card>
  );
};

export default ChatbotCard;