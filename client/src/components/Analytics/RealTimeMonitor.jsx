import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, Users } from 'lucide-react';
import { Card } from '../UI';

const RealTimeMonitor = ({ chatbotId }) => {
  const [realTimeData, setRealTimeData] = useState({
    activeConversations: 0,
    avgResponseTime: 0,
    systemHealth: 'healthy',
    lastUpdate: new Date(),
    alerts: []
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      setRealTimeData(prev => ({
        ...prev,
        activeConversations: Math.floor(Math.random() * 10),
        avgResponseTime: Math.floor(Math.random() * 2000) + 500,
        lastUpdate: new Date(),
        systemHealth: Math.random() > 0.1 ? 'healthy' : 'warning'
      }));
    }, 5000);

    setIsConnected(true);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, [chatbotId]);

  const getHealthColor = (health) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (health) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <Card.Title className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Real-Time Monitor
          </Card.Title>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              isConnected ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-600' : 'bg-red-600'
              }`}></div>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        {/* Real-time Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">
              {realTimeData.activeConversations}
            </div>
            <div className="text-sm text-gray-600">Active Conversations</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">
              {realTimeData.avgResponseTime}ms
            </div>
            <div className="text-sm text-gray-600">Avg Response Time</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              getHealthColor(realTimeData.systemHealth)
            }`}>
              {getHealthIcon(realTimeData.systemHealth)}
              <span className="ml-2 capitalize">{realTimeData.systemHealth}</span>
            </div>
            <div className="text-sm text-gray-600 mt-2">System Health</div>
          </div>
        </div>

        {/* Alerts */}
        {realTimeData.alerts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Active Alerts</h3>
            <div className="space-y-2">
              {realTimeData.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`flex items-center p-3 rounded-lg ${
                    alert.severity === 'high' 
                      ? 'bg-red-50 border border-red-200' 
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}
                >
                  <AlertTriangle className={`h-5 w-5 mr-3 ${
                    alert.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{alert.title}</div>
                    <div className="text-sm text-gray-600">{alert.message}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Indicators */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Performance Indicators</h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Response Time</span>
                <span>{realTimeData.avgResponseTime}ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    realTimeData.avgResponseTime < 1000 
                      ? 'bg-green-600' 
                      : realTimeData.avgResponseTime < 2000 
                        ? 'bg-yellow-600' 
                        : 'bg-red-600'
                  }`}
                  style={{ 
                    width: `${Math.min((realTimeData.avgResponseTime / 3000) * 100, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>System Load</span>
                <span>Normal</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '35%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Error Rate</span>
                <span>0.1%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '2%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Last Update */}
        <div className="mt-6 text-xs text-gray-500 text-center">
          Last updated: {realTimeData.lastUpdate.toLocaleTimeString()}
        </div>
      </Card.Content>
    </Card>
  );
};

export default RealTimeMonitor;