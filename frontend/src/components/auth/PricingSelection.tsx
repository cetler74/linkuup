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
}

const PricingSelection: React.FC<PricingSelectionProps> = ({ 
  onPlanSelect, 
  onBack, 
  loading = false 
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const pricingPlans: PricingPlan[] = [
    {
      id: 'basic',
      name: 'Basic',
      price: 0,
      period: 'month',
      features: [
        'Booking with email notifications',
        'Services',
        'Create Messaging Campaign for emails',
        'Up to 2 employees'
      ],
      trialDays: 14
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 0,
      period: 'month',
      features: [
        'Booking with email notifications',
        'Services',
        'Create Messaging Campaign for emails, SMS and WhatsApp',
        'Create New Promotions',
        'Rewards',
        'Up to 5 employees'
      ],
      isPopular: true,
      trialDays: 14
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
                <div className="text-4xl font-bold text-charcoal">€{plan.price}</div>
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
