import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { billingAPI } from '../utils/api';

// Stripe elements are dynamically loaded to avoid dev-server transform errors
const StripePaymentForm: React.FC<{ libs: any }> = ({ libs }) => {
  const stripe = libs.useStripe();
  const elements = libs.useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {},
      redirect: 'if_required',
    });
    setLoading(false);
    if (stripeError) {
      setError(stripeError.message || 'Payment failed');
      return;
    }
    setSucceeded(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <libs.PaymentElement />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button type="submit" disabled={!stripe || loading} className="btn-primary w-full">
        {loading ? 'Processing…' : 'Subscribe'}
      </button>
      {succeeded && (
        <div className="text-green-600 text-sm">Payment succeeded! Your subscription will activate shortly.</div>
      )}
    </form>
  );
};

const BillingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [planCode, setPlanCode] = useState<'basic' | 'pro' | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripeLibs, setStripeLibs] = useState<any | null>(null);
  const [stripePromise, setStripePromise] = useState<any | null>(null);
  const [trialStarted, setTrialStarted] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [changing, setChanging] = useState<boolean>(false);

  // Display reason notice if redirected due to payment requirement
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reason = params.get('reason');
    if (reason === 'payment_required') {
      setNotice('Access to premium features requires a subscription. Select a plan to continue.');
    } else {
      setNotice(null);
    }
  }, [location.search]);

  const handleStart = async () => {
    if (!planCode) return;
    try {
      setError(null);
      const res = await billingAPI.createSubscription(planCode);
      setClientSecret(res.clientSecret || null);
      setTrialStarted(Boolean(res.trialStarted));
    } catch (e: any) {
      setError(e?.message || 'Failed to start subscription');
    }
  };

  // After starting a trial (or immediate activation), send user to dashboard
  useEffect(() => {
    if (trialStarted) {
      // slight delay to let any webhook/local state settle
      const t = setTimeout(() => navigate('/owner/dashboard'), 500);
      return () => clearTimeout(t);
    }
  }, [trialStarted, navigate]);

  // Load current subscription to render Manage Plan section
  useEffect(() => {
    (async () => {
      try {
        const sub = await billingAPI.getSubscription();
        setCurrentPlan((sub.planCode as any) || null);
        setSubStatus(sub.status || null);
      } catch (_) {}
    })();
  }, []);

  const handleChangePlan = async (target: 'basic' | 'pro') => {
    try {
      setChanging(true);
      setError(null);
      await billingAPI.changePlan(target);
      // Refresh subscription info
      const sub = await billingAPI.getSubscription();
      setCurrentPlan((sub.planCode as any) || null);
      setSubStatus(sub.status || null);
      setNotice(`Plan changed to ${target === 'basic' ? 'Basic' : 'Pro'}. Changes will take effect on your next billing cycle.`);
      // Clear notice after 5 seconds
      setTimeout(() => setNotice(null), 5000);
    } catch (e: any) {
      setError(e?.message || 'Failed to change plan');
    } finally {
      setChanging(false);
    }
  };

  // Load Stripe libraries dynamically only in browser and when needed
  useEffect(() => {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
    if (!clientSecret || !publishableKey) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ loadStripe }, reactStripe] = await Promise.all([
          import('@stripe/stripe-js'),
          import('@stripe/react-stripe-js')
        ]);
        if (cancelled) return;
        setStripeLibs(reactStripe);
        const promise = await loadStripe(publishableKey);
        setStripePromise(promise);
      } catch (e) {
        setError('Failed to load payment library');
      }
    })();
    return () => { cancelled = true; };
  }, [clientSecret]);

  const hasActiveSubscription = !!currentPlan;
  const isLoadingSubscription = currentPlan === null && subStatus === null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">{hasActiveSubscription ? 'Your Subscription' : 'Choose your plan'}</h1>
      {notice && (
        <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">{notice}</div>
      )}

      {hasActiveSubscription && (
        <div className="mb-6 card p-4 bg-indigo-50 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Current Plan</div>
              <div className="text-xl font-semibold capitalize text-indigo-900">{currentPlan}</div>
              {subStatus && (
                <div className="text-sm text-gray-600 mt-1">Status: <span className="capitalize">{subStatus}</span></div>
              )}
            </div>
            <div className="text-right">
              {currentPlan === 'basic' && <div className="text-2xl font-extrabold text-indigo-900">€5,95<span className="text-sm font-normal text-gray-600">/month</span></div>}
              {currentPlan === 'pro' && <div className="text-2xl font-extrabold text-indigo-900">€10,95<span className="text-sm font-normal text-gray-600">/month</span></div>}
            </div>
          </div>
        </div>
      )}

      {!hasActiveSubscription && !isLoadingSubscription && (
        <div className="mb-4">
          <div className="text-sm text-gray-600">No active plan yet.</div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`card text-left cursor-pointer transition-all ${
            planCode === 'basic' ? 'ring-2 ring-indigo-600' : ''
          } ${
            hasActiveSubscription && currentPlan === 'basic' ? 'border-2 border-indigo-600 bg-indigo-50' : ''
          }`}
          onClick={() => !hasActiveSubscription && setPlanCode('basic')}
        >
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">Basic</div>
              {hasActiveSubscription && currentPlan === 'basic' && (
                <span className="bg-indigo-600 text-white text-xs font-semibold px-2 py-1 rounded-full">Current Plan</span>
              )}
            </div>
            <div className="mt-2">
              <div className="text-3xl font-extrabold">€5,95</div>
              <div className="text-gray-600">per month</div>
            </div>
            {!hasActiveSubscription && (
              <div className="mt-3 inline-block bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded">10 day trial</div>
            )}
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li>• Single calendar column</li>
              <li>• Free email messages</li>
              <li>• 100 free marketing emails</li>
              <li>• Email and chat support</li>
            </ul>
          </div>
        </div>

        <div
          className={`card text-left border-2 cursor-pointer transition-all ${
            planCode === 'pro' ? 'ring-2 ring-indigo-600 border-indigo-600' : 'border-transparent'
          } ${
            hasActiveSubscription && currentPlan === 'pro' ? 'border-indigo-600 bg-indigo-50' : ''
          }`}
          onClick={() => !hasActiveSubscription && setPlanCode('pro')}
        >
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">Pro</div>
              <div className="flex items-center gap-2">
                {hasActiveSubscription && currentPlan === 'pro' ? (
                  <span className="bg-indigo-600 text-white text-xs font-semibold px-2 py-1 rounded-full">Current Plan</span>
                ) : (
                  <span className="bg-indigo-600 text-white text-xs font-semibold px-2 py-1 rounded-full">Most Popular</span>
                )}
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-extrabold">€10,95</div>
              <div className="text-gray-600">per month</div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li>• Multiple calendar columns</li>
              <li>• Free email messages</li>
              <li>• 100 free marketing emails</li>
              <li>• Rewards program</li>
              <li>• Campaign program</li>
              <li>• Employee Time-off Management</li>
              <li>• 24/7 phone and chat support</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-3">
        {!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY && (
          <div className="p-2 text-red-600 text-sm">Stripe key is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY.</div>
        )}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {trialStarted && (
          <div className="p-2 text-green-600 text-sm">Your 14-day trial has started.</div>
        )}
        
        {/* Show Stripe payment form if clientSecret is set */}
        {clientSecret && stripeLibs && stripePromise ? (
          <stripeLibs.Elements options={{ clientSecret }} stripe={stripePromise}>
            <StripePaymentForm libs={stripeLibs} />
          </stripeLibs.Elements>
        ) : hasActiveSubscription ? (
          /* Show plan management for subscribed users */
          <div>
            <div className="text-sm font-medium text-gray-800 mb-3">Change Plan</div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleChangePlan('basic')}
                disabled={changing || currentPlan === 'basic'}
                className={`btn-secondary ${currentPlan === 'basic' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {changing ? 'Switching...' : currentPlan === 'basic' ? 'Current Plan: Basic' : 'Switch to Basic'}
              </button>
              <button
                onClick={() => handleChangePlan('pro')}
                disabled={changing || currentPlan === 'pro'}
                className={`btn-secondary ${currentPlan === 'pro' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {changing ? 'Switching...' : currentPlan === 'pro' ? 'Current Plan: Pro' : 'Switch to Pro'}
              </button>
            </div>
          </div>
        ) : (
          /* Show subscription flow for non-subscribed users */
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={handleStart}
                disabled={!planCode}
                className={`btn-primary ${!planCode ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {planCode ? 'Continue' : 'Select a plan to continue'}
              </button>
              {planCode && (
                <div className="text-sm text-gray-600">You will confirm payment on the next step.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BillingPage;


