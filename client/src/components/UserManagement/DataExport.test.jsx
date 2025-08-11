import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DataExport from './DataExport';
import { userAPI } from '../../utils/api';

// Mock the API
jest.mock('../../utils/api', () => ({
  userAPI: {
    exportData: jest.fn(),
  },
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement and appendChild/removeChild
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
};

global.document.createElement = jest.fn((tagName) => {
  if (tagName === 'a') {
    return mockLink;
  }
  return {};
});

global.document.body.appendChild = jest.fn();
global.document.body.removeChild = jest.fn();

describe('DataExport', () => {
  const mockExportData = {
    data: {
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
      chatbots: [
        {
          id: '1',
          name: 'Test Bot',
          description: 'A test chatbot',
        },
      ],
      conversations: [
        {
          id: '1',
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
          ],
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders data export component', () => {
    render(<DataExport />);
    
    expect(screen.getByText('Data Export')).toBeInTheDocument();
    expect(screen.getByText('Download all your account data in JSON format')).toBeInTheDocument();
    expect(screen.getByText('Export My Data')).toBeInTheDocument();
  });

  it('displays information about what will be exported', () => {
    render(<DataExport />);
    
    expect(screen.getByText('Your export will include:')).toBeInTheDocument();
    expect(screen.getByText('• Personal profile information')).toBeInTheDocument();
    expect(screen.getByText('• Account preferences and settings')).toBeInTheDocument();
    expect(screen.getByText('• All chatbot configurations and settings')).toBeInTheDocument();
    expect(screen.getByText('• Conversation history and analytics data')).toBeInTheDocument();
    expect(screen.getByText('• Usage statistics and activity logs')).toBeInTheDocument();
  });

  it('displays privacy notice', () => {
    render(<DataExport />);
    
    expect(screen.getByText('Privacy Notice')).toBeInTheDocument();
    expect(screen.getByText(/This export contains all your personal data/)).toBeInTheDocument();
    expect(screen.getByText(/limited to 3 requests per day/)).toBeInTheDocument();
  });

  it('exports data successfully', async () => {
    userAPI.exportData.mockResolvedValue(mockExportData);
    
    render(<DataExport />);
    
    const exportButton = screen.getByText('Export My Data');
    fireEvent.click(exportButton);
    
    expect(exportButton).toHaveTextContent('Exporting Data...');
    
    await waitFor(() => {
      expect(userAPI.exportData).toHaveBeenCalledTimes(1);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockLink.click).toHaveBeenCalledTimes(1);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });
    
    await waitFor(() => {
      expect(screen.getByText('Your data has been exported successfully!')).toBeInTheDocument();
      expect(exportButton).toHaveTextContent('Export My Data');
    });
  });

  it('sets correct download filename with current date', async () => {
    userAPI.exportData.mockResolvedValue(mockExportData);
    
    // Mock current date
    const mockDate = new Date('2024-01-15T10:30:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    
    render(<DataExport />);
    
    const exportButton = screen.getByText('Export My Data');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(mockLink.download).toBe('chatbot-saas-data-export-2024-01-15.json');
    });
    
    jest.restoreAllMocks();
  });

  it('creates JSON blob with correct data', async () => {
    userAPI.exportData.mockResolvedValue(mockExportData);
    
    const mockBlob = jest.fn();
    global.Blob = jest.fn().mockImplementation((data, options) => {
      mockBlob(data, options);
      return { type: options.type };
    });
    
    render(<DataExport />);
    
    const exportButton = screen.getByText('Export My Data');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(mockBlob).toHaveBeenCalledWith(
        [JSON.stringify(mockExportData.data, null, 2)],
        { type: 'application/json' }
      );
    });
  });

  it('handles export error gracefully', async () => {
    const errorMessage = 'Export failed';
    userAPI.exportData.mockRejectedValue(new Error(errorMessage));
    
    render(<DataExport />);
    
    const exportButton = screen.getByText('Export My Data');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(screen.getByText('Export Failed')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(exportButton).toHaveTextContent('Export My Data');
    });
  });

  it('handles rate limit error', async () => {
    const rateLimitError = 'Too many data export requests, please try again tomorrow.';
    userAPI.exportData.mockRejectedValue(new Error(rateLimitError));
    
    render(<DataExport />);
    
    const exportButton = screen.getByText('Export My Data');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(screen.getByText('Export Failed')).toBeInTheDocument();
      expect(screen.getByText(rateLimitError)).toBeInTheDocument();
    });
  });

  it('disables button during export', async () => {
    userAPI.exportData.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<DataExport />);
    
    const exportButton = screen.getByText('Export My Data');
    fireEvent.click(exportButton);
    
    expect(exportButton).toBeDisabled();
    expect(exportButton).toHaveTextContent('Exporting Data...');
  });

  it('clears success message after timeout', async () => {
    userAPI.exportData.mockResolvedValue(mockExportData);
    
    // Mock setTimeout
    jest.useFakeTimers();
    
    render(<DataExport />);
    
    const exportButton = screen.getByText('Export My Data');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(screen.getByText('Your data has been exported successfully!')).toBeInTheDocument();
    });
    
    // Fast-forward time
    jest.advanceTimersByTime(5000);
    
    await waitFor(() => {
      expect(screen.queryByText('Your data has been exported successfully!')).not.toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });

  it('clears error when starting new export', async () => {
    // First export fails
    userAPI.exportData.mockRejectedValueOnce(new Error('First error'));
    
    render(<DataExport />);
    
    const exportButton = screen.getByText('Export My Data');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument();
    });
    
    // Second export succeeds
    userAPI.exportData.mockResolvedValue(mockExportData);
    fireEvent.click(exportButton);
    
    // Error should be cleared immediately when starting new export
    expect(screen.queryByText('First error')).not.toBeInTheDocument();
  });

  it('displays correct file format information', () => {
    render(<DataExport />);
    
    expect(screen.getByText('The export will be downloaded as a JSON file to your device.')).toBeInTheDocument();
  });
});