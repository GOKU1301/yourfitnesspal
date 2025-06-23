import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState(() => {
    // Initialize token from localStorage if it exists
    return localStorage.getItem('token');
  });

  // Set auth token in state and axios headers
  const setAuthToken = useCallback((newToken) => {
    if (newToken) {
      axios.defaults.headers.common['x-auth-token'] = newToken;
      localStorage.setItem('token', newToken);
      setTokenState(newToken);
    } else {
      delete axios.defaults.headers.common['x-auth-token'];
      localStorage.removeItem('token');
      setTokenState(null);
      setUser(null);
    }
  }, []);

  // Load user data when token changes
  const loadUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${API_URL}/auth/me`);
      const userData = {
        id: res.data.id || res.data._id,
        name: res.data.name,
        email: res.data.email,
        isAdmin: res.data.isAdmin || false
      };
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Error loading user:', err);
      setAuthToken(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, setAuthToken]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        await loadUser();
      } else {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [token, loadUser]);

  // Login user
  const login = async (email, password) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const res = await axios.post(`${API_URL}/auth/login`, { 
        email, 
        password 
      });
      
      if (!res.data.token) {
        return { success: false, error: 'No authentication token received' };
      }
      
      setAuthToken(res.data.token);
      await loadUser();
      
      return { 
        success: true, 
        user: {
          id: res.data.user?.id || res.data.user?._id,
          name: res.data.user?.name,
          email: res.data.user?.email,
          isAdmin: res.data.user?.isAdmin || false
        } 
      };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  // Logout user
  const logout = useCallback(() => {
    console.log('AuthContext: Logging out user');
    setAuthToken(null);
  }, [setAuthToken]);

  // Set initial auth token if it exists
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['x-auth-token'] = token;
    } else {
      delete axios.defaults.headers.common['x-auth-token'];
    }
  }, [token]);

  // Context value
  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin || false,
    token,
    login,
    logout,
    setAuthToken,
    loadUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
