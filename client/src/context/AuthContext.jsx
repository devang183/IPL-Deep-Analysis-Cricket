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
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []); // Only run once on mount

  const login = async (email, password) => {
    try {
      console.log('Login attempt for:', email);
      const response = await axios.post('/api/auth/login', { email, password });
      console.log('Login response:', response.data);
      setToken(response.data.token);
      setUser(response.data.user);
      setLoading(false);
      console.log('After login - token:', response.data.token, 'user:', response.data.user, 'loading:', false);
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
      setUser(response.data.user);
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
    setUser(null);
    localStorage.removeItem('token');
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
