import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import LoginForm from './LoginForm';

// Mock fetch
global.fetch = jest.fn();

const MockedLoginForm = ({ onToggleMode }) => (
  <BrowserRouter>
    <AuthProvider>
      <LoginForm onToggleMode={onToggleMode} />
    </AuthProvider>
  </BrowserRouter>
);

describe('LoginForm', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('renders login form correctly', () => {
    render(<MockedLoginForm onToggleMode={jest.fn()} />);
    
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<MockedLoginForm onToggleMode={jest.fn()} />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(<MockedLoginForm onToggleMode={jest.fn()} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const mockResponse = {
      success: true,
      data: {
        user: { id: '1', email: 'test@example.com', firstName: 'Test' },
        tokens: { accessToken: 'mock-token' }
      }
    };

    fetch.mockResolvedValueOnce({
      json: async () => mockResponse
    });

    render(<MockedLoginForm onToggleMode={jest.fn()} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        }),
      });
    });
  });

  it('displays error message on login failure', async () => {
    const mockResponse = {
      success: false,
      error: { message: 'Invalid credentials' }
    };

    fetch.mockResolvedValueOnce({
      json: async () => mockResponse
    });

    render(<MockedLoginForm onToggleMode={jest.fn()} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('calls onToggleMode when sign up link is clicked', () => {
    const mockToggle = jest.fn();
    render(<MockedLoginForm onToggleMode={mockToggle} />);
    
    const signUpLink = screen.getByText(/don't have an account/i);
    fireEvent.click(signUpLink);

    expect(mockToggle).toHaveBeenCalled();
  });
});