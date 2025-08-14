import React, { useState, useEffect } from 'react';
import { MessageSquare, Bot, BarChart3, Users } from 'lucide-react';
import { Card, LoadingSpinner } from '../../components/UI';

const Overview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/v1/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.data.usage);
      } else if (response.status === 403) {
        // Try refreshing the token in case email was recently verified
        try {
          const refreshResponse = await fetch('http://localhost:3001/api/v1/auth/refresh-user-token', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            // Update stored token and user data
            localStorage.setItem('token', refreshData.data.tokens.accessToken);
            localStorage.setItem('user', JSON.stringify(refreshData.data.user));
            
            // Retry the original request
            const retryResponse = await fetch('http://localhost:3001/api/v1/users/profile', {
              headers: {
                'Authorization': `Bearer ${refreshData.data.tokens.accessToken}`,
              },
            });

            const retryData = await retryResponse.json();
            if (retryData.success) {
              setStats(retryData.data.usage);
              return;
            }
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
        
        setError('Email verification required. Please check your email and verify your account.');
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      setError('Error loading dashboard data');
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner.Page message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        {error.includes('Email verification') && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              If you've already verified your email, try refreshing your session by clicking "Try again" below.
            </p>
          </div>
        )}
        <div className="space-x-4 mt-4">
          <button 
            onClick={fetchDashboardStats}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Try again
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/auth';
            }}
            className="text-red-600 hover:text-red-500"
          >
            Log out and try again
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Messages This Month',
      value: stats?.messagesThisMonth || 0,
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Total Messages',
      value: stats?.totalMessages || 0,
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Chatbots Created',
      value: stats?.chatbotsCreated || 0,
      icon: Bot,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Storage Used',
      value: `${((stats?.storageUsed || 0) / 1024 / 1024).toFixed(2)} MB`,
      icon: BarChart3,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here's what's happening with your chatbots.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.name} className="overflow-hidden">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500 truncate">
                  {stat.name}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <Card.Title>Quick Actions</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <Bot className="h-5 w-5 text-indigo-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Create New Chatbot</p>
                    <p className="text-sm text-gray-500">Set up a new AI chatbot for your website</p>
                  </div>
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">View Analytics</p>
                    <p className="text-sm text-gray-500">Check your chatbot performance metrics</p>
                  </div>
                </div>
              </button>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>Recent Activity</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                <span className="text-gray-600">Account created</span>
                <span className="ml-auto text-gray-400">
                  {stats?.createdAt ? new Date(stats.createdAt).toLocaleDateString() : 'Recently'}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                <span className="text-gray-600">Last activity</span>
                <span className="ml-auto text-gray-400">
                  {stats?.lastActive ? new Date(stats.lastActive).toLocaleDateString() : 'Today'}
                </span>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Usage Overview */}
      <Card>
        <Card.Header>
          <Card.Title>Usage Overview</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {stats?.messagesThisMonth || 0}
              </div>
              <div className="text-sm text-gray-500 mt-1">Messages this month</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full" 
                  style={{ width: `${Math.min((stats?.messagesThisMonth || 0) / 1000 * 100, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">1,000 message limit</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {stats?.chatbotsCreated || 0}
              </div>
              <div className="text-sm text-gray-500 mt-1">Chatbots created</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${Math.min((stats?.chatbotsCreated || 0) / 10 * 100, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">10 chatbot limit</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {((stats?.storageUsed || 0) / 1024 / 1024).toFixed(1)}MB
              </div>
              <div className="text-sm text-gray-500 mt-1">Storage used</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full" 
                  style={{ width: `${Math.min((stats?.storageUsed || 0) / (100 * 1024 * 1024) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">100MB limit</div>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default Overview;