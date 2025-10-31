import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate processing payment confirmation
    const processPayment = async () => {
      try {
        // Here you would typically verify the payment with your backend
        // and update the user's subscription status
        
        // For now, we'll just simulate a delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setLoading(false);
      } catch (err) {
        setError('Failed to process payment confirmation');
        setLoading(false);
      }
    };

    processPayment();
  }, []);

  const handleContinue = () => {
    if (user?.user_type === 'business_owner') {
      navigate('/owner/dashboard');
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Processing Payment...
          </h2>
          <p className="text-gray-600">
            Please wait while we confirm your subscription.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Payment Error
          </h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <button
            onClick={() => navigate('/join')}
            className="btn-primary w-full"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h2>
        
        <p className="text-gray-600 mb-6">
          Your subscription has been activated successfully. You can now access all premium features.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={handleContinue}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            Continue to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="btn-secondary w-full"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
