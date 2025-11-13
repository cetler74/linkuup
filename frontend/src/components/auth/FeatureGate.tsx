import React from 'react';
import { useUserPermissions } from '../contexts/UserPermissionsContext';

interface FeatureGateProps {
  children: React.ReactNode;
  feature: keyof ReturnType<typeof useUserPermissions>['permissions'];
  fallback?: React.ReactNode;
  requireAll?: boolean;
  features?: Array<keyof ReturnType<typeof useUserPermissions>['permissions']>;
}

/**
 * Component that conditionally renders children based on feature permissions
 * @param children - Content to render if permission is granted
 * @param feature - Single feature to check
 * @param features - Multiple features to check (used with requireAll)
 * @param requireAll - If true and using features array, all features must be enabled
 * @param fallback - Content to render if permission is denied
 */
const FeatureGate: React.FC<FeatureGateProps> = ({ 
  children, 
  feature, 
  features, 
  requireAll = false, 
  fallback = null 
}) => {
  const { isFeatureEnabled, permissions } = useUserPermissions();

  // If permissions are not loaded yet, don't render anything
  if (!permissions) {
    return null;
  }

  let hasPermission = false;

  if (features && features.length > 0) {
    // Check multiple features
    if (requireAll) {
      hasPermission = features.every(f => isFeatureEnabled(f));
    } else {
      hasPermission = features.some(f => isFeatureEnabled(f));
    }
  } else if (feature) {
    // Check single feature
    hasPermission = isFeatureEnabled(feature);
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

export default FeatureGate;
