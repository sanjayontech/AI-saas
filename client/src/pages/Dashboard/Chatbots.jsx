import React from 'react';
import { Bot, Plus } from 'lucide-react';
import { Card, Button } from '../../components/UI';

const Chatbots = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chatbots</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage your AI chatbots
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Chatbot
        </Button>
      </div>

      {/* Empty State */}
      <Card className="text-center py-12">
        <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No chatbots yet</h3>
        <p className="text-gray-500 mb-6">
          Get started by creating your first AI chatbot
        </p>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Chatbot
        </Button>
      </Card>
    </div>
  );
};

export default Chatbots;