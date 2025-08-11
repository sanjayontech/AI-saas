import React from 'react';
import { render, screen } from '@testing-library/react';
import ConversationVolumeChart from './ConversationVolumeChart';

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children, data }) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }) => (
    <div data-testid="line" data-key={dataKey} data-stroke={stroke} />
  ),
  XAxis: ({ dataKey }) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  )
}));

const mockData = [
  { date: '2024-01-01', conversations: 10 },
  { date: '2024-01-02', conversations: 15 },
  { date: '2024-01-03', conversations: 8 }
];

describe('ConversationVolumeChart', () => {
  it('renders chart with data', () => {
    render(<ConversationVolumeChart data={mockData} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ConversationVolumeChart data={[]} loading={true} />);

    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
    // Check that the loading container has the correct classes
    const loadingContainer = screen.getByText('Loading chart...').closest('.animate-pulse');
    expect(loadingContainer).toBeInTheDocument();
  });

  it('shows no data message when data is empty', () => {
    render(<ConversationVolumeChart data={[]} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
    expect(screen.getByText('Start conversations to see analytics')).toBeInTheDocument();
  });

  it('shows no data message when data is null', () => {
    render(<ConversationVolumeChart data={null} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('configures chart with correct props', () => {
    render(<ConversationVolumeChart data={mockData} />);

    const chart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data'));
    expect(chartData).toEqual(mockData);

    const line = screen.getByTestId('line');
    expect(line.getAttribute('data-key')).toBe('conversations');
    expect(line.getAttribute('data-stroke')).toBe('#3B82F6');

    const xAxis = screen.getByTestId('x-axis');
    expect(xAxis.getAttribute('data-key')).toBe('date');
  });
});