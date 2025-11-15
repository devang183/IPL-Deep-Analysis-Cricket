import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

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
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Constants for session management
  const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity
  const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // Refresh token every 10 minutes

  // Set axios default header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Store refresh token in localStorage
  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }, [refreshToken]);

  // Function to refresh access token using refresh token
  const refreshAccessToken = async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (!storedRefreshToken) {
      console.log('No refresh token available');
      return false;
    }

    try {
      const response = await axios.post('/api/auth/refresh', {
        refreshToken: storedRefreshToken
      });

      setToken(response.data.token);
      setUser(response.data.user);
      console.log('Access token refreshed successfully');
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, logout user
      logout();
      return false;
    }
  };

  // Verify token on mount (only runs once on initial load)
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('token');

      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        const response = await axios.get('/api/auth/verify');
        setToken(storedToken);
        setUser(response.data.user);
      } catch (error) {
        console.error('Token verification failed:', error);
        // Try to refresh the token
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
        }
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []); // Only run once on mount

  // Auto-refresh token before expiry (every 10 minutes)
  useEffect(() => {
    if (!token || !refreshToken) return;

    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing token...');
      refreshAccessToken();
    }, TOKEN_REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, [token, refreshToken]);

  // Track user activity and implement idle timeout
  useEffect(() => {
    if (!token) return;

    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    // Track various user activities
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Check for idle timeout every minute
    const idleCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      if (timeSinceLastActivity > IDLE_TIMEOUT) {
        console.log('Session expired due to inactivity');
        logout();
      }
    }, 60000); // Check every minute

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(idleCheckInterval);
    };
  }, [token, lastActivity]);

  const login = async (email, password) => {
    try {
      console.log('Login attempt for:', email);
      const response = await axios.post('/api/auth/login', { email, password });
      console.log('Login response:', response.data);
      setToken(response.data.token);
      setRefreshToken(response.data.refreshToken);
      setUser(response.data.user);
      setLastActivity(Date.now());
      setLoading(false);
      console.log('After login - token:', response.data.token, 'user:', response.data.user);
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Login failed. Please try again.'
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await axios.post('/api/auth/register', { name, email, password });
      console.log('Register response:', response.data);
      setToken(response.data.token);
      setRefreshToken(response.data.refreshToken);
      setUser(response.data.user);
      setLastActivity(Date.now());
      setLoading(false);
      console.log('After register - token:', response.data.token, 'user:', response.data.user);
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Registration failed. Please try again.'
      };
    }
  };

  const logout = () => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user
  };

  console.log('AuthContext value:', {
    hasUser: !!user,
    hasToken: !!token,
    loading,
    isAuthenticated: !!token && !!user
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
