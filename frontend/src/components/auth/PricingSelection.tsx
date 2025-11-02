import React, { useState } from 'react';
import { CheckCircle, ArrowRight, Star } from 'lucide-react';

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
  onBack: () => void;
  loading?: boolean;
  dataConsent?: boolean;
  onDataConsentChange?: (consent: boolean) => void;
  onOAuthGoogle?: () => void;
  onOAuthFacebook?: () => void;
  showOAuth?: boolean;
  error?: string;
  onManualRegister?: () => void;
  showManualForm?: boolean;
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
  showManualForm = false
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const pricingPlans: PricingPlan[] = [
    {
      id: 'basic',
      name: 'Basic',
      price: 5.95,
      period: 'month',
      features: [
        'Single calendar column',
        'Free email messages',
        '100 free marketing emails',
        'Email and chat support'
      ],
      trialDays: 10
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 10.95,
      period: 'month',
      features: [
        'Multiple calendar columns',
        'Free email messages',
        '100 free marketing emails',
        'Rewards program',
        'Campaign program',
        'Employee Time-off Management',
        '24/7 phone and chat support'
      ],
      isPopular: true
    }
  ];

  const handlePlanSelect = (plan: PricingPlan) => {
    setSelectedPlan(plan.id);
    onPlanSelect(plan);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-charcoal mb-4">
          Choose Your Plan
        </h2>
        <p className="text-charcoal/70 text-lg">
          Select the perfect plan for your business needs. You can change or cancel anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {pricingPlans.map((plan) => (
          <div
            key={plan.id}
            className={`card hover:scale-105 transition-all duration-300 relative flex flex-col h-full cursor-pointer ${
              plan.isPopular ? 'border-2 border-bright-blue shadow-elevated' : ''
            } ${selectedPlan === plan.id ? 'ring-2 ring-bright-blue' : ''}`}
            onClick={() => handlePlanSelect(plan)}
          >
            {plan.isPopular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-bright-blue text-white px-4 py-2 rounded-full text-sm font-medium">
                  Most Popular
                </div>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-charcoal mb-2">{plan.name}</h3>
              <div className="mb-4">
                {plan.originalPrice && plan.originalPrice !== plan.price && (
                  <span className="text-sm text-charcoal/70 line-through">
                    €{plan.originalPrice}
                  </span>
                )}
                <div className="text-4xl font-bold text-charcoal">€{plan.price.toFixed(2).replace('.', ',')}</div>
                <div className="text-charcoal/70">per {plan.period}</div>
              </div>
              {plan.trialDays && (
                <div className="bg-lime-green/20 text-lime-green text-sm font-medium px-3 py-1 rounded-full inline-block mb-4">
                  {plan.trialDays} day trial
                </div>
              )}
            </div>

            <div className="space-y-4 mb-6 flex-grow">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                  <span className="text-charcoal">{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto">
              <button
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  selectedPlan === plan.id
                    ? 'bg-bright-blue text-white'
                    : 'bg-gray-100 text-charcoal hover:bg-gray-200'
                }`}
                disabled={loading}
              >
                {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Data Consent Section for Business Owners */}
      <div className="space-y-4 border-t pt-6 mt-6 mb-6">
        <h3 className="text-lg font-semibold text-charcoal">Data Processing Consent</h3>
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
              <label htmlFor="gdpr_data_processing_consent" className="font-medium text-charcoal">
                Data Processing Consent <span className="text-red-500">*</span>
              </label>
              <p className="text-charcoal/70 text-xs mt-1">
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
                className="text-sm text-charcoal hover:underline"
              >
                Or register manually
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="btn-secondary flex items-center gap-2"
          disabled={loading}
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to Registration
        </button>

        {selectedPlan && (
          <div className="flex items-center gap-2 text-sm text-charcoal/70">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>You can upgrade or downgrade anytime</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingSelection;
