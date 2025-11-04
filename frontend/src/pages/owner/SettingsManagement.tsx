import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BuildingOfficeIcon, 
  CogIcon, 
  BellIcon,
  GiftIcon,
  CalendarIcon,
  MegaphoneIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOwnerApi } from '../../utils/ownerApi';
import api from '../../utils/api';

interface Place {
  id: number;
  slug?: string; // Optional until migration is run
  name: string;
  location_type: 'fixed' | 'mobile';
  city?: string;
  service_areas?: string[];
}

interface FeatureSettings {
  bookings_enabled: boolean;
  rewards_enabled: boolean;
  time_off_enabled: boolean;
  campaigns_enabled: boolean;
  messaging_enabled: boolean;
  notifications_enabled: boolean;
}

interface RewardSettings {
  calculation_method: string;
  points_per_booking?: number;
  points_per_currency_unit?: number;
  redemption_rules?: any;
  is_active: boolean;
}

const SettingsManagement: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [featureSettings, setFeatureSettings] = useState<FeatureSettings>({
    bookings_enabled: true,
    rewards_enabled: false,
    time_off_enabled: true,
    campaigns_enabled: true,
    messaging_enabled: true,
    notifications_enabled: true
  });
  const [rewardSettings, setRewardSettings] = useState<RewardSettings>({
    calculation_method: 'volume_based',
    points_per_booking: 10,
    points_per_currency_unit: 1,
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const { usePlaces, usePlaceFeatureSettings, useUpdateFeatureSettings, usePlaceRewardSettings, useUpdateRewardSettings } = useOwnerApi();
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  const { data: places = [], isLoading: placesLoading } = usePlaces();
  const { data: settingsData, isLoading: settingsLoading } = usePlaceFeatureSettings(selectedPlace?.id || 0);
  const { data: rewardData, isLoading: rewardLoading } = usePlaceRewardSettings(selectedPlace?.id || 0);
  
  const updateFeatureSettingsMutation = useUpdateFeatureSettings();
  const updateRewardSettingsMutation = useUpdateRewardSettings();

  useEffect(() => {
    if (places.length > 0 && !selectedPlace) {
      setSelectedPlace(places[0]);
    }
  }, [places, selectedPlace]);

  useEffect(() => {
    if (settingsData?.feature_settings) {
      setFeatureSettings(settingsData.feature_settings);
    }
  }, [settingsData]);

  useEffect(() => {
    if (rewardData) {
      setRewardSettings(rewardData);
    }
  }, [rewardData]);

  useEffect(() => {
    setLoading(placesLoading || settingsLoading || rewardLoading);
  }, [placesLoading, settingsLoading, rewardLoading]);

  // Handle auto-toggle from upgrade redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const auto = params.get('autotoggle');
    const placeIdStr = params.get('placeId');
    const placeId = placeIdStr ? parseInt(placeIdStr) : undefined;
    const doRewards = auto === 'rewards' && (placeId || selectedPlace?.id);
    const targetPlaceId = placeId || selectedPlace?.id;
    if (doRewards && targetPlaceId) {
      (async () => {
        try {
          await updateFeatureSettingsMutation.mutateAsync({
            placeId: targetPlaceId,
            settings: { ...featureSettings, rewards_enabled: true },
          });
          // Refetch latest settings
          try {
            const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
            const resp = await fetch(`${apiBase}/owner/places/${targetPlaceId}/settings`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
              },
            });
            if (resp.ok) {
              const data = await resp.json();
              if (data?.feature_settings) setFeatureSettings(data.feature_settings);
            }
          } catch (_) {}
        } finally {
          // Clean URL to avoid loops
          params.delete('autotoggle');
          params.delete('placeId');
          navigate({ pathname: '/owner/settings', search: params.toString() }, { replace: true });
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, selectedPlace?.id]);

  const saveFeatureSettings = async () => {
    if (!selectedPlace) return;
    
    setSaving(true);
    try {
      await updateFeatureSettingsMutation.mutateAsync({
        placeId: selectedPlace.id,
        settings: featureSettings
      });
      alert('Feature settings saved successfully!');
    } catch (error) {
      console.error('Error saving feature settings:', error);
      alert('Error saving feature settings');
    } finally {
      setSaving(false);
    }
  };

  const saveRewardSettings = async () => {
    if (!selectedPlace) return;
    
    setSaving(true);
    try {
      await updateRewardSettingsMutation.mutateAsync({
        placeId: selectedPlace.id,
        settings: rewardSettings
      });
      alert('Reward settings saved successfully!');
    } catch (error) {
      console.error('Error saving reward settings:', error);
      alert('Error saving reward settings');
    } finally {
      setSaving(false);
    }
  };

  const handleFeatureToggle = async (feature: keyof FeatureSettings) => {
    // Intercept enabling Pro-only features and prompt upgrade (rewards, time_off, campaigns, messaging)
    const proOnly: Array<keyof FeatureSettings> = ['rewards_enabled', 'time_off_enabled', 'campaigns_enabled', 'messaging_enabled'];
    const willEnable = !featureSettings[feature];
    if (proOnly.includes(feature) && willEnable && selectedPlace) {
      try {
        // Try saving to detect gating; backend should return 403 with feature_requires_pro if not allowed on Basic
        await api.put(`/owner/places/${selectedPlace.id}/settings/features`, {
          ...featureSettings,
          [feature]: true,
        });
        setFeatureSettings(prev => ({ ...prev, [feature]: true } as FeatureSettings));
        return;
      } catch (e: any) {
        const msg = e?.response?.data?.detail || '';
        if (msg.startsWith('feature_requires_pro')) {
          const pretty = feature === 'rewards_enabled' ? 'Rewards' : feature === 'time_off_enabled' ? 'Employee time-off management' : feature === 'campaigns_enabled' ? 'Campaigns' : 'Messaging';
          const confirm = window.confirm(`${pretty} is available on Pro. Upgrade to Pro and enable it now?`);
          if (confirm) {
            try {
              await api.post('/subscriptions/change-plan', { place_id: selectedPlace.id, plan_code: 'pro' });
              // Retry enabling after upgrade
              await api.put(`/owner/places/${selectedPlace.id}/settings/features`, {
                ...featureSettings,
                [feature]: true,
              });
              setFeatureSettings(prev => ({ ...prev, [feature]: true } as FeatureSettings));
              alert(`Upgraded to Pro and enabled ${pretty}.`);
              return;
            } catch (upgradeErr) {
              alert('Upgrade failed. Please try again.');
              return;
            }
          } else {
            return; // user cancelled
          }
        }
      }
    }

    setFeatureSettings(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const handleRewardSettingChange = (field: keyof RewardSettings, value: any) => {
    setRewardSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bright-blue mx-auto mb-4"></div>
          <p className="text-charcoal/70">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-gray">
      <div className="p-6">
        {/* Place Selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-charcoal mb-2">
            Select Place
          </label>
          <Select
            value={selectedPlace?.id?.toString() || ''}
            onValueChange={(value) => {
              const place = places.find(p => p.id === parseInt(value));
              setSelectedPlace(place || null);
            }}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a place" />
            </SelectTrigger>
            <SelectContent>
              {places.map((place) => (
                <SelectItem key={place.id} value={place.id.toString()}>
                  {place.name} {place.location_type === 'mobile' ? '(Mobile)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Business URL Section */}
        {selectedPlace && (
          <div className="mb-8">
            <div className="card-elevated">
              <div className="flex items-center mb-4">
                <BuildingOfficeIcon className="h-6 w-6 text-bright-blue mr-3" />
                <h2 className="text-xl font-semibold text-charcoal">Business URL</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Your Business URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`linkuup.portugalexpatdirectory.com/${selectedPlace.slug || selectedPlace.id}`}
                      className="flex-1 px-3 py-2 bg-white border border-medium-gray rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-bright-blue focus:border-bright-blue"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`linkuup.portugalexpatdirectory.com/${selectedPlace.slug || selectedPlace.id}`)}
                      className="px-4 py-2 bg-bright-blue text-white rounded-lg hover:bg-bright-blue/90 transition-colors font-medium"
                    >
                      {copied ? 'Copied!' : 'Copy URL'}
                    </button>
                  </div>
                  <p className="text-sm text-charcoal/70 mt-2">
                    Share this URL with customers or use it for Google Maps, social media, and marketing materials.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Feature Settings */}
          <div className="card-elevated">
            <div className="flex items-center mb-6">
              <CogIcon className="h-6 w-6 text-bright-blue mr-3" />
              <h2 className="text-xl font-semibold text-charcoal">Feature Settings</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-charcoal/60 mr-3" />
                  <div>
                    <p className="text-charcoal font-medium">Bookings</p>
                    <p className="text-sm text-charcoal/70">Allow customers to book services</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featureSettings.bookings_enabled}
                    onChange={() => handleFeatureToggle('bookings_enabled')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-medium-gray peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bright-blue/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-medium-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bright-blue"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <GiftIcon className="h-5 w-5 text-charcoal/60 mr-3" />
                  <div>
                    <p className="text-charcoal font-medium">Rewards</p>
                    <p className="text-sm text-charcoal/70">Customer loyalty and points system</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featureSettings.rewards_enabled}
                    onChange={() => handleFeatureToggle('rewards_enabled')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-medium-gray peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bright-blue/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-medium-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bright-blue"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-charcoal/60 mr-3" />
                  <div>
                    <p className="text-charcoal font-medium">Time-off</p>
                    <p className="text-sm text-charcoal/70">Employee time-off management</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featureSettings.time_off_enabled}
                    onChange={() => handleFeatureToggle('time_off_enabled')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-medium-gray peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bright-blue/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-medium-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bright-blue"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <MegaphoneIcon className="h-5 w-5 text-charcoal/60 mr-3" />
                  <div>
                    <p className="text-charcoal font-medium">Campaigns</p>
                    <p className="text-sm text-charcoal/70">Marketing campaigns and promotions</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featureSettings.campaigns_enabled}
                    onChange={() => handleFeatureToggle('campaigns_enabled')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-medium-gray peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bright-blue/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-medium-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bright-blue"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-charcoal/60 mr-3" />
                  <div>
                    <p className="text-charcoal font-medium">Messaging</p>
                    <p className="text-sm text-charcoal/70">Customer communication system</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featureSettings.messaging_enabled}
                    onChange={() => handleFeatureToggle('messaging_enabled')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-medium-gray peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bright-blue/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-medium-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bright-blue"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <BellIcon className="h-5 w-5 text-charcoal/60 mr-3" />
                  <div>
                    <p className="text-charcoal font-medium">Notifications</p>
                    <p className="text-sm text-charcoal/70">Email and SMS notifications</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featureSettings.notifications_enabled}
                    onChange={() => handleFeatureToggle('notifications_enabled')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-medium-gray peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bright-blue/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-medium-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bright-blue"></div>
                </label>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={saveFeatureSettings}
                disabled={saving}
                className="btn-primary w-full"
              >
                {saving ? 'Saving...' : 'Save Feature Settings'}
              </button>
            </div>
          </div>

          {/* Reward Settings */}
          <div className="card-elevated">
            <div className="flex items-center mb-6">
              <GiftIcon className="h-6 w-6 text-coral-red mr-3" />
              <h2 className="text-xl font-semibold text-charcoal">Reward Settings</h2>
            </div>
            
            {featureSettings.rewards_enabled ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Calculation Method
                  </label>
                  <Select
                    value={rewardSettings.calculation_method}
                    onValueChange={(value) => handleRewardSettingChange('calculation_method', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select calculation method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volume_based">Volume Based (Points per Euro)</SelectItem>
                      <SelectItem value="fixed_per_booking">Fixed per Booking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {rewardSettings.calculation_method === 'fixed_per_booking' && (
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">
                      Points per Booking
                    </label>
                    <input
                      type="number"
                      value={rewardSettings.points_per_booking || 10}
                      onChange={(e) => handleRewardSettingChange('points_per_booking', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-medium-gray rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-bright-blue focus:border-bright-blue"
                      min="1"
                    />
                  </div>
                )}

                {rewardSettings.calculation_method === 'volume_based' && (
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">
                      Points per Euro Spent
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={rewardSettings.points_per_currency_unit || 1}
                      onChange={(e) => handleRewardSettingChange('points_per_currency_unit', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-medium-gray rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-bright-blue focus:border-bright-blue"
                      min="0.1"
                    />
                    <p className="text-sm text-charcoal/70 mt-1">
                      Example: 1.0 means 1 point per €1 spent, 2.0 means 2 points per €1 spent
                    </p>
                  </div>
                )}


                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={rewardSettings.is_active}
                      onChange={(e) => handleRewardSettingChange('is_active', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-charcoal">Enable rewards system</span>
                  </label>
                </div>

                <div className="mt-8">
                  <button
                    onClick={saveRewardSettings}
                    disabled={saving}
                    className="btn-secondary w-full"
                  >
                    {saving ? 'Saving...' : 'Save Reward Settings'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <GiftIcon className="h-16 w-16 text-charcoal/40 mx-auto mb-4" />
                <p className="text-charcoal/70">Enable rewards feature to configure settings</p>
                <p className="text-sm text-charcoal/60 mt-1">
                  Turn on the rewards toggle in Feature Settings first
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsManagement;
