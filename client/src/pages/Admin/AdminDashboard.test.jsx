import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/admin/dashboard' }),
}));

// Mock fetch
global.fetch = jest.fn();

const renderAdminDashboard = () => {
  return render(
    <BrowserRouter>
      <AdminDashboard />
    </BrowserRouter>
  );
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockNavigate.mockClear();
    localStorage.setItem('adminToken', 'admin-token');
    localStorage.setItem('adminUser', JSON.stringify({
      id: '1',
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders dashboard with metrics', async () => {
    const mockDashboardData = {
      metrics: {
        totalUsers: 100,
        totalAdmins: 5,
        totalChatbots: 50,
        totalConversations: 200,
        activeUsersToday: 10,
        activeUsersThisWeek: 30,
        activeUsersThisMonth: 60,
        systemHealth: 'healthy'
      },
      recentUsers: [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com'
        }
      ],
      recentActivity: [
        {
          id: '1',
          type: 'login',
          user: { email: 'john@test.com', name: 'John Doe' },
          timestamp: new Date().toISOString(),
          description: 'User logged in'
        }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockDashboardData }),
    });

    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('System overview and management')).toBeInTheDocument();
    });

    // Check metrics cards
    expect(screen.getByText('100')).toBeInTheDocument(); // Total Users
    expect(screen.getByText('5')).toBeInTheDocument(); // Total Admins
    expect(screen.getByText('50')).toBeInTheDocument(); // Total Chatbots
    expect(screen.getByText('Healthy')).toBeInTheDocument(); // System Health

    // Check activity stats
    expect(screen.getByText('10')).toBeInTheDocument(); // Active today
    expect(screen.getByText('30')).toBeInTheDocument(); // Active this week
    expect(screen.getByText('60')).toBeInTheDocument(); // Active this month

    // Check recent users
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    fetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderAdminDashboard();

    expect(screen.getByRole('status')).toBeInTheDocument(); // LoadingSpinner
  });

  it('handles fetch error', async () => {
    const mockError = {
      error: {
        message: 'Failed to fetch dashboard data'
      }
    };

    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => mockError,
    });

    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch dashboard data')).toBeInTheDocument();
    });
  });

  it('redirects to login if no admin token', () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');

    renderAdminDashboard();

    expect(mockNavigate).toHaveBeenCalledWith('/admin/login');
  });

  it('makes correct API call', async () => {
    const mockDashboardData = {
      metrics: {
        totalUsers: 0,
        totalAdmins: 0,
        totalChatbots: 0,
        totalConversations: 0,
        activeUsersToday: 0,
        activeUsersThisWeek: 0,
        activeUsersThisMonth: 0,
        systemHealth: 'healthy'
      },
      recentUsers: [],
      recentActivity: []
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockDashboardData }),
    });

    renderAdminDashboard();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/admin/dashboard', {
        headers: {
          'Authorization': 'Bearer admin-token',
        },
      });
    });
  });

  it('displays system health with correct color', async () => {
    const mockDashboardData = {
      metrics: {
        totalUsers: 0,
        totalAdmins: 0,
        totalChatbots: 0,
        totalConversations: 0,
        activeUsersToday: 0,
        activeUsersThisWeek: 0,
        activeUsersThisMonth: 0,
        systemHealth: 'warning'
      },
      recentUsers: [],
      recentActivity: []
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockDashboardData }),
    });

    renderAdminDashboard();

    await waitFor(() => {
      const healthElement = screen.getByText('Warning');
      expect(healthElement).toBeInTheDocument();
    });
  });
});