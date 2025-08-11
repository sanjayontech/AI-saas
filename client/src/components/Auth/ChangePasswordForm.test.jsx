import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import ChangePasswordForm from './ChangePasswordForm';

// Mock the AuthContext
const mockChangePassword = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    changePassword: mockChangePassword
  })
}));

const MockedChangePasswordForm = ({ onClose }) => (
  <BrowserRouter>
    <ChangePasswordForm onClose={onClose} />
  </BrowserRouter>
);

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    mockChangePassword.mockClear();
  });

  it('renders change password form correctly', () => {
    render(<MockedChangePasswordForm />);
    
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<MockedChangePasswordForm />);
    
    const submitButton = screen.getByRole('button', { name: /change password/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/current password is required/i)).toBeInTheDocument();
      expect(screen.getByText(/new password is required/i)).toBeInTheDocument();
    });
  });

  it('validates new password strength', async () => {
    render(<MockedChangePasswordForm />);
    
    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/^new password$/i);
    const submitButton = screen.getByRole('button', { name: /change password/i });

    fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'weak' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('validates password confirmation', async () => {
    render(<MockedChangePasswordForm />);
    
    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/^new password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByRole('button', { name: /change password/i });

    fireEvent.change(currentPasswordInput, { target: { value: 'OldPassword123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('validates that new password is different from current', async () => {
    render(<MockedChangePasswordForm />);
    
    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/^new password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByRole('button', { name: /change password/i });

    fireEvent.change(currentPasswordInput, { target: { value: 'SamePassword123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'SamePassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'SamePassword123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/new password must be different from current password/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    mockChangePassword.mockResolvedValueOnce({ success: true });

    render(<MockedChangePasswordForm />);
    
    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/^new password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByRole('button', { name: /change password/i });

    fireEvent.change(currentPasswordInput, { target: { value: 'OldPassword123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('OldPassword123', 'NewPassword123');
    });

    await waitFor(() => {
      expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument();
    });
  });

  it('displays error message on change failure', async () => {
    mockChangePassword.mockResolvedValueOnce({
      success: false,
      error: 'Current password is incorrect'
    });

    render(<MockedChangePasswordForm />);
    
    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/^new password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByRole('button', { name: /change password/i });

    fireEvent.change(currentPasswordInput, { target: { value: 'WrongPassword123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    const mockOnClose = jest.fn();
    render(<MockedChangePasswordForm onClose={mockOnClose} />);
    
    const cancelButton = screen.getByText(/cancel/i);
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});