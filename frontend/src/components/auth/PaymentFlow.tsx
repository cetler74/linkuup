import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { PricingPlan } from './PricingSelection';
import { revenueCatService } from '../../services/RevenueCatService';
import type { PurchaseRequest } from '../../services/RevenueCatService';

interface PaymentFlowProps {
  selectedPlan: PricingPlan;
  userEmail: string;
  userId: string;
  onPaymentSuccess: (transactionId: string) => void;
  onPaymentError: (error: string) => void;
  onBack: () => void;
}

const PaymentFlow: React.FC<PaymentFlowProps> = ({
  selectedPlan,
  userEmail,
  userId,
  onPaymentSuccess,
  onPaymentError,
  onBack
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Initialize RevenueCat when component mounts
    const initRevenueCat = async () => {
      const initialized = await revenueCatService.initialize();
      if (!initialized) {
        setError('Payment system initialization failed. Please try again.');
      }
    };

    initRevenueCat();
  }, []);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const purchaseRequest: PurchaseRequest = {
        productId: selectedPlan.revenueCatProductId,
        userId: userId,
        userEmail: userEmail,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        price: selectedPlan.price,
        currency: 'EUR'
      };

      const result = await revenueCatService.initiatePurchase(purchaseRequest);

      if (result.success && result.redirectUrl) {
        setIsRedirecting(true);
        // Redirect to RevenueCat checkout
        window.location.href = result.redirectUrl;
      } else {
        onPaymentError(result.error || 'Payment initiation failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      onPaymentError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-charcoal mb-4">
          Complete Your Subscription
        </h2>
        <p className="text-charcoal/70 text-lg">
          Secure payment powered by RevenueCat
        </p>
      </div>

      {/* Plan Summary */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-charcoal">Selected Plan</h3>
          {selectedPlan.isPopular && (
            <span className="bg-bright-blue text-white px-3 py-1 rounded-full text-sm font-medium">
              Most Popular
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-2xl font-bold text-charcoal">{selectedPlan.name}</div>
            <div className="text-charcoal/70">
              {formatPrice(selectedPlan.price)} per {selectedPlan.period}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-charcoal">
              {formatPrice(selectedPlan.price)}
            </div>
            <div className="text-sm text-charcoal/70">per {selectedPlan.period}</div>
          </div>
        </div>

        {selectedPlan.trialDays && (
          <div className="bg-lime-green/20 text-lime-green text-sm font-medium px-3 py-2 rounded-lg mb-4">
            <CheckCircle className="w-4 h-4 inline mr-2" />
            {selectedPlan.trialDays}-day free trial included
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium text-charcoal mb-2">Plan includes:</div>
          {selectedPlan.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-charcoal/70">
              <CheckCircle className="w-4 h-4 text-bright-blue flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Security Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-charcoal/70 mb-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="font-medium">Secure Payment</span>
        </div>
        <p className="text-sm text-charcoal/60">
          Your payment is processed securely by RevenueCat. We never store your payment information.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Payment Error</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="btn-secondary flex items-center gap-2"
          disabled={loading || isRedirecting}
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to Plans
        </button>

        <button
          onClick={handlePayment}
          disabled={loading || isRedirecting}
          className="btn-primary flex items-center gap-2 min-w-[200px] justify-center"
        >
          {loading || isRedirecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isRedirecting ? 'Redirecting...' : 'Processing...'}
            </>
          ) : (
            <>
              Continue to Payment
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Terms */}
      <div className="text-center mt-6">
        <p className="text-xs text-charcoal/50">
          By continuing, you agree to our Terms of Service and Privacy Policy.
          You can cancel your subscription anytime from your account settings.
        </p>
      </div>
    </div>
  );
};

export default PaymentFlow;
