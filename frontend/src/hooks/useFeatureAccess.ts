import { useEffect, useState } from 'react';
import api from '../utils/api';

export interface SubscriptionStatus {
  place_id: number;
  plan_code?: string;
  plan_name?: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'none';
  trial_end_at?: string;
  trial_days_remaining?: number;
}

export function useSubscriptionStatus(placeId?: number) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!placeId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    api
      .get('/subscriptions/status', { params: { place_id: placeId } })
      .then((res) => {
        if (!mounted) return;
        setStatus(res.data as SubscriptionStatus);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Failed to load subscription status');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [placeId]);

  const showTrialBanner = !!status && status.status === 'trialing' && (status.trial_days_remaining ?? 0) > 0;

  return { status, loading, error, showTrialBanner };
}


