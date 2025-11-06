import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RegisterForm from '../components/auth/RegisterForm';
import InteractiveBackground from '../components/common/InteractiveBackground';
import Header from '../components/common/Header';
import PricingSelection from '../components/auth/PricingSelection';
import PaymentFlow from '../components/auth/PaymentFlow';
import type { PricingPlan } from '../components/auth/PricingSelection';
import { useAuth } from '../contexts/AuthContext';

type RegistrationStep = 'form' | 'pricing' | 'payment' | 'success';

const JoinPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isTrial = searchParams.get('trial') === 'true';
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(isTrial ? 'pricing' : 'form');
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [dataConsent, setDataConsent] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [error, setError] = useState('');
  const { loginWithGoogle, loginWithFacebook } = useAuth();

  const handleSwitchToLogin = () => {
    // Redirect to login page
    window.location.href = '/login';
  };

  const handleRegistrationSuccess = (user: any, userType: string) => {
    setRegisteredUser(user);
    if (userType === 'business_owner') {
      // If we have a selected plan (from trial flow), proceed to payment
      if (selectedPlan) {
        setCurrentStep('payment');
      } else {
        setCurrentStep('pricing');
      }
    } else {
      setCurrentStep('success');
    }
  };

  const handlePlanSelect = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setError(''); // Clear any previous errors
    // Don't change step - keep pricing visible to show OAuth options
    // This matches the login page flow
  };

  const handleDataConsentChange = (consent: boolean) => {
    setDataConsent(consent);
    setError(''); // Clear any previous errors
  };

  const handleManualRegister = () => {
    setShowManualForm(true);
    setCurrentStep('form');
  };

  const handlePaymentSuccess = (_transactionId: string) => {
    setCurrentStep('success');
  };

  const handlePaymentError = (_error: string) => {
    setCurrentStep('pricing');
  };

  const handleBackToPricing = () => {
    setShowManualForm(false);
    setCurrentStep('pricing');
  };

  const handleBackToForm = () => {
    setShowManualForm(false);
    setCurrentStep('form');
  };

  return (
    <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Background - solid blue for trial, interactive for regular join */}
      {isTrial ? (
        <div className="fixed inset-0 z-0 bg-bright-blue" />
      ) : (
        <InteractiveBackground opacity={0.4} />
      )}
      
      {/* Header - always visible */}
      <div className="relative z-20">
        <Header />
      </div>
      
      {/* Main Content */}
      <main className="relative z-10 flex-grow flex items-center py-6 sm:py-8 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto w-full">
          {currentStep === 'form' && (
            <RegisterForm 
              onSwitchToLogin={handleSwitchToLogin}
              onRegistrationSuccess={handleRegistrationSuccess}
              skipTypeSelection={isTrial}
              preselectedPlan={selectedPlan}
            />
          )}
          
          {currentStep === 'pricing' && (
            <PricingSelection
              onPlanSelect={handlePlanSelect}
              onBack={isTrial ? undefined : handleBackToForm}
              dataConsent={dataConsent}
              onDataConsentChange={handleDataConsentChange}
              onOAuthGoogle={() => {
                if (!dataConsent) {
                  setError('You must consent to data processing to continue');
                  return;
                }
                if (!selectedPlan) {
                  setError('Please select a plan first');
                  return;
                }
                setError('');
                loginWithGoogle('business_owner', selectedPlan.id);
              }}
              onOAuthFacebook={() => {
                if (!dataConsent) {
                  setError('You must consent to data processing to continue');
                  return;
                }
                if (!selectedPlan) {
                  setError('Please select a plan first');
                  return;
                }
                setError('');
                loginWithFacebook('business_owner', selectedPlan.id);
              }}
              showOAuth={true}
              error={error}
              onManualRegister={handleManualRegister}
              showManualForm={showManualForm}
              wideCards={isTrial}
            />
          )}
          
          {currentStep === 'payment' && selectedPlan && registeredUser && (
            <PaymentFlow
              selectedPlan={selectedPlan}
              userEmail={registeredUser.email}
              userId={registeredUser.id.toString()}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              onBack={handleBackToPricing}
            />
          )}
          
          {currentStep === 'success' && (
            <div className="w-full max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow-2xl p-6 sm:p-8 md:p-10">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-green-800 mb-2">
                    Registration Successful!
                  </h3>
                  <p className="text-sm text-green-600 mb-6">
                    {registeredUser?.user_type === 'business_owner' 
                      ? (selectedPlan ? `Welcome! Your ${selectedPlan.name} subscription is now active.` : 'Welcome! You can now access your business dashboard.')
                      : 'Welcome! You can now browse and book services.'
                    }
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => window.location.href = '/'}
                      className="px-6 py-3 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                    >
                      Go to Homepage
                    </button>
                    
                    {registeredUser?.user_type === 'business_owner' && (
                      <button
                        onClick={() => window.location.href = '/owner/dashboard'}
                        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                      >
                        Go to Dashboard
                      </button>
                    )}
                    
                    {registeredUser?.user_type === 'customer' && (
                      <button
                        onClick={() => window.location.href = '/search'}
                        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                      >
                        Browse Salons
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default JoinPage;
