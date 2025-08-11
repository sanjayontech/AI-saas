import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Settings from './Settings';

// Mock the AuthContext
const mockUpdateProfile = jest.fn();
const mockUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  preferences: {
    theme: 'dark',
    language: 'en',
    timezone: 'America/New_York',
    emailNotifications: false,
    usageAlerts: true,
    weeklyReports: true,
    dataCollection: false
  }
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    updateProfile: mockUpdateProfile
  })
}));

// Mock the ChangePasswordForm component
jest.mock('../../components/Auth/ChangePasswordForm', () => {
  return function MockChangePasswordForm({ onClose }) {
    return (
      <div data-testid="change-password-form">
        <button onClick={onClose}>Close Password Form</button>
      </div>
    );
  };
});

const MockedSettings = () => (
  <BrowserRouter>
    <Settings />
  </BrowserRouter>
);

describe('Settings', () => {
  beforeEach(() => {
    mockUpdateProfile.mockClear();
  });

  it('renders settings page correctly', () => {
    render(<MockedSettings />);
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Privacy & Security')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('loads user preferences correctly', () => {
    render(<MockedSettings />);
    
    // Check that checkboxes reflect user preferences
    const emailNotificationsCheckbox = screen.getByRole('checkbox', { name: /email notifications/i });
    const usageAlertsCheckbox = screen.getByRole('checkbox', { name: /usage alerts/i });
    const weeklyReportsCheckbox = screen.getByRole('checkbox', { name: /weekly reports/i });
    const dataCollectionCheckbox = screen.getByRole('checkbox', { name: /data collection/i });

    expect(emailNotificationsCheckbox).not.toBeChecked();
    expect(usageAlertsCheckbox).toBeChecked();
    expect(weeklyReportsCheckbox).toBeChecked();
    expect(dataCollectionCheckbox).not.toBeChecked();
  });

  it('updates notification preferences', () => {
    render(<MockedSettings />);
    
    const emailNotificationsCheckbox = screen.getByRole('checkbox', { name: /email notifications/i });
    fireEvent.click(emailNotificationsCheckbox);

    expect(emailNotificationsCheckbox).toBeChecked();
  });

  it('shows change password form when button is clicked', () => {
    render(<MockedSettings />);
    
    const changePasswordButton = screen.getByRole('button', { name: /change password/i });
    fireEvent.click(changePasswordButton);

    expect(screen.getByTestId('change-password-form')).toBeInTheDocument();
  });

  it('hides change password form when closed', () => {
    render(<MockedSettings />);
    
    const changePasswordButton = screen.getByRole('button', { name: /change password/i });
    fireEvent.click(changePasswordButton);

    const closeButton = screen.getByText('Close Password Form');
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('change-password-form')).not.toBeInTheDocument();
  });

  it('saves settings successfully', async () => {
    mockUpdateProfile.mockResolvedValueOnce({ success: true });

    render(<MockedSettings />);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        preferences: expect.objectContaining({
          theme: 'dark',
          language: 'en',
          timezone: 'America/New_York'
        })
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/settings saved successfully/i)).toBeInTheDocument();
    });
  });

  it('handles save settings failure', async () => {
    mockUpdateProfile.mockResolvedValueOnce({ success: false, error: 'Save failed' });

    render(<MockedSettings />);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalled();
    });

    // The component doesn't show error messages for failed saves in the current implementation
    // This could be enhanced to show error feedback
  });

  it('shows loading state when saving', async () => {
    mockUpdateProfile.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));

    render(<MockedSettings />);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    expect(screen.getByText('Saving...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });
});