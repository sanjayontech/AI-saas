import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/admin/dashboard' }),
}));

const renderAdminLayout = (children = <div>Test Content</div>) => {
  return render(
    <BrowserRouter>
      <AdminLayout>{children}</AdminLayout>
    </BrowserRouter>
  );
};

describe('AdminLayout', () => {
  beforeEach(() => {
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

  it('renders admin layout with navigation', () => {
    renderAdminLayout();

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('displays admin user information', () => {
    renderAdminLayout();

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    expect(screen.getByText('AU')).toBeInTheDocument(); // Initials
  });

  it('handles logout', () => {
    renderAdminLayout();

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(localStorage.getItem('adminToken')).toBeNull();
    expect(localStorage.getItem('adminRefreshToken')).toBeNull();
    expect(localStorage.getItem('adminUser')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/admin/login');
  });

  it('redirects to login if no admin token', () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');

    renderAdminLayout();

    expect(mockNavigate).toHaveBeenCalledWith('/admin/login');
  });

  it('redirects to login if invalid user data', () => {
    localStorage.setItem('adminUser', 'invalid-json');

    renderAdminLayout();

    expect(mockNavigate).toHaveBeenCalledWith('/admin/login');
  });

  it('handles mobile sidebar toggle', () => {
    renderAdminLayout();

    // Mobile menu button should be present but hidden on desktop
    const mobileMenuButtons = screen.getAllByRole('button');
    const menuButton = mobileMenuButtons.find(button => 
      button.querySelector('svg') && 
      button.querySelector('svg').getAttribute('viewBox') === '0 0 24 24'
    );

    expect(menuButton).toBeInTheDocument();
  });

  it('renders navigation links with correct hrefs', () => {
    renderAdminLayout();

    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    const userManagementLink = screen.getByRole('link', { name: /user management/i });
    const systemHealthLink = screen.getByRole('link', { name: /system health/i });

    expect(dashboardLink).toHaveAttribute('href', '/admin/dashboard');
    expect(userManagementLink).toHaveAttribute('href', '/admin/users');
    expect(systemHealthLink).toHaveAttribute('href', '/admin/health');
  });

  it('highlights active navigation item', () => {
    renderAdminLayout();

    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveClass('bg-gray-100', 'text-gray-900');
  });

  it('renders children content', () => {
    const testContent = <div data-testid="test-content">Custom Content</div>;
    renderAdminLayout(testContent);

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Custom Content')).toBeInTheDocument();
  });
});