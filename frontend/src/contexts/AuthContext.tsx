import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authAPI } from '../utils/api';
import mixpanel from '../utils/mixpanel';

// Auth types
interface User {
  id: number;
  email: string;
  name: string;
  customer_id?: string;
  user_type?: 'customer' | 'business_owner' | 'platform_admin' | 'employee';
  token?: string;
  is_admin?: boolean;
  profile_picture?: string;
  oauth_provider?: string;
  oauth_id?: string;
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
        console.log('✅ OAuth tokens received, storing in localStorage');
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          console.log('🔑 Token found, fetching user data...');
          const userData = await authAPI.getCurrentUser();
          console.log('✅ User data fetched:', userData);
          const identifiedUser = {
            id: userData.id,
            email: userData.email,
            name: userData.first_name || userData.email,
            is_admin: userData.is_admin,
            user_type: userData.user_type,
            profile_picture: (userData as any).profile_picture,
            oauth_provider: (userData as any).oauth_provider,
            oauth_id: (userData as any).oauth_id,
          };
          setUser(identifiedUser);
          
          // Identify user in Mixpanel
          mixpanel.identify(String(userData.id));
          mixpanel.people.set({
            $email: userData.email,
            $name: userData.first_name || userData.email,
            user_type: userData.user_type,
            is_admin: userData.is_admin,
          });
          
          console.log('✅ User logged in successfully');
        } catch (error: any) {
          console.error('❌ Failed to fetch user data:', error);
          console.error('❌ Error details:', error.response?.data || error.message);
          // Don't remove tokens immediately - might be a temporary network issue
          // Only remove if it's an authentication error
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.error('❌ Authentication failed, removing tokens');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
          }
        }
      } else {
        console.log('ℹ️ No token found in localStorage');
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authAPI.login(credentials);
      // Backend returns TokenResponse directly: { access_token, refresh_token, token_type, expires_in }
      // But API type says AuthResponse with tokens object - handle both cases
      const accessToken = response.tokens?.access_token || (response as any).access_token;
      const refreshToken = response.tokens?.refresh_token || (response as any).refresh_token;
      localStorage.setItem('auth_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      
      // Get user info after successful login
      const userData = await authAPI.getCurrentUser();
      const newUser = {
        id: userData.id,
        email: userData.email,
        name: userData.first_name || userData.email,
        is_admin: userData.is_admin,
        user_type: userData.user_type,
        profile_picture: (userData as any).profile_picture,
        oauth_provider: (userData as any).oauth_provider,
        oauth_id: (userData as any).oauth_id,
      };
      setUser(newUser);
      
      // If user is a business owner, fetch notification count on login
      if (newUser.user_type === 'business_owner') {
        try {
          const { ownerAPI } = await import('../utils/api');
          await ownerAPI.getUnreadNotificationCount();
          // Notification count is fetched - NotificationBell component will pick it up on refresh
        } catch (error) {
          console.warn('Failed to fetch notification count on login:', error);
          // Don't fail login if notification fetch fails
        }
      }
      
      // Identify user in Mixpanel
      mixpanel.identify(String(userData.id));
      mixpanel.people.set({
        $email: userData.email,
        $name: userData.first_name || userData.email,
        user_type: userData.user_type,
        is_admin: userData.is_admin,
      });
      mixpanel.track('User Logged In', {
        user_type: userData.user_type,
        is_admin: userData.is_admin,
      });
      
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
        profile_picture: (response.user as any).profile_picture,
        oauth_provider: (response.user as any).oauth_provider,
        oauth_id: (response.user as any).oauth_id,
      };
      setUser(newUser);
      
      // Identify user in Mixpanel
      mixpanel.identify(String(response.user.id));
      mixpanel.people.set({
        $email: response.user.email,
        $name: response.user.first_name || response.user.email,
        user_type: response.user.user_type,
        is_admin: response.user.is_admin,
      });
      mixpanel.track('User Registered', {
        user_type: response.user.user_type,
        is_admin: response.user.is_admin,
      });
      
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
    // Track logout event in Mixpanel before clearing
    if (user) {
      mixpanel.track('User Logged Out', {
        user_id: user.id,
        user_type: user.user_type,
      });
    }
    // Reset Mixpanel identity
    mixpanel.reset();
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const loginWithGoogle = (userType: 'customer' | 'business_owner' | any = 'customer', planCode?: string) => {
    // Redirect to Google OAuth endpoint - need absolute URL for window.location.href
    let apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    // If relative URL, make it absolute using current origin
    if (apiBase.startsWith('/')) {
      apiBase = `${window.location.origin}${apiBase}`;
    }
    
    // Ensure userType is a valid string value
    let validUserType: 'customer' | 'business_owner' = 'customer';
    if (typeof userType === 'string' && (userType === 'customer' || userType === 'business_owner')) {
      validUserType = userType;
    }
    
    const params = new URLSearchParams({ user_type: validUserType });
    if (planCode && typeof planCode === 'string') {
      params.append('selected_plan_code', planCode);
    }
    window.location.href = `${apiBase}/auth/google?${params.toString()}`;
  };

  const loginWithFacebook = (userType: 'customer' | 'business_owner' | any = 'customer', planCode?: string) => {
    // Redirect to Facebook OAuth endpoint - need absolute URL for window.location.href
    let apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    // If relative URL, make it absolute using current origin
    if (apiBase.startsWith('/')) {
      apiBase = `${window.location.origin}${apiBase}`;
    }
    
    // Ensure userType is a valid string value
    let validUserType: 'customer' | 'business_owner' = 'customer';
    if (typeof userType === 'string' && (userType === 'customer' || userType === 'business_owner')) {
      validUserType = userType;
    }
    
    const params = new URLSearchParams({ user_type: validUserType });
    if (planCode && typeof planCode === 'string') {
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
