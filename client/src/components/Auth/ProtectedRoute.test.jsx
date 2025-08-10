import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';

// Mock the AuthContext
const MockAuthProvider = ({ children, mockUser = null, mockLoading = false }) => {
  const mockContextValue = {
    user: mockUser,
    loading: mockLoading,
    isAuthenticated: () => mockUser !== null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateProfile: jest.fn(),
    token: mockUser ? 'mock-token' : null
  };

  return (
    <BrowserRouter>
      <AuthProvider value={mockContextValue}>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('ProtectedRoute', () => {
  it('shows loading spinner when loading', () => {
    render(
      <MockAuthProvider mockLoading={true}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MockAuthProvider>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    const mockUser = { id: '1', email: 'test@example.com', firstName: 'Test' };
    
    render(
      <MockAuthProvider mockUser={mockUser}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MockAuthProvider>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to auth when user is not authenticated', () => {
    render(
      <MockAuthProvider mockUser={null}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MockAuthProvider>
    );

    // Since we're using Navigate, the component won't render the protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});