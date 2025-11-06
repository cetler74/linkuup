import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import OAuthButtons from './OAuthButtons';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle, loginWithFacebook } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const redirectPath = await login(formData); // Call login and get the redirect path
      if (redirectPath) {
        navigate(redirectPath);
      }
    } catch (err: any) {
      // Extract the error message from the backend response
      const errorMessage = err.response?.data?.error || err.message || 'Login failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle card hover for background effects
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('cardHover', { 
      detail: { 
        hovered: true,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      } 
    }));
  };

  const handleMouseLeave = () => {
    window.dispatchEvent(new CustomEvent('cardHover', { 
      detail: { hovered: false } 
    }));
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Form Container - Modern design matching forms_template */}
      <div 
        className="bg-white rounded-lg shadow-form p-6 sm:p-8 md:p-10"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 text-charcoal font-display">
            {t('auth.login')}
          </h2>
        </div>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
        <div className="space-y-4 sm:space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-charcoal">
              {t('auth.email')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-charcoal/60" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input-field pl-10 pr-3"
                placeholder={t('auth.email')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2 text-charcoal">
              {t('auth.password')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-charcoal/60" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="input-field pl-10 pr-10"
                placeholder={t('auth.password')}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-charcoal/60 hover:text-charcoal transition-colors duration-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
          </div>

          {/* OAuth Buttons */}
          <OAuthButtons 
            onGoogleLogin={loginWithGoogle}
            onFacebookLogin={loginWithFacebook}
            loading={loading}
          />

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? t('auth.loading') : t('auth.login')}
            </button>
          </div>

          <div className="text-center pt-4">
            <Link
              to="/join"
              className="text-sm font-medium hover:opacity-75 transition-opacity duration-200"
              style={{color: '#2a2a2e'}}
            >
              {t('auth.switchToRegister')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
