import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../utils/api';

// Auth types
interface User {
  id: number;
  email: string;
  name: string;
  customer_id?: string;
  user_type?: 'customer' | 'business_owner' | 'platform_admin';
  token?: string;
  is_admin?: boolean;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  user_type: 'customer' | 'business_owner';
  gdpr_data_processing_consent: boolean;
  gdpr_marketing_consent: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginRequest) => Promise<string>;
  register: (userData: RegisterRequest) => Promise<string>;
  logout: () => void;
  loginWithGoogle: (userType?: 'customer' | 'business_owner', planCode?: string) => void;
  loginWithFacebook: (userType?: 'customer' | 'business_owner', planCode?: string) => void;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBusinessOwner: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Check for OAuth callback tokens in URL
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        // OAuth callback - store tokens and clear URL
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const userData = await authAPI.getCurrentUser();
          setUser({
            id: userData.id,
            email: userData.email,
            name: userData.first_name || userData.email,
            is_admin: userData.is_admin,
            user_type: userData.user_type,
          });
        } catch (error) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authAPI.login(credentials);
      // Backend returns TokenResponse directly: { access_token, refresh_token, token_type, expires_in }
      localStorage.setItem('auth_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      
      // Get user info after successful login
      const userData = await authAPI.getCurrentUser();
      const newUser = {
        id: userData.id,
        email: userData.email,
        name: userData.first_name || userData.email,
        is_admin: userData.is_admin,
        user_type: userData.user_type,
      };
      setUser(newUser);
      
      // Redirect based on user type
      if (newUser.user_type === 'platform_admin' || newUser.is_admin) {
        return '/admin/dashboard';
      } else if (newUser.user_type === 'business_owner' || userData.is_owner) {
        return '/owner/dashboard';
      } else {
        // Customers stay on homepage
        return '/';
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const response = await authAPI.register(userData);
      // Backend returns AuthResponse: { user: {...}, tokens: {...} }
      localStorage.setItem('auth_token', response.tokens.access_token);
      localStorage.setItem('refresh_token', response.tokens.refresh_token);
      const newUser = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.first_name || response.user.email,
        is_admin: response.user.is_admin,
        user_type: response.user.user_type,
      };
      setUser(newUser);
      
      // Redirect based on user type
      if (newUser.user_type === 'platform_admin' || newUser.is_admin) {
        return '/admin/dashboard';
      } else if (newUser.user_type === 'business_owner' || response.user.is_owner) {
        return '/owner/dashboard';
      } else {
        // Customers stay on homepage
        return '/';
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const loginWithGoogle = (userType: 'customer' | 'business_owner' = 'customer', planCode?: string) => {
    // Redirect to Google OAuth endpoint - using full backend URL since OAuth requires server redirect
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';
    const params = new URLSearchParams({ user_type: userType });
    if (planCode) {
      params.append('selected_plan_code', planCode);
    }
    window.location.href = `${apiBase}/auth/google?${params.toString()}`;
  };

  const loginWithFacebook = (userType: 'customer' | 'business_owner' = 'customer', planCode?: string) => {
    // Redirect to Facebook OAuth endpoint - using full backend URL since OAuth requires server redirect
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';
    const params = new URLSearchParams({ user_type: userType });
    if (planCode) {
      params.append('selected_plan_code', planCode);
    }
    window.location.href = `${apiBase}/auth/facebook?${params.toString()}`;
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    loginWithGoogle,
    loginWithFacebook,
    loading,
    isAuthenticated: !!user,
    isAdmin: !!user?.is_admin || user?.user_type === 'platform_admin',
    isBusinessOwner: user?.user_type === 'business_owner',
    isCustomer: user?.user_type === 'customer',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
