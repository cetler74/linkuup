import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CogIcon,
  BellIcon,
  GiftIcon,
  CalendarIcon,
  MegaphoneIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

interface UserPermissions {
  bookings: boolean;
  rewards: boolean;
  time_off: boolean;
  campaigns: boolean;
  messaging: boolean;
  notifications: boolean;
}

const UserSettingsManagement: React.FC = () => {
  const [permissions, setPermissions] = useState<UserPermissions>({
    bookings: true,
    rewards: false,
    time_off: true,
    campaigns: true,
    messaging: true,
    notifications: true
  });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState<{
    feature: 'rewards' | 'campaigns' | 'messaging' | 'time_off' | null;
  }>({ feature: null });
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetchUserPermissions();
  }, []);

  const fetchUserPermissions = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/v1/owner/user/feature-permissions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.feature_permissions);
      } else {
        throw new Error('Failed to fetch user permissions');
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      setMessage({ type: 'error', text: 'Failed to load user permissions' });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (feature: keyof UserPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const saveUserPermissions = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('http://localhost:5001/api/v1/owner/user/feature-permissions', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(permissions),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'User permissions updated successfully!' });
      } else {
        // Try to parse error detail
        let detail = '';
        try {
          const data = await response.json();
          detail = data?.detail || '';
        } catch (_) {}

        if (detail.startsWith('managed_by_plan: rewards')) {
          navigate('/owner/upgrade?feature=rewards');
          return;
        }
        throw new Error('Failed to update user permissions');
      }
    } catch (error) {
      console.error('Error saving user permissions:', error);
      setMessage({ type: 'error', text: 'Failed to save user permissions' });
    } finally {
      setSaving(false);
    }
  };

  const performUpgradeToPro = async () => {
    try {
      setUpgrading(true);
      const placesRes = await fetch('http://localhost:5001/api/v1/owner/places/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });
      const places = placesRes.ok ? await placesRes.json() : [];
      const firstPlaceId = Array.isArray(places) && places.length > 0 ? places[0].id : undefined;
      if (!firstPlaceId) throw new Error('No place found to upgrade');

      const upgradeRes = await fetch('http://localhost:5001/api/v1/subscriptions/change-plan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ place_id: firstPlaceId, plan_code: 'pro' }),
      });
      if (!upgradeRes.ok) throw new Error('Upgrade failed');

      setShowUpgradeModal({ feature: null });
      setMessage({ type: 'success', text: 'Upgraded to Pro. You can enable Rewards in Feature Settings.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Upgrade failed. Please try again from Manage Plan.' });
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light-gray flex items-center justify-center">
        <div className="text-charcoal">Loading user permissions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-gray p-8">
      {showUpgradeModal.feature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl p-6">
            <h3 className="text-xl font-semibold text-charcoal mb-2">Upgrade to Pro</h3>
            <p className="text-charcoal/80 mb-4">Enable Rewards and other advanced features by upgrading your plan.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border rounded-lg p-4">
                <div className="font-semibold mb-2">Basic</div>
                <ul className="text-sm text-charcoal/80 list-disc pl-4 space-y-1">
                  <li>Booking with email notifications</li>
                  <li>Services</li>
                  <li>Create email campaigns</li>
                  <li>Up to 2 employees</li>
                </ul>
              </div>
              <div className="border rounded-lg p-4">
                <div className="font-semibold mb-2">Pro</div>
                <ul className="text-sm text-charcoal/80 list-disc pl-4 space-y-1">
                  <li>Everything in Basic</li>
                  <li>SMS and WhatsApp campaigns</li>
                  <li>Create Promotions</li>
                  <li>Rewards</li>
                  <li>Up to 5 employees</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUpgradeModal({ feature: null })}
                className="btn-secondary"
                disabled={upgrading}
              >
                Not now
              </button>
              <button
                onClick={performUpgradeToPro}
                className="btn-primary"
                disabled={upgrading}
              >
                {upgrading ? 'Upgrading...' : 'Upgrade to Pro'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal mb-2">User Settings</h1>
          <p className="text-charcoal/70">Manage your account permissions and feature access</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-lime-green/20 text-lime-green border border-lime-green' 
              : 'bg-coral-red/20 text-coral-red border border-coral-red'
          }`}>
            {message.text}
          </div>
        )}

        <div className="card-elevated">
          <div className="flex items-center mb-6">
            <CogIcon className="h-6 w-6 text-bright-blue mr-3" />
            <h2 className="text-xl font-semibold text-charcoal">Feature Permissions</h2>
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
                  checked={permissions.bookings}
                  onChange={() => handlePermissionToggle('bookings')}
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
                  <p className="text-sm text-charcoal/70">Customer loyalty and rewards program</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.rewards}
                  onChange={() => handlePermissionToggle('rewards')}
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
                  checked={permissions.time_off}
                  onChange={() => handlePermissionToggle('time_off')}
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
                  checked={permissions.campaigns}
                  onChange={() => handlePermissionToggle('campaigns')}
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
                  <p className="text-sm text-charcoal/70">Customer communication and messaging</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.messaging}
                  onChange={() => handlePermissionToggle('messaging')}
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
                  <p className="text-sm text-charcoal/70">System notifications and alerts</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.notifications}
                  onChange={() => handlePermissionToggle('notifications')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-medium-gray peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bright-blue/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-medium-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bright-blue"></div>
              </label>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={saveUserPermissions}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsManagement;
