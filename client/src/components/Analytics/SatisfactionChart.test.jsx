import React from 'react';
import { render, screen } from '@testing-library/react';
import SatisfactionChart from './SatisfactionChart';

// Mock recharts
jest.mock('recharts', () => ({
  BarChart: ({ children, data }) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, fill }) => (
    <div 
      data-testid="bar" 
      data-key={dataKey} 
      data-fill={fill}
    />
  ),
  XAxis: ({ dataKey }) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: ({ domain }) => (
    <div data-testid="y-axis" data-domain={JSON.stringify(domain)} />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  )
}));

const mockData = [
  { date: '2024-01-01', satisfactionScore: 4.2 },
  { date: '2024-01-02', satisfactionScore: 4.5 },
  { date: '2024-01-03', satisfactionScore: 3.8 }
];

describe('SatisfactionChart', () => {
  it('renders chart with data', () => {
    render(<SatisfactionChart data={mockData} />);

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<SatisfactionChart data={[]} loading={true} />);

    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
    // Check that the loading container has the correct classes
    const loadingContainer = screen.getByText('Loading chart...').closest('.animate-pulse');
    expect(loadingContainer).toBeInTheDocument();
  });

  it('shows no data message when data is empty', () => {
    render(<SatisfactionChart data={[]} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
    expect(screen.getByText('User ratings will appear here')).toBeInTheDocument();
  });

  it('shows no data message when data is null', () => {
    render(<SatisfactionChart data={null} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('configures chart with correct props', () => {
    render(<SatisfactionChart data={mockData} />);

    const chart = screen.getByTestId('bar-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data'));
    expect(chartData).toEqual(mockData);

    const bar = screen.getByTestId('bar');
    expect(bar.getAttribute('data-key')).toBe('satisfactionScore');
    expect(bar.getAttribute('data-fill')).toBe('#F59E0B');

    const xAxis = screen.getByTestId('x-axis');
    expect(xAxis.getAttribute('data-key')).toBe('date');

    const yAxis = screen.getByTestId('y-axis');
    const domain = JSON.parse(yAxis.getAttribute('data-domain'));
    expect(domain).toEqual([0, 5]);
  });
});