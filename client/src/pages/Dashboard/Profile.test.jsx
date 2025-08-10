import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Profile from './Profile';

// Mock the AuthContext
const mockUpdateProfile = jest.fn();
const mockUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00.000Z'
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    updateProfile: mockUpdateProfile
  })
}));

const MockedProfile = () => (
  <BrowserRouter>
    <Profile />
  </BrowserRouter>
);

describe('Profile', () => {
  beforeEach(() => {
    mockUpdateProfile.mockClear();
  });

  it('renders profile information correctly', () => {
    render(<MockedProfile />);
    
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('January 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument(); // Email verified
  });

  it('enters edit mode when edit button is clicked', () => {
    render(<MockedProfile />);
    
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('validates form fields in edit mode', async () => {
    render(<MockedProfile />);
    
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    const firstNameInput = screen.getByDisplayValue('Test');
    const saveButton = screen.getByText('Save Changes');

    // Clear first name to trigger validation
    fireEvent.change(firstNameInput, { target: { value: '' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/first name must be at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it('saves profile changes successfully', async () => {
    mockUpdateProfile.mockResolvedValueOnce({
      success: true,
      data: { ...mockUser, firstName: 'Updated' }
    });

    render(<MockedProfile />);
    
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    const firstNameInput = screen.getByDisplayValue('Test');
    const saveButton = screen.getByText('Save Changes');

    fireEvent.change(firstNameInput, { target: { value: 'Updated' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        firstName: 'Updated',
        lastName: 'User',
        email: 'test@example.com'
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
    });
  });

  it('displays error message on save failure', async () => {
    mockUpdateProfile.mockResolvedValueOnce({
      success: false,
      error: 'Update failed'
    });

    render(<MockedProfile />);
    
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('cancels edit mode and resets form', () => {
    render(<MockedProfile />);
    
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    const firstNameInput = screen.getByDisplayValue('Test');
    fireEvent.change(firstNameInput, { target: { value: 'Changed' } });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Should exit edit mode
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });
});