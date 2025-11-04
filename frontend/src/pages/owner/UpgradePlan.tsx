import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const UpgradePlan: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const feature = params.get('feature') || 'rewards';
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [noPlace, setNoPlace] = useState(false);

  const performUpgrade = async () => {
    try {
      setUpgrading(true);
      setMessage(null);
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const placesRes = await fetch(`${apiBase}/owner/places/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });
      const places = placesRes.ok ? await placesRes.json() : [];
      const firstPlaceId = Array.isArray(places) && places.length > 0 ? places[0].id : undefined;
      if (!firstPlaceId) {
        setNoPlace(true);
        setMessage('You need a place to attach the subscription before upgrading.');
        return;
      }

      const upgradeRes = await fetch(`${apiBase}/subscriptions/change-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ place_id: firstPlaceId, plan_code: 'pro', feature_to_enable: feature }),
      });
      if (!upgradeRes.ok) {
        try {
          const data = await upgradeRes.json();
          setMessage(data?.detail || 'Upgrade failed.');
        } catch (_) {
          setMessage('Upgrade failed.');
        }
        return;
      }

      // Wait until subscription status reflects TRIALING/ACTIVE, then enable
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
      const qs = new URLSearchParams();
      if (feature) qs.set('autotoggle', feature);
      if (firstPlaceId) qs.set('placeId', String(firstPlaceId));
      if (!ready) {
        setMessage('Upgraded to Pro. Finalizing setup...');
      }
      setTimeout(() => navigate(`/owner/settings?${qs.toString()}`), ready ? 500 : 1200);
    } catch (e) {
      setMessage('Upgrade failed. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light-gray p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-6">
          <h1 className="text-2xl font-bold text-charcoal mb-2">Upgrade to Pro</h1>
          <p className="text-charcoal/70 mb-4">Unlock Pro features to enable {feature} and more.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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

          {message && (
            <div className="mb-4 p-3 rounded border text-sm" style={{borderColor:'#E0E0E0', color:'#2a2a2e'}}>
              {message}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => navigate(-1)} className="btn-secondary">Back</button>
            {noPlace ? (
              <button onClick={() => navigate('/owner/create-first-place')} className="btn-primary">
                Create a Place
              </button>
            ) : (
              <button onClick={performUpgrade} className="btn-primary" disabled={upgrading}>
              {upgrading ? 'Upgrading…' : 'Upgrade to Pro'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePlan;


