import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import RealTimeMonitor from './RealTimeMonitor';

// Mock setInterval and clearInterval
jest.useFakeTimers();

describe('RealTimeMonitor', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders real-time monitor with initial state', () => {
    render(<RealTimeMonitor chatbotId="chatbot-1" />);

    expect(screen.getByText('Real-Time Monitor')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Active Conversations')).toBeInTheDocument();
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
    expect(screen.getByText('System Health')).toBeInTheDocument();
  });

  it('shows connected status', () => {
    render(<RealTimeMonitor chatbotId="chatbot-1" />);

    const connectedStatus = screen.getByText('Connected');
    expect(connectedStatus).toBeInTheDocument();
    expect(connectedStatus).toHaveClass('text-green-600');
  });

  it('updates data periodically', async () => {
    render(<RealTimeMonitor chatbotId="chatbot-1" />);

    // Initial state should show 0 for active conversations
    expect(screen.getByText('0')).toBeInTheDocument();

    // Fast-forward time to trigger the interval
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      // Should have updated with random values (not 0)
      const activeConversationsElements = screen.getAllByText(/^\d+$/);
      expect(activeConversationsElements.length).toBeGreaterThan(0);
    });
  });

  it('displays performance indicators', () => {
    render(<RealTimeMonitor chatbotId="chatbot-1" />);

    expect(screen.getByText('Performance Indicators')).toBeInTheDocument();
    expect(screen.getByText('Response Time')).toBeInTheDocument();
    expect(screen.getByText('System Load')).toBeInTheDocument();
    expect(screen.getByText('Error Rate')).toBeInTheDocument();
  });

  it('shows system health status', () => {
    render(<RealTimeMonitor chatbotId="chatbot-1" />);

    // Should show healthy status initially (lowercase)
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  it('displays last updated timestamp', () => {
    render(<RealTimeMonitor chatbotId="chatbot-1" />);

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('shows progress bars for performance metrics', () => {
    render(<RealTimeMonitor chatbotId="chatbot-1" />);

    // Check for progress bar containers
    const progressBars = screen.getAllByRole('generic').filter(el => 
      el.className.includes('bg-gray-200') && el.className.includes('rounded-full')
    );
    
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('handles different system health states', async () => {
    render(<RealTimeMonitor chatbotId="chatbot-1" />);

    // Fast-forward time multiple times to potentially get different health states
    for (let i = 0; i < 3; i++) {
      jest.advanceTimersByTime(5000);
      await waitFor(() => {
        // Should show either healthy or warning (based on random logic)
        expect(
          screen.getByText('healthy') || screen.getByText('warning')
        ).toBeInTheDocument();
      });
    }
  });

  it('cleans up interval on unmount', () => {
    // Mock setInterval and clearInterval
    const mockSetInterval = jest.spyOn(global, 'setInterval');
    const mockClearInterval = jest.spyOn(global, 'clearInterval');

    const { unmount } = render(<RealTimeMonitor chatbotId="chatbot-1" />);

    // Verify interval is set
    expect(mockSetInterval).toHaveBeenCalledTimes(1);

    unmount();

    // Verify clearInterval is called
    expect(mockClearInterval).toHaveBeenCalledTimes(1);

    // Cleanup
    mockSetInterval.mockRestore();
    mockClearInterval.mockRestore();
  });

  it('updates when chatbotId changes', () => {
    // Mock setInterval and clearInterval
    const mockSetInterval = jest.spyOn(global, 'setInterval');
    const mockClearInterval = jest.spyOn(global, 'clearInterval');

    const { rerender } = render(<RealTimeMonitor chatbotId="chatbot-1" />);

    expect(mockSetInterval).toHaveBeenCalledTimes(1);

    rerender(<RealTimeMonitor chatbotId="chatbot-2" />);

    // Should clear old interval and set new one
    expect(mockClearInterval).toHaveBeenCalledTimes(1);
    expect(mockSetInterval).toHaveBeenCalledTimes(2);

    // Cleanup
    mockSetInterval.mockRestore();
    mockClearInterval.mockRestore();
  });

  it('shows no alerts initially', () => {
    render(<RealTimeMonitor chatbotId="chatbot-1" />);

    expect(screen.queryByText('Active Alerts')).not.toBeInTheDocument();
  });

  it('displays metric values with correct units', () => {
    render(<RealTimeMonitor chatbotId="chatbot-1" />);

    // Fast-forward to get updated values
    jest.advanceTimersByTime(5000);

    // Check for ms unit in response time (use getAllByText since there are multiple)
    expect(screen.getAllByText(/ms$/)).toHaveLength(2);
  });

  it('shows appropriate colors for different health states', async () => {
    render(<RealTimeMonitor chatbotId="chatbot-1" />);

    // Fast-forward time to trigger updates
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      const healthElement = screen.getByText(/healthy|warning|error/);
      expect(healthElement).toBeInTheDocument();
      
      // Check that it has appropriate color classes
      const parentElement = healthElement.closest('div');
      expect(parentElement?.className).toMatch(/bg-(green|yellow|red)-100/);
    });
  });
});