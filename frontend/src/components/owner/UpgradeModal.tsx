import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
  message?: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ open, onClose, feature = 'feature', message }) => {
  const navigate = useNavigate();
  const [upgrading, setUpgrading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!open) return null;

  const handleUpgrade = async () => {
    try {
      setUpgrading(true);
      setErrorMessage(null);
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      
      // Get first place
      const placesRes = await fetch(`${apiBase}/owner/places/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });
      const places = placesRes.ok ? await placesRes.json() : [];
      const firstPlaceId = Array.isArray(places) && places.length > 0 ? places[0].id : undefined;
      
      if (!firstPlaceId) {
        setErrorMessage('You need a place to attach the subscription before upgrading.');
        setUpgrading(false);
        return;
      }

      // Perform upgrade
      const upgradeRes = await fetch(`${apiBase}/subscriptions/change-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ place_id: firstPlaceId, plan_code: 'pro', feature_to_enable: feature }),
      });

      if (!upgradeRes.ok) {
        const data = await upgradeRes.json().catch(() => ({}));
        setErrorMessage(data?.detail || 'Upgrade failed. Please try again.');
        setUpgrading(false);
        return;
      }

      // Wait for subscription to be active
      const waitUntilReady = async () => {
        const maxAttempts = 5;
        for (let i = 0; i < maxAttempts; i++) {
          try {
            const st = await fetch(`${apiBase}/subscriptions/status?place_id=${firstPlaceId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
              },
            });
            if (st.ok) {
              const data = await st.json();
              if (data?.status === 'trialing' || data?.status === 'active') return true;
            }
          } catch (_) {}
          await new Promise(r => setTimeout(r, 500));
        }
        return false;
      };

      const ready = await waitUntilReady();
      
      // Close modal and navigate
      onClose();
      
      // Navigate to upgrade page or settings
      const qs = new URLSearchParams();
      if (feature) qs.set('autotoggle', feature);
      if (firstPlaceId) qs.set('placeId', String(firstPlaceId));
      setTimeout(() => navigate(`/owner/settings?${qs.toString()}`), ready ? 500 : 1200);
    } catch (e) {
      setErrorMessage('Upgrade failed. Please try again.');
      setUpgrading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl p-6">
        <h3 className="text-xl font-semibold text-charcoal mb-2">Upgrade to Pro</h3>
        <p className="text-charcoal/80 mb-4">
          {message || `Unlock Pro features to enable ${feature} and more.`}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Basic Plan */}
          <div className="border rounded-lg p-4">
            <div className="font-semibold mb-2">Basic</div>
            <div className="mb-3">
              <div className="text-2xl font-bold text-charcoal">€5,95</div>
              <div className="text-sm text-charcoal/70">per month</div>
              <div className="text-xs text-charcoal/60 mt-1">14-day trial</div>
            </div>
            <ul className="text-sm text-charcoal/80 list-disc pl-4 space-y-1">
              <li>Booking with email notifications</li>
              <li>Services</li>
              <li>Create email campaigns</li>
              <li>Up to 2 employees</li>
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-bright-blue rounded-lg p-4 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="bg-bright-blue text-white px-3 py-1 rounded-full text-xs font-medium">
                Recommended
              </div>
            </div>
            <div className="font-semibold mb-2">Pro</div>
            <div className="mb-3">
              <div className="text-2xl font-bold text-charcoal">€10,95</div>
              <div className="text-sm text-charcoal/70">per month</div>
              <div className="text-xs text-charcoal/60 mt-1">14-day trial</div>
            </div>
            <ul className="text-sm text-charcoal/80 list-disc pl-4 space-y-1">
              <li>Everything in Basic</li>
              <li>SMS and WhatsApp campaigns</li>
              <li>Create Promotions</li>
              <li>Rewards</li>
              <li>Up to 5 employees</li>
            </ul>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={upgrading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            className="btn-primary"
            disabled={upgrading}
          >
            {upgrading ? 'Upgrading...' : 'Upgrade to Pro'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;

