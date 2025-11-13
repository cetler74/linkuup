import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserPermissions } from '../../contexts/UserPermissionsContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredFeature: 'bookings' | 'rewards' | 'time_off' | 'campaigns' | 'messaging' | 'notifications';
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredFeature, 
  fallbackPath = '/owner/settings' 
}) => {
  const { isFeatureEnabled, loading, permissions } = useUserPermissions();

  // Show loading while permissions are being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If permissions are not loaded yet, show loading
  if (!permissions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Check if the required feature is enabled
  if (!isFeatureEnabled(requiredFeature)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Feature Not Available
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            This feature requires a subscription. Please upgrade your plan to access this functionality.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = fallbackPath}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            >
              Go to Settings
            </button>
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Feature is enabled, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
