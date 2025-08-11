import React, { useState, useEffect } from 'react';
import { Bot, Plus, Search, Filter, Grid, List } from 'lucide-react';
import { Card, Button, Input, Select, LoadingSpinner } from '../../components/UI';
import { useChatbot } from '../../contexts/ChatbotContext';
import ChatbotWizard from '../../components/Chatbot/ChatbotWizard';
import ChatbotCard from '../../components/Chatbot/ChatbotCard';

const Chatbots = () => {
  const { chatbots, loading, error, loadChatbots } = useChatbot();
  const [showWizard, setShowWizard] = useState(false);
  const [editingChatbot, setEditingChatbot] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    loadChatbots();
  }, []);

  const handleCreateChatbot = () => {
    setEditingChatbot(null);
    setShowWizard(true);
  };

  const handleEditChatbot = (chatbot) => {
    setEditingChatbot(chatbot);
    setShowWizard(true);
  };

  const handleViewAnalytics = (chatbot) => {
    // Navigate to analytics page for this chatbot
    // This would typically use React Router
    console.log('View analytics for:', chatbot.name);
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
    setEditingChatbot(null);
  };

  // Filter and search chatbots
  const filteredChatbots = chatbots.filter(chatbot => {
    const matchesSearch = chatbot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chatbot.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && chatbot.isActive) ||
                         (filterStatus === 'inactive' && !chatbot.isActive);
    
    return matchesSearch && matchesFilter;
  });

  if (loading && chatbots.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chatbots</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage your AI chatbots
          </p>
        </div>
        <Button onClick={handleCreateChatbot}>
          <Plus className="h-4 w-4 mr-2" />
          Create Chatbot
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="text-red-800">
              <h3 className="font-medium">Error loading chatbots</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadChatbots}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {chatbots.length > 0 ? (
        <>
          {/* Filters and Search */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search chatbots..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Chatbots' },
                    { value: 'active', label: 'Active Only' },
                    { value: 'inactive', label: 'Inactive Only' },
                  ]}
                  className="w-full sm:w-auto"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${
                    viewMode === 'grid' 
                      ? 'bg-indigo-100 text-indigo-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${
                    viewMode === 'list' 
                      ? 'bg-indigo-100 text-indigo-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>

          {/* Chatbots List/Grid */}
          {filteredChatbots.length > 0 ? (
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }>
              {filteredChatbots.map((chatbot) => (
                <ChatbotCard
                  key={chatbot.id}
                  chatbot={chatbot}
                  onEdit={handleEditChatbot}
                  onViewAnalytics={handleViewAnalytics}
                />
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No chatbots found</h3>
              <p className="text-gray-500 mb-6">
                Try adjusting your search or filter criteria
              </p>
              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
              }}>
                Clear Filters
              </Button>
            </Card>
          )}

          {/* Stats Summary */}
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{chatbots.length}</div>
                <div className="text-sm text-gray-500">Total Chatbots</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {chatbots.filter(bot => bot.isActive).length}
                </div>
                <div className="text-sm text-gray-500">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">
                  {chatbots.filter(bot => !bot.isActive).length}
                </div>
                <div className="text-sm text-gray-500">Inactive</div>
              </div>
            </div>
          </Card>
        </>
      ) : (
        /* Empty State */
        <Card className="text-center py-12">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No chatbots yet</h3>
          <p className="text-gray-500 mb-6">
            Get started by creating your first AI chatbot
          </p>
          <Button onClick={handleCreateChatbot}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Chatbot
          </Button>
        </Card>
      )}

      {/* Chatbot Wizard Modal */}
      <ChatbotWizard
        isOpen={showWizard}
        onClose={handleCloseWizard}
        editingChatbot={editingChatbot}
      />
    </div>
  );
};

export default Chatbots;