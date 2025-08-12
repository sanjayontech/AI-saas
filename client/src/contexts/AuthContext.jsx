import React, { createContext, useContext, useState, useEffect } from 'react';
import { userAPI } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        const { user: userData, tokens } = data.data;
        setUser(userData);
        setToken(tokens.accessToken);
        localStorage.setItem('token', tokens.accessToken);
        localStorage.setItem('user', JSON.stringify(userData));
        return { success: true };
      } else {
        return { success: false, error: data.error?.message || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        const { user: newUser, tokens } = data.data;
        setUser(newUser);
        setToken(tokens.accessToken);
        localStorage.setItem('token', tokens.accessToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        return { success: true };
      } else {
        return { success: false, error: data.error?.message || 'Registration failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await userAPI.updateProfile(profileData);
      
      if (response.success) {
        // Update user data with new profile information
        const updatedUser = { ...user, ...profileData };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return { success: true, data: updatedUser };
      } else {
        return { success: false, error: response.error?.message || 'Profile update failed' };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Network error. Please try again.' };
    }
  };

  const loadFullProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      if (response.success) {
        const fullUser = {
          ...response.data.user,
          profile: response.data.profile,
          usage: response.data.usage
        };
        setUser(fullUser);
        localStorage.setItem('user', JSON.stringify(fullUser));
        return { success: true, data: fullUser };
      }
      return { success: false, error: 'Failed to load profile' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error?.message || 'Password change failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const isAuthenticated = () => {
    return token !== null && user !== null;
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    loadFullProfile,
    changePassword,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};