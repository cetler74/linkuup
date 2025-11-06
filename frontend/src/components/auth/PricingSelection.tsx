import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, ArrowRight, Star } from 'lucide-react';
import { billingAPI } from '../../utils/api';

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  period: 'month' | 'year';
  features: string[];
  isPopular?: boolean;
  trialDays?: number;
  revenueCatProductId?: string;
}

interface PricingSelectionProps {
  onPlanSelect: (plan: PricingPlan) => void;
  onBack?: () => void;
  loading?: boolean;
  dataConsent?: boolean;
  onDataConsentChange?: (consent: boolean) => void;
  onOAuthGoogle?: () => void;
  onOAuthFacebook?: () => void;
  showOAuth?: boolean;
  error?: string;
  onManualRegister?: () => void;
  showManualForm?: boolean;
  wideCards?: boolean; // If true, cards are 3x wider (1 column instead of 3)
}

const PricingSelection: React.FC<PricingSelectionProps> = ({ 
  onPlanSelect, 
  onBack, 
  loading = false,
  dataConsent = false,
  onDataConsentChange,
  onOAuthGoogle,
  onOAuthFacebook,
  showOAuth = false,
  error,
  onManualRegister,
  showManualForm = false,
  wideCards = false
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [backendPlans, setBackendPlans] = useState<Array<{ code: string; trial_days: number }>>([]);

  // Load plans from backend
  useEffect(() => {
    (async () => {
      try {
        const plansData = await billingAPI.getPlans();
        setBackendPlans(plansData.plans);
      } catch (_) {
        // Silently fail, will use hardcoded plans
      }
    })();
  }, []);

  const pricingPlans: PricingPlan[] = useMemo(() => [
    {
      id: 'basic',
      name: 'Basic',
      price: 5.95,
      period: 'month',
      features: [
        'Calendar support for booking',
        'Free email notifications messages',
        '100 free marketing emails',
        'Unlimited Business locations',
        'Employee management - 2 Emplyees',
        'Email and chat support'
      ],
      trialDays: backendPlans.find(p => p.code === 'basic')?.trial_days
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 10.95,
      period: 'month',
      features: [
        'Calendar support for booking',
        'Free email notifications messages',
        '100 free marketing emails',
        'Unlimited Business locations',
        'Employee management - 10 Emplyees',
        'Rewards program',
        'Campaign program',
        'Employee Time-off Management',
        'Email and chat support'
      ],
      isPopular: true,
      trialDays: backendPlans.find(p => p.code === 'pro')?.trial_days
    }
  ], [backendPlans]);

  const handlePlanSelect = (plan: PricingPlan) => {
    setSelectedPlan(plan.id);
    onPlanSelect(plan);
  };

  return (
    <div className={`w-full mx-auto ${wideCards ? '' : 'max-w-[112rem]'}`}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-charcoal mb-4">
          Choose Your Plan
        </h2>
        <p className="text-charcoal/70 text-lg">
          Select the perfect plan for your business needs. You can change or cancel anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 w-full">
        {pricingPlans.map((plan) => (
          <div
            key={plan.id}
            className={`card hover:scale-105 transition-all duration-300 relative flex flex-col h-full w-full text-left ${
              plan.isPopular ? 'ring-2 ring-bright-blue shadow-elevated' : ''
            } ${selectedPlan === plan.id ? 'ring-2 ring-bright-blue' : ''}`}
            onClick={() => handlePlanSelect(plan)}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-bright-blue text-white px-3 py-1 rounded-full text-xs font-medium">
                  Most Popular
                </div>
              </div>
            )}

            {/* CardHeader */}
            <div className="px-6 pt-6 pb-4">
              <h3 className="font-medium text-xl text-charcoal mb-2">
                {plan.name}
              </h3>
              <div className="text-charcoal/70 text-sm mb-2">
                {plan.originalPrice && plan.originalPrice !== plan.price && (
                  <span className="text-sm text-charcoal/70 line-through mr-2">
                    €{plan.originalPrice}
                  </span>
                )}
                <span className="font-medium text-charcoal text-lg">
                  €{plan.price.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-charcoal/70">/month</span>
                {plan.trialDays && plan.trialDays > 0 ? (
                  <div className="mt-2">
                    <span className="bg-lime-green/20 text-lime-green text-xs font-medium px-2 py-1 rounded-full">
                      {plan.trialDays} day trial
                    </span>
                  </div>
                ) : plan.id === 'pro' ? (
                  <div className="mt-2">
                    <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-full">
                      Payment required
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* CardContent */}
            <div className="px-6 pb-6 flex-1">
              <div className="grid gap-2">
                {plan.features.map((feature, index) => (
                  <div
                    className="flex gap-2 text-charcoal/70 text-sm items-start"
                    key={index}
                  >
                    <CheckCircle className="h-4 w-4 text-bright-blue flex-none mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CardFooter */}
            <div className="px-6 pb-6 mt-auto">
              <button
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  selectedPlan === plan.id || plan.isPopular
                    ? 'bg-bright-blue text-white hover:bg-bright-blue/90'
                    : 'bg-gray-100 text-charcoal hover:bg-gray-200'
                }`}
                disabled={loading}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlanSelect(plan);
                }}
              >
                {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                {selectedPlan === plan.id && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Data Consent Section for Business Owners */}
      <div className="space-y-4 border-t pt-6 mt-6 mb-6">
        <h3 className="text-lg font-semibold text-white">Data Processing Consent</h3>
        <div className="space-y-2">
          <div className="flex items-start">
            <div className="flex items-center h-5 mt-1">
              <input
                id="gdpr_data_processing_consent"
                type="checkbox"
                checked={dataConsent}
                onChange={(e) => onDataConsentChange?.(e.target.checked)}
                className="h-4 w-4 border-gray-300 rounded focus:ring-2 text-charcoal"
                style={{color: '#2a2a2e'}}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="gdpr_data_processing_consent" className="font-medium text-white">
                Data Processing Consent <span className="text-red-500">*</span>
              </label>
              <p className="text-white text-xs mt-1">
                I consent to my personal data being processed and used internally by LinkUup to provide the requested services, including account management, bookings and service-related communication.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* OAuth Buttons (shown after plan selection and data consent) */}
      {showOAuth && selectedPlan && dataConsent && !showManualForm && (
        <div className="mb-6">
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onOAuthGoogle}
              disabled={loading}
              className="w-full inline-flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={onOAuthFacebook}
              disabled={loading}
              className="w-full inline-flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>
          {onManualRegister && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={onManualRegister}
                className="text-sm text-white hover:underline"
              >
                Or register manually
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center">
        {onBack && (
          <button
            onClick={onBack}
            className="btn-secondary flex items-center gap-2 text-white"
            disabled={loading}
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to Registration
          </button>
        )}

        {selectedPlan && (
          <div className="flex items-center gap-2 text-sm text-white">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>You can upgrade or downgrade anytime</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingSelection;
