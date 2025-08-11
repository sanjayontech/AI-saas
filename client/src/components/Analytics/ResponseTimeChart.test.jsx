import React from 'react';
import { render, screen } from '@testing-library/react';
import ResponseTimeChart from './ResponseTimeChart';

// Mock recharts
jest.mock('recharts', () => ({
  AreaChart: ({ children, data }) => (
    <div data-testid="area-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Area: ({ dataKey, stroke, fill }) => (
    <div 
      data-testid="area" 
      data-key={dataKey} 
      data-stroke={stroke}
      data-fill={fill}
    />
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
  { date: '2024-01-01', avgResponseTime: 1000 },
  { date: '2024-01-02', avgResponseTime: 1200 },
  { date: '2024-01-03', avgResponseTime: 800 }
];

describe('ResponseTimeChart', () => {
  it('renders chart with data', () => {
    render(<ResponseTimeChart data={mockData} />);

    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('area')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ResponseTimeChart data={[]} loading={true} />);

    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
    // Check that the loading container has the correct classes
    const loadingContainer = screen.getByText('Loading chart...').closest('.animate-pulse');
    expect(loadingContainer).toBeInTheDocument();
  });

  it('shows no data message when data is empty', () => {
    render(<ResponseTimeChart data={[]} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
    expect(screen.getByText('Start conversations to see response times')).toBeInTheDocument();
  });

  it('shows no data message when data is null', () => {
    render(<ResponseTimeChart data={null} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('configures chart with correct props', () => {
    render(<ResponseTimeChart data={mockData} />);

    const chart = screen.getByTestId('area-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data'));
    expect(chartData).toEqual(mockData);

    const area = screen.getByTestId('area');
    expect(area.getAttribute('data-key')).toBe('avgResponseTime');
    expect(area.getAttribute('data-stroke')).toBe('#10B981');
    expect(area.getAttribute('data-fill')).toBe('#10B981');

    const xAxis = screen.getByTestId('x-axis');
    expect(xAxis.getAttribute('data-key')).toBe('date');
  });
});