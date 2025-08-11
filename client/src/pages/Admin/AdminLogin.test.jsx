import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminLogin } from './AdminLogin';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock fetch
global.fetch = jest.fn();

const renderAdminLogin = () => {
  return render(
    <BrowserRouter>
      <AdminLogin />
    </BrowserRouter>
  );
};

describe('AdminLogin', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockNavigate.mockClear();
    localStorage.clear();
  });

  it('renders admin login form', () => {
    renderAdminLogin();
    
    expect(screen.getByText('Admin Login')).toBeInTheDocument();
    expect(screen.getByText('Access the administrative dashboard')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('handles successful admin login', async () => {
    const mockResponse = {
      data: {
        user: {
          id: '1',
          email: 'admin@test.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin'
        },
        tokens: {
          accessToken: 'admin-token',
          refreshToken: 'admin-refresh-token'
        }
      }
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderAdminLogin();

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'admin@test.com' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'password123'
        }),
      });
    });

    expect(localStorage.getItem('adminToken')).toBe('admin-token');
    expect(localStorage.getItem('adminRefreshToken')).toBe('admin-refresh-token');
    expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('handles login error', async () => {
    const mockError = {
      error: {
        message: 'Admin access required'
      }
    };

    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => mockError,
    });

    renderAdminLogin();

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'user@test.com' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Admin access required')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows loading state during login', async () => {
    fetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderAdminLogin();

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'admin@test.com' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Signing in...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
  });

  it('validates required fields', () => {
    renderAdminLogin();

    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');

    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});