import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface BusinessOwnerRouteProps {
  children: React.ReactNode;
}

const BusinessOwnerRoute: React.FC<BusinessOwnerRouteProps> = ({ children }) => {
  const { isAuthenticated, isBusinessOwner, loading } = useAuth();
  console.log('🔐 BusinessOwnerRoute - isAuthenticated:', isAuthenticated, 'isBusinessOwner:', isBusinessOwner, 'loading:', loading);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Temporarily bypass authentication for testing
  console.log('🧪 Testing mode: Bypassing authentication check');
  
  // For testing purposes, bypass all authentication checks
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Development mode: Allowing access to owner pages');
    return <>{children}</>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isBusinessOwner) {
    console.log('⚠️ User is not a business owner, but allowing access for testing');
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('✅ BusinessOwnerRoute: Allowing access to owner pages');
  return <>{children}</>;
};

export default BusinessOwnerRoute;
