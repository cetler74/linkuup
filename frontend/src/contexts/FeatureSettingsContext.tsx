import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useOwnerApi } from '../utils/ownerApi';

interface FeatureSettings {
  bookings_enabled: boolean;
  rewards_enabled: boolean;
  time_off_enabled: boolean;
  campaigns_enabled: boolean;
  messaging_enabled: boolean;
  notifications_enabled: boolean;
}

interface FeatureSettingsContextType {
  featureSettings: FeatureSettings | null;
  loading: boolean;
  error: string | null;
  refreshSettings: (placeId: number) => Promise<void>;
  isFeatureEnabled: (feature: keyof FeatureSettings) => boolean;
}

const FeatureSettingsContext = createContext<FeatureSettingsContextType | undefined>(undefined);

interface FeatureSettingsProviderProps {
  children: ReactNode;
  placeId?: number;
}

export const FeatureSettingsProvider: React.FC<FeatureSettingsProviderProps> = ({ 
  children, 
  placeId 
}) => {
  const [featureSettings, setFeatureSettings] = useState<FeatureSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { usePlaceFeatureSettings } = useOwnerApi();

  const { data, isLoading, error: queryError } = usePlaceFeatureSettings(placeId || 0);

  useEffect(() => {
    if (data?.feature_settings) {
      setFeatureSettings(data.feature_settings);
    }
  }, [data]);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  useEffect(() => {
    if (queryError) {
      setError(queryError.message);
    }
  }, [queryError]);

  const refreshSettings = async (newPlaceId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/owner/places/${newPlaceId}/settings`);
      if (response.ok) {
        const data = await response.json();
        setFeatureSettings(data.feature_settings);
      } else {
        throw new Error('Failed to fetch feature settings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const isFeatureEnabled = (feature: keyof FeatureSettings): boolean => {
    if (!featureSettings) return false;
    return featureSettings[feature];
  };

  const value: FeatureSettingsContextType = {
    featureSettings,
    loading,
    error,
    refreshSettings,
    isFeatureEnabled,
  };

  return (
    <FeatureSettingsContext.Provider value={value}>
      {children}
    </FeatureSettingsContext.Provider>
  );
};

export const useFeatureSettings = (): FeatureSettingsContextType => {
  const context = useContext(FeatureSettingsContext);
  if (context === undefined) {
    throw new Error('useFeatureSettings must be used within a FeatureSettingsProvider');
  }
  return context;
};
