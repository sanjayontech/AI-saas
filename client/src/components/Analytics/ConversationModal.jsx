import React from 'react';
import { X, User, Bot, Clock, Star } from 'lucide-react';
import { Button } from '../UI';

const ConversationModal = ({ conversation, isOpen, onClose }) => {
  if (!isOpen || !conversation) return null;

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSatisfaction = (score) => {
    if (score === null || score === undefined) return 'N/A';
    return '★'.repeat(Math.floor(score)) + '☆'.repeat(5 - Math.floor(score));
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Conversation Details</h2>
            <p className="text-sm text-gray-500 mt-1">
              Session: {conversation.sessionId} • Started: {formatTime(conversation.startedAt)}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Conversation Metrics */}
        {conversation.metrics && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Conversation Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {conversation.metrics.messageCount}
                </div>
                <div className="text-sm text-gray-500">Messages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatDuration(conversation.metrics.durationSeconds)}
                </div>
                <div className="text-sm text-gray-500">Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {conversation.metrics.avgResponseTime}ms
                </div>
                <div className="text-sm text-gray-500">Avg Response</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {formatSatisfaction(conversation.metrics.userSatisfaction)}
                </div>
                <div className="text-sm text-gray-500">Satisfaction</div>
              </div>
            </div>
            
            {conversation.metrics.topicsDiscussed && conversation.metrics.topicsDiscussed.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Topics Discussed</h4>
                <div className="flex flex-wrap gap-2">
                  {conversation.metrics.topicsDiscussed.map((topic, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {conversation.metrics.userIntent && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">User Intent</h4>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                  {conversation.metrics.userIntent}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Messages</h3>
          <div className="space-y-4">
            {conversation.messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <div className="flex items-center mb-1">
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 mr-2" />
                    ) : (
                      <Bot className="h-4 w-4 mr-2" />
                    )}
                    <span className="text-xs opacity-75">
                      {message.role === 'user' ? 'User' : 'Assistant'}
                    </span>
                  </div>
                  <div className="text-sm">{message.content}</div>
                  <div className="text-xs opacity-75 mt-1 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Info */}
        {conversation.userInfo && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">User Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(conversation.userInfo).map(([key, value]) => (
                <div key={key}>
                  <div className="text-sm font-medium text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="text-sm text-gray-900">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default ConversationModal;