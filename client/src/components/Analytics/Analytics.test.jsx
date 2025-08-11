import React from 'react';
import { render, screen } from '@testing-library/react';
import * as AnalyticsComponents from './index';

// Mock recharts for all chart components
jest.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>
}));

// Mock the API
jest.mock('../../utils/api', () => ({
  analyticsAPI: {
    getConversationHistory: jest.fn().mockResolvedValue({
      success: true,
      data: {
        conversations: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      }
    })
  }
}));

describe('Analytics Components', () => {
  describe('Component Exports', () => {
    it('exports all required components', () => {
      expect(AnalyticsComponents.ConversationVolumeChart).toBeDefined();
      expect(AnalyticsComponents.ResponseTimeChart).toBeDefined();
      expect(AnalyticsComponents.SatisfactionChart).toBeDefined();
      expect(AnalyticsComponents.ConversationHistory).toBeDefined();
      expect(AnalyticsComponents.ConversationModal).toBeDefined();
      expect(AnalyticsComponents.RealTimeMonitor).toBeDefined();
    });
  });

  describe('ConversationVolumeChart', () => {
    it('renders without crashing', () => {
      const { ConversationVolumeChart } = AnalyticsComponents;
      render(<ConversationVolumeChart data={[]} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('ResponseTimeChart', () => {
    it('renders without crashing', () => {
      const { ResponseTimeChart } = AnalyticsComponents;
      render(<ResponseTimeChart data={[]} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('SatisfactionChart', () => {
    it('renders without crashing', () => {
      const { SatisfactionChart } = AnalyticsComponents;
      render(<SatisfactionChart data={[]} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('ConversationHistory', () => {
    it('renders without crashing', () => {
      const { ConversationHistory } = AnalyticsComponents;
      render(<ConversationHistory chatbotId="test-id" />);
      expect(screen.getByText('Conversation History')).toBeInTheDocument();
    });
  });

  describe('ConversationModal', () => {
    it('renders when open', () => {
      const { ConversationModal } = AnalyticsComponents;
      const mockConversation = {
        id: 'test',
        sessionId: 'session-123',
        startedAt: '2024-01-01T10:00:00Z',
        messages: []
      };
      
      render(
        <ConversationModal 
          conversation={mockConversation}
          isOpen={true}
          onClose={() => {}}
        />
      );
      
      expect(screen.getByText('Conversation Details')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      const { ConversationModal } = AnalyticsComponents;
      render(
        <ConversationModal 
          conversation={null}
          isOpen={false}
          onClose={() => {}}
        />
      );
      
      expect(screen.queryByText('Conversation Details')).not.toBeInTheDocument();
    });
  });

  describe('RealTimeMonitor', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('renders without crashing', () => {
      const { RealTimeMonitor } = AnalyticsComponents;
      render(<RealTimeMonitor chatbotId="test-id" />);
      expect(screen.getByText('Real-Time Monitor')).toBeInTheDocument();
    });
  });
});