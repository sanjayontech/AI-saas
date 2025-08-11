import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, MessageSquare, Users, Calendar, Download } from 'lucide-react';
import { Card, Button, Select } from '../../components/UI';
import { 
  ConversationVolumeChart, 
  ResponseTimeChart, 
  SatisfactionChart,
  ConversationHistory,
  ConversationModal,
  RealTimeMonitor
} from '../../components/Analytics';
import { analyticsAPI } from '../../utils/api';
import { useChatbot } from '../../contexts/ChatbotContext';

const Analytics = () => {
  const { selectedChatbot } = useChatbot();
  const [metrics, setMetrics] = useState(null);
  const [chartData, setChartData] = useState({
    conversationVolume: [],
    responseTime: [],
    satisfaction: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showConversationModal, setShowConversationModal] = useState(false);

  const fetchAnalytics = async () => {
    if (!selectedChatbot?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard metrics
      const metricsResponse = await analyticsAPI.getDashboardMetrics(
        selectedChatbot.id, 
        { period: timeRange }
      );

      if (metricsResponse.success) {
        setMetrics(metricsResponse.data.metrics);
      }

      // Fetch performance insights for charts
      const performanceResponse = await analyticsAPI.getPerformanceInsights(
        selectedChatbot.id,
        { period: timeRange }
      );

      if (performanceResponse.success) {
        const { performanceTrends } = performanceResponse.data;
        
        // Transform data for charts
        setChartData({
          conversationVolume: performanceTrends.map(trend => ({
            date: trend.date,
            conversations: trend.totalConversations
          })),
          responseTime: performanceTrends.map(trend => ({
            date: trend.date,
            avgResponseTime: trend.avgResponseTime
          })),
          satisfaction: performanceTrends.map(trend => ({
            date: trend.date,
            satisfactionScore: trend.userSatisfactionScore
          }))
        });
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedChatbot?.id, timeRange]);

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
    setShowConversationModal(true);
  };

  const handleExport = async () => {
    if (!selectedChatbot?.id) return;

    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const exportData = await analyticsAPI.exportAnalyticsData(selectedChatbot.id, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        format: 'json'
      });

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${selectedChatbot.name}-${timeRange}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting analytics:', err);
    }
  };

  if (!selectedChatbot) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor your chatbot performance and user interactions
          </p>
        </div>
        <Card>
          <Card.Content>
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Chatbot Selected</h3>
              <p className="text-gray-500">
                Please select a chatbot from the sidebar to view analytics
              </p>
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor performance for {selectedChatbot.name}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-32"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-lg bg-blue-100">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Conversations</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '...' : (metrics?.totalConversations || 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-lg bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Messages</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '...' : (metrics?.totalMessages || 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-lg bg-purple-100">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg. Response Time</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '...' : `${metrics?.averageResponseTime || 0}ms`}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-lg bg-orange-100">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Satisfaction Score</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '...' : `${(metrics?.userSatisfactionScore || 0).toFixed(1)}★`}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <Card.Title>Conversation Volume</Card.Title>
          </Card.Header>
          <Card.Content>
            <ConversationVolumeChart 
              data={chartData.conversationVolume} 
              loading={loading} 
            />
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>Response Times</Card.Title>
          </Card.Header>
          <Card.Content>
            <ResponseTimeChart 
              data={chartData.responseTime} 
              loading={loading} 
            />
          </Card.Content>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <Card.Title>User Satisfaction</Card.Title>
          </Card.Header>
          <Card.Content>
            <SatisfactionChart 
              data={chartData.satisfaction} 
              loading={loading} 
            />
          </Card.Content>
        </Card>

        {/* Real-time Monitor */}
        <RealTimeMonitor chatbotId={selectedChatbot.id} />
      </div>

      {/* Conversation History */}
      <ConversationHistory 
        chatbotId={selectedChatbot.id}
        onConversationSelect={handleConversationSelect}
      />

      {/* Conversation Modal */}
      <ConversationModal
        conversation={selectedConversation}
        isOpen={showConversationModal}
        onClose={() => {
          setShowConversationModal(false);
          setSelectedConversation(null);
        }}
      />
    </div>
  );
};

export default Analytics;