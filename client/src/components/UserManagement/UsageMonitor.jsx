import React, { useState, useEffect } from 'react';
import { BarChart3, MessageSquare, Bot, HardDrive, Activity, TrendingUp } from 'lucide-react';
import { Card } from '../UI';
import { userAPI } from '../../utils/api';

const UsageMonitor = () => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsageStats();
  }, []);

  const loadUsageStats = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUsageStats();
      setUsage(response.data.usage);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Usage Statistics
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Usage Statistics
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="text-red-600 text-center py-4">
            Error loading usage statistics: {error}
          </div>
        </Card.Content>
      </Card>
    );
  }

  const usageMetrics = [
    {
      label: 'Messages This Month',
      value: usage?.messagesThisMonth || 0,
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      limit: 10000, // Free tier limit
    },
    {
      label: 'Total Messages',
      value: usage?.totalMessages || 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Chatbots Created',
      value: usage?.chatbotsCreated || 0,
      icon: Bot,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      limit: 5, // Free tier limit
    },
    {
      label: 'Storage Used',
      value: formatBytes(usage?.storageUsed || 0),
      icon: HardDrive,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      limit: formatBytes(100 * 1024 * 1024), // 100MB limit
    },
  ];

  return (
    <Card>
      <Card.Header>
        <Card.Title className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Usage Statistics
        </Card.Title>
        <p className="text-sm text-gray-500 mt-1">
          Monitor your account usage and limits
        </p>
      </Card.Header>
      <Card.Content>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {usageMetrics.map((metric, index) => {
            const Icon = metric.icon;
            const percentage = metric.limit ? 
              Math.min((parseInt(metric.value) / parseInt(metric.limit)) * 100, 100) : null;
            
            return (
              <div key={index} className="flex items-center p-4 border border-gray-200 rounded-lg">
                <div className={`p-3 rounded-lg ${metric.bgColor} mr-4`}>
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{metric.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  {metric.limit && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Used</span>
                        <span>Limit: {metric.limit}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            percentage > 80 ? 'bg-red-500' : 
                            percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {percentage.toFixed(1)}% used
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Activity className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-gray-900">Last Active</span>
            </div>
            <span className="text-sm text-gray-500">
              {formatDate(usage?.lastActive)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-900 ml-7">Account Created</span>
            </div>
            <span className="text-sm text-gray-500">
              {formatDate(usage?.createdAt)}
            </span>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
};

export default UsageMonitor;