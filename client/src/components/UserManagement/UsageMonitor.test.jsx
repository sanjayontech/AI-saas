import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import UsageMonitor from './UsageMonitor';
import { userAPI } from '../../utils/api';

// Mock the API
jest.mock('../../utils/api', () => ({
  userAPI: {
    getUsageStats: jest.fn(),
  },
}));

describe('UsageMonitor', () => {
  const mockUsageData = {
    data: {
      usage: {
        id: '1',
        messagesThisMonth: 150,
        totalMessages: 1500,
        chatbotsCreated: 3,
        storageUsed: 52428800, // 50MB in bytes
        lastActive: '2024-01-15T10:30:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    userAPI.getUsageStats.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<UsageMonitor />);
    
    expect(screen.getByText('Usage Statistics')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('renders usage statistics successfully', async () => {
    userAPI.getUsageStats.mockResolvedValue(mockUsageData);
    
    render(<UsageMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('Usage Statistics')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument(); // Messages this month
      expect(screen.getByText('1500')).toBeInTheDocument(); // Total messages
      expect(screen.getByText('3')).toBeInTheDocument(); // Chatbots created
      expect(screen.getByText('50.00 MB')).toBeInTheDocument(); // Storage used
    });
  });

  it('displays usage limits and progress bars', async () => {
    userAPI.getUsageStats.mockResolvedValue(mockUsageData);
    
    render(<UsageMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('Limit: 10000')).toBeInTheDocument(); // Messages limit
      expect(screen.getByText('Limit: 5')).toBeInTheDocument(); // Chatbots limit
      expect(screen.getByText('Limit: 100.00 MB')).toBeInTheDocument(); // Storage limit
      expect(screen.getByText('1.5% used')).toBeInTheDocument(); // Messages percentage
      expect(screen.getByText('60.0% used')).toBeInTheDocument(); // Chatbots percentage
      expect(screen.getByText('50.0% used')).toBeInTheDocument(); // Storage percentage
    });
  });

  it('shows correct progress bar colors based on usage', async () => {
    const highUsageData = {
      data: {
        usage: {
          ...mockUsageData.data.usage,
          messagesThisMonth: 9000, // 90% usage - should be red
          chatbotsCreated: 4, // 80% usage - should be red
          storageUsed: 70 * 1024 * 1024, // 70MB - should be yellow
        },
      },
    };
    
    userAPI.getUsageStats.mockResolvedValue(highUsageData);
    
    render(<UsageMonitor />);
    
    await waitFor(() => {
      const progressBars = document.querySelectorAll('.bg-red-500, .bg-yellow-500, .bg-green-500');
      expect(progressBars.length).toBeGreaterThan(0);
      // Check that high usage shows red bars
      expect(document.querySelector('.bg-red-500')).toBeInTheDocument();
      expect(document.querySelector('.bg-yellow-500')).toBeInTheDocument();
    });
  });

  it('formats dates correctly', async () => {
    userAPI.getUsageStats.mockResolvedValue(mockUsageData);
    
    render(<UsageMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument(); // Last active
      expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument(); // Account created
    });
  });

  it('handles API error gracefully', async () => {
    const errorMessage = 'Failed to load usage statistics';
    userAPI.getUsageStats.mockRejectedValue(new Error(errorMessage));
    
    render(<UsageMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText(`Error loading usage statistics: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  it('handles zero usage values', async () => {
    const zeroUsageData = {
      data: {
        usage: {
          id: '1',
          messagesThisMonth: 0,
          totalMessages: 0,
          chatbotsCreated: 0,
          storageUsed: 0,
          lastActive: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      },
    };
    
    userAPI.getUsageStats.mockResolvedValue(zeroUsageData);
    
    render(<UsageMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('0 Bytes')).toBeInTheDocument();
      expect(screen.getByText('Never')).toBeInTheDocument(); // Last active
      expect(screen.getAllByText('0.0% used')).toHaveLength(3); // Three metrics with limits
    });
  });

  it('formats bytes correctly for different sizes', async () => {
    const testCases = [
      { bytes: 0, expected: '0 Bytes' },
      { bytes: 1024, expected: '1.00 KB' },
      { bytes: 1024 * 1024, expected: '1.00 MB' },
      { bytes: 1024 * 1024 * 1024, expected: '1.00 GB' },
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const usageData = {
        data: {
          usage: {
            ...mockUsageData.data.usage,
            storageUsed: testCase.bytes,
          },
        },
      };
      
      userAPI.getUsageStats.mockResolvedValue(usageData);
      
      const { unmount } = render(<UsageMonitor />);
      
      await waitFor(() => {
        expect(screen.getByText(testCase.expected)).toBeInTheDocument();
      });
      
      unmount(); // Clear component
    }
  });

  it('displays all required usage metrics', async () => {
    userAPI.getUsageStats.mockResolvedValue(mockUsageData);
    
    render(<UsageMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('Messages This Month')).toBeInTheDocument();
      expect(screen.getByText('Total Messages')).toBeInTheDocument();
      expect(screen.getByText('Chatbots Created')).toBeInTheDocument();
      expect(screen.getByText('Storage Used')).toBeInTheDocument();
      expect(screen.getByText('Last Active')).toBeInTheDocument();
      expect(screen.getByText('Account Created')).toBeInTheDocument();
    });
  });
});