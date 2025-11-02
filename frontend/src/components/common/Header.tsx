import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import CustomLanguageSelector from './CustomLanguageSelector';

const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Safely get auth context with fallback
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    // If useAuth fails, provide fallback values
    console.warn('Header: AuthContext not available, using fallback values');
    authContext = {
      isAuthenticated: false,
      isAdmin: false,
      isBusinessOwner: false,
      isCustomer: false,
      user: null,
      logout: () => {},
      loading: false
    };
  }
  
  const { isAuthenticated, isAdmin, isBusinessOwner, isCustomer, user, logout, loading } = authContext;
  const { t } = useTranslation();

  // Determine dashboard URL based on user type
  const getDashboardUrl = () => {
    if (isAdmin) return '/admin';
    if (isBusinessOwner) return '/owner/dashboard';
    if (isCustomer) return '/customer/dashboard';
    return '/manager'; // Fallback
  };

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <header className="relative z-10 py-6 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <h1 className="text-3xl font-bold text-charcoal font-display">LinkUup.</h1>
            </Link>
          </div>
          <div className="animate-pulse bg-light-gray h-8 w-32 rounded"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="relative z-10 py-6 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 group">
          <h1 className="text-3xl font-bold text-charcoal font-display">LinkUup.</h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link
            to="/search"
            className="text-xl text-charcoal hover:text-bright-blue transition-colors duration-200 font-medium"
          >
            {t('nav.findSalons')}
          </Link>
          <Link
            to="/about"
            className="text-xl text-charcoal hover:text-bright-blue transition-colors duration-200 font-medium"
          >
            {t('nav.about')}
          </Link>
          <Link
            to="/contact"
            className="text-xl text-charcoal hover:text-bright-blue transition-colors duration-200 font-medium"
          >
            {t('nav.contact')}
          </Link>
          <Link
            to="/pricing"
            className="text-xl text-charcoal hover:text-bright-blue transition-colors duration-200 font-medium"
          >
            {t('nav.pricing')}
          </Link>
          {/* Admin Button - Only visible to platform admins */}
          {(isAdmin || (user && user.user_type === 'platform_admin')) && (
            <Link
              to="/admin"
              className="text-xl bg-bright-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 font-semibold"
            >
              Admin Dashboard
            </Link>
          )}
          <CustomLanguageSelector />
        </nav>

        {/* Desktop Actions - Hidden on mobile */}
        <div className="hidden md:flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <Link
                to={getDashboardUrl()}
                className="bg-bright-blue text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors duration-200 font-semibold"
              >
                DASHBOARD
              </Link>
              {isBusinessOwner && (
                <Link
                  to="/billing"
                  className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors duration-200 font-semibold"
                >
                  MANAGE PLAN
                </Link>
              )}
              <button
                onClick={logout}
                className="bg-coral-red text-white px-6 py-3 rounded-lg hover:bg-red-500 transition-colors duration-200 font-semibold"
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-bright-blue text-white px-6 py-1.5 rounded-lg hover:bg-blue-600 transition-colors duration-200 font-semibold"
            >
              LOGIN
            </Link>
          )}
        </div>
        
        {/* Mobile menu button - Only visible on mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden text-charcoal hover:text-bright-blue p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center bg-white/80 backdrop-blur-sm border border-medium-gray"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Menu - Dropdown similar to search filters */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white backdrop-blur-md border-t border-medium-gray shadow-lg">
          <div className="container mx-auto py-4 px-4 space-y-2">
            <Link
              to="/search"
              className="block text-charcoal hover:bg-bright-blue/10 text-xl font-medium transition-all duration-200 py-3 px-4 rounded-lg min-h-[48px] flex items-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('nav.findSalons')}
            </Link>
            <Link
              to="/about"
              className="block text-charcoal hover:bg-bright-blue/10 text-xl font-medium transition-all duration-200 py-3 px-4 rounded-lg min-h-[48px] flex items-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('nav.about')}
            </Link>
            <Link
              to="/contact"
              className="block text-charcoal hover:bg-bright-blue/10 text-xl font-medium transition-all duration-200 py-3 px-4 rounded-lg min-h-[48px] flex items-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('nav.contact')}
            </Link>
            <Link
              to="/pricing"
              className="block text-charcoal hover:bg-bright-blue/10 text-xl font-medium transition-all duration-200 py-3 px-4 rounded-lg min-h-[48px] flex items-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('nav.pricing')}
            </Link>
            
            {/* Admin Button - Only visible to platform admins */}
            {(isAdmin || (user && user.user_type === 'platform_admin')) && (
              <Link
                to="/admin"
                className="block bg-bright-blue text-white hover:bg-blue-600 text-xl font-semibold transition-all duration-200 py-3 px-4 rounded-lg min-h-[48px] flex items-center justify-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Admin Dashboard
              </Link>
            )}
            
            {/* Language Selector */}
            <div className="pt-4 pb-2 border-t border-medium-gray mt-2">
              <div className="px-4">
                <p className="text-sm text-charcoal mb-2 font-medium">Language / Idioma</p>
                <CustomLanguageSelector className="w-full" showFullName={true} />
              </div>
            </div>
            
            {isAuthenticated ? (
              <>
                <Link
                  to={getDashboardUrl()}
                  className="block bg-bright-blue text-white text-center w-full min-h-[48px] py-3 px-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  DASHBOARD
                </Link>
                {isBusinessOwner && (
                  <Link
                    to="/billing"
                    className="block bg-yellow-500 text-white text-center w-full min-h-[48px] py-3 px-4 rounded-lg font-semibold hover:bg-yellow-600 transition-colors mt-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    MANAGE PLAN
                  </Link>
                )}
                <div className="pt-4 pb-2 border-t border-medium-gray mt-2">
                  <p className="text-lg text-charcoal mb-3 px-4">Welcome, {user?.name}</p>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-coral-red text-white text-center min-h-[48px] py-3 px-4 rounded-lg font-semibold hover:bg-red-500 transition-colors"
                  >
                    LOGOUT
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-2 border-t border-medium-gray mt-2">
                <Link
                  to="/login"
                  className="block bg-bright-blue text-white text-center w-full min-h-[24px] py-1.5 px-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  LOGIN
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;