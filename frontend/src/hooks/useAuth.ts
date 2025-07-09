import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: string;
  tenantId: string;
  permissions?: string[];
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface LoginData {
  email: string;
  password: string;
  mfaCode?: string;
  tenantId?: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  tenantId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<{ requiresMFA?: boolean }>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loginWithOAuth: (provider: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const refreshTokenStored = localStorage.getItem('refreshToken');

      if (token && refreshTokenStored) {
        try {
          // Verify token by fetching user profile
          const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.data.user);
          } else if (response.status === 401) {
            // Token expired, try to refresh
            await refreshToken();
          } else {
            // Invalid token, clear storage
            clearAuthData();
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          clearAuthData();
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const clearAuthData = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const login = async (data: LoginData): Promise<{ requiresMFA?: boolean }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Login failed');
      }

      if (result.requiresMFA) {
        return { requiresMFA: true };
      }

      // Store tokens
      localStorage.setItem('accessToken', result.data.tokens.accessToken);
      localStorage.setItem('refreshToken', result.data.tokens.refreshToken);

      setUser(result.data.user);
      return {};
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      // Store tokens
      localStorage.setItem('accessToken', result.data.tokens.accessToken);
      localStorage.setItem('refreshToken', result.data.tokens.refreshToken);

      setUser(result.data.user);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearAuthData();
      navigate('/');
    }
  };

  const loginWithOAuth = async (provider: string): Promise<void> => {
    try {
      // Get authorization URL
      const authResponse = await fetch(
        `${API_BASE_URL}/oauth/authorize/${provider}?` +
        new URLSearchParams({
          redirect_uri: `${window.location.origin}/auth/callback`,
          state: generateRandomState(),
        })
      );

      const authData = await authResponse.json();

      if (!authResponse.ok) {
        throw new Error(authData.message || 'OAuth authorization failed');
      }

      // Store state for verification
      localStorage.setItem('oauthState', authData.data.state);

      // Redirect to OAuth provider
      window.location.href = authData.data.authorizationUrl;
    } catch (error) {
      console.error('OAuth login failed:', error);
      throw error;
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      const refreshTokenStored = localStorage.getItem('refreshToken');
      if (!refreshTokenStored) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenStored }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Token refresh failed');
      }

      // Update stored tokens
      localStorage.setItem('accessToken', result.data.token);
      localStorage.setItem('refreshToken', result.data.refreshToken);

      // Fetch updated user profile
      const profileResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${result.data.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setUser(profileData.data.user);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuthData();
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return user.permissions?.includes(permission) || false;
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const generateRandomState = (): string => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    loginWithOAuth,
    refreshToken,
    hasPermission,
    hasRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthProvider;