import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountDeletion from './AccountDeletion';
import { userAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

// Mock the API and Auth context
jest.mock('../../utils/api', () => ({
  userAPI: {
    deleteAccount: jest.fn(),
  },
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('AccountDeletion', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });
  });

  it('renders account deletion component', () => {
    render(<AccountDeletion />);
    
    expect(screen.getByText('Delete Account')).toBeInTheDocument();
    expect(screen.getByText('Permanently delete your account and all associated data')).toBeInTheDocument();
    expect(screen.getByText('Delete Account')).toBeInTheDocument();
  });

  it('displays warning information', () => {
    render(<AccountDeletion />);
    
    expect(screen.getByText('Before you delete your account')).toBeInTheDocument();
    expect(screen.getByText('• Consider exporting your data first')).toBeInTheDocument();
    expect(screen.getByText('• Remove chatbot embeds from your websites')).toBeInTheDocument();
    expect(screen.getByText('• This action is permanent and cannot be reversed')).toBeInTheDocument();
    expect(screen.getByText('• All your chatbots will immediately stop working')).toBeInTheDocument();
  });

  it('displays account information', () => {
    render(<AccountDeletion />);
    
    expect(screen.getByText('Account to be deleted:')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('1/1/2024')).toBeInTheDocument();
  });

  it('shows confirmation dialog when delete button is clicked', () => {
    render(<AccountDeletion />);
    
    const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
    fireEvent.click(deleteButton);
    
    expect(screen.getByText('Confirm Account Deletion')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone!')).toBeInTheDocument();
    expect(screen.getByText('To confirm deletion, please type your email address:')).toBeInTheDocument();
  });

  it('displays detailed deletion warning in confirmation dialog', () => {
    render(<AccountDeletion />);
    
    const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
    fireEvent.click(deleteButton);
    
    expect(screen.getByText('Deleting your account will permanently remove:')).toBeInTheDocument();
    expect(screen.getByText('• Your profile and account information')).toBeInTheDocument();
    expect(screen.getByText('• All chatbots and their configurations')).toBeInTheDocument();
    expect(screen.getByText('• Conversation history and analytics data')).toBeInTheDocument();
    expect(screen.getByText('• Usage statistics and preferences')).toBeInTheDocument();
    expect(screen.getByText('• Any embedded chatbots will stop working')).toBeInTheDocument();
  });

  it('requires email confirmation to enable delete button', () => {
    render(<AccountDeletion />);
    
    const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
    fireEvent.click(deleteButton);
    
    const confirmDeleteButton = screen.getByRole('button', { name: /Delete My Account/i });
    expect(confirmDeleteButton).toBeDisabled();
    
    const emailInput = screen.getByPlaceholderText('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    expect(confirmDeleteButton).not.toBeDisabled();
  });

  it('shows error for incorrect email confirmation', () => {
    render(<AccountDeletion />);
    
    const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
    fireEvent.click(deleteButton);
    
    const emailInput = screen.getByPlaceholderText('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    
    const confirmDeleteButton = screen.getByRole('button', { name: /Delete My Account/i });
    fireEvent.click(confirmDeleteButton);
    
    expect(screen.getByText('Email confirmation does not match your account email')).toBeInTheDocument();
  });

  it('deletes account successfully and logs out user', async () => {
    userAPI.deleteAccount.mockResolvedValue({ success: true });
    
    render(<AccountDeletion />);
    
    const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
    fireEvent.click(deleteButton);
    
    const emailInput = screen.getByPlaceholderText('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const confirmDeleteButton = screen.getByRole('button', { name: /Delete My Account/i });
    fireEvent.click(confirmDeleteButton);
    
    expect(confirmDeleteButton).toHaveTextContent('Deleting Account...');
    
    await waitFor(() => {
      expect(userAPI.deleteAccount).toHaveBeenCalledWith('test@example.com');
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  it('handles account deletion error', async () => {
    const errorMessage = 'Account deletion failed';
    userAPI.deleteAccount.mockRejectedValue(new Error(errorMessage));
    
    render(<AccountDeletion />);
    
    const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
    fireEvent.click(deleteButton);
    
    const emailInput = screen.getByPlaceholderText('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const confirmDeleteButton = screen.getByRole('button', { name: /Delete My Account/i });
    fireEvent.click(confirmDeleteButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(confirmDeleteButton).toHaveTextContent('Delete My Account');
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });

  it('cancels deletion and returns to initial state', () => {
    render(<AccountDeletion />);
    
    const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
    fireEvent.click(deleteButton);
    
    expect(screen.getByText('Confirm Account Deletion')).toBeInTheDocument();
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    
    expect(screen.queryByText('Confirm Account Deletion')).not.toBeInTheDocument();
    expect(screen.getByText('Delete Account')).toBeInTheDocument();
  });

  it('clears form data when canceling', () => {
    render(<AccountDeletion />);
    
    const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
    fireEvent.click(deleteButton);
    
    const emailInput = screen.getByPlaceholderText('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    
    // Go back to confirmation
    fireEvent.click(deleteButton);
    
    const newEmailInput = screen.getByPlaceholderText('test@example.com');
    expect(newEmailInput.value).toBe('');
  });

  it('disables delete button during deletion process', async () => {
    userAPI.deleteAccount.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<AccountDeletion />);
    
    const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
    fireEvent.click(deleteButton);
    
    const emailInput = screen.getByPlaceholderText('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const confirmDeleteButton = screen.getByRole('button', { name: /Delete My Account/i });
    fireEvent.click(confirmDeleteButton);
    
    expect(confirmDeleteButton).toBeDisabled();
    expect(confirmDeleteButton).toHaveTextContent('Deleting Account...');
  });

  it('handles missing user data gracefully', () => {
    useAuth.mockReturnValue({
      user: null,
      logout: mockLogout,
    });
    
    render(<AccountDeletion />);
    
    expect(screen.getByText('Delete Account')).toBeInTheDocument();
    // Should not crash when user is null
  });

  it('displays expected email in confirmation', () => {
    render(<AccountDeletion />);
    
    const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
    fireEvent.click(deleteButton);
    
    expect(screen.getByText('Expected: test@example.com')).toBeInTheDocument();
  });

  it('clears error when starting new deletion attempt', () => {
    render(<AccountDeletion />);
    
    const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
    fireEvent.click(deleteButton);
    
    const emailInput = screen.getByPlaceholderText('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    
    const confirmDeleteButton = screen.getByRole('button', { name: /Delete My Account/i });
    fireEvent.click(confirmDeleteButton);
    
    expect(screen.getByText('Email confirmation does not match your account email')).toBeInTheDocument();
    
    // Change email to correct one - error should clear
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    expect(screen.queryByText('Email confirmation does not match your account email')).not.toBeInTheDocument();
  });
});