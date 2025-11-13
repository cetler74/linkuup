import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegistration, setIsRegistration] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    // Process payment confirmation and check if account was created
    const processPayment = async () => {
      try {
        const sessionId = searchParams.get('session_id');
        const registrationParam = searchParams.get('registration');
        
        // Check if this is a registration flow
        if (registrationParam === 'true' || sessionId) {
          setIsRegistration(true);
          
          // If we have a session_id, verify the payment and create account if needed
          if (sessionId) {
            try {
              // Wait a bit for webhook to process (account creation happens via webhook)
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // If user is not logged in, verify the checkout session and create account if needed
              // This is a fallback in case webhooks fail or aren't configured
              if (!user) {
                try {
                  console.log('🔍 Verifying checkout session and creating account if needed...');
                  const response = await api.post('/billing/verify-checkout-session', {
                    session_id: sessionId
                  });
                  
                  if (response.data?.success) {
                    console.log('✅ Account created/verified:', response.data);
                    setAccountCreated(true);
                    // Try to refresh auth to get the new user
                    // The user will need to log in with their email/password
                  } else {
                    console.log('ℹ️ Account verification result:', response.data);
                    setAccountCreated(true); // Still show success, user can log in
                  }
                } catch (verifyErr: any) {
                  console.error('❌ Error verifying checkout session:', verifyErr);
                  // Continue anyway - user can still log in
                  setAccountCreated(true);
                }
              }
            } catch (err) {
              console.error('Error processing payment:', err);
              // Continue anyway - webhook might still be processing
              setAccountCreated(true);
            }
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error processing payment:', err);
        setError('Failed to process payment confirmation');
        setLoading(false);
      }
    };

    processPayment();
  }, [searchParams, user]);

  const handleContinue = () => {
    if (user?.user_type === 'business_owner') {
      navigate('/owner/dashboard');
    } else if (user?.user_type === 'customer') {
      navigate('/');
    } else {
      // If not logged in, redirect to login
      navigate('/login');
    }
  };

  const handleLogin = () => {
    navigate('/login');
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h2>
        
        {isRegistration && !user ? (
          <>
            <p className="text-gray-600 mb-4">
              Your payment was successful! Your account has been created and your subscription is now active.
            </p>
            <p className="text-gray-600 mb-6 text-sm">
              Please log in with the email and password you used during registration to access your account.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleLogin}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Log In to Your Account
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/')}
                className="btn-secondary w-full"
              >
                Go to Homepage
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              Your subscription has been activated successfully. You can now access all premium features.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleContinue}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {user ? 'Continue to Dashboard' : 'Go to Login'}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/')}
                className="btn-secondary w-full"
              >
                Go to Homepage
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
