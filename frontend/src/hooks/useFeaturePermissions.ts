import { useUserPermissions } from '../contexts/UserPermissionsContext';

/**
 * Hook to check if a specific feature is enabled for the current user
 * @param feature - The feature to check
 * @returns boolean indicating if the feature is enabled
 */
export const useFeaturePermission = (feature: keyof ReturnType<typeof useUserPermissions>['permissions']): boolean => {
  const { isFeatureEnabled } = useUserPermissions();
  return isFeatureEnabled(feature);
};

/**
 * Hook to check if multiple features are enabled
 * @param features - Array of features to check
 * @param requireAll - If true, all features must be enabled. If false, any feature being enabled returns true
 * @returns boolean indicating if the permission check passes
 */
export const useMultipleFeaturePermissions = (
  features: Array<keyof ReturnType<typeof useUserPermissions>['permissions']>,
  requireAll: boolean = false
): boolean => {
  const { isFeatureEnabled } = useUserPermissions();
  
  if (requireAll) {
    return features.every(feature => isFeatureEnabled(feature));
  } else {
    return features.some(feature => isFeatureEnabled(feature));
  }
};

/**
 * Hook to get a list of enabled features
 * @returns Array of enabled feature names
 */
export const useEnabledFeatures = (): Array<keyof ReturnType<typeof useUserPermissions>['permissions']> => {
  const { permissions } = useUserPermissions();
  
  if (!permissions) return [];
  
  return Object.entries(permissions)
    .filter(([_, enabled]) => enabled)
    .map(([feature, _]) => feature as keyof ReturnType<typeof useUserPermissions>['permissions']);
};

/**
 * Hook to get a list of disabled features
 * @returns Array of disabled feature names
 */
export const useDisabledFeatures = (): Array<keyof ReturnType<typeof useUserPermissions>['permissions']> => {
  const { permissions } = useUserPermissions();
  
  if (!permissions) return [];
  
  return Object.entries(permissions)
    .filter(([_, enabled]) => !enabled)
    .map(([feature, _]) => feature as keyof ReturnType<typeof useUserPermissions>['permissions']);
};
