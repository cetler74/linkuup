import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import OAuthButtons from './OAuthButtons';
import PricingSelection from './PricingSelection';
import type { PricingPlan } from './PricingSelection';
import api, { ownerAPI } from '../../utils/api';

interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  user_type: 'customer' | 'business_owner';
  gdpr_data_processing_consent: boolean;
  gdpr_marketing_consent: boolean;
  selected_plan_code?: string;
  place_id?: number;
}

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onRegistrationSuccess?: (user: any, userType: string) => void;
}

type RegistrationStep = 'type_selection' | 'form' | 'pricing' | 'success';

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState<RegisterRequest>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    user_type: 'customer',
    gdpr_data_processing_consent: false,
    gdpr_marketing_consent: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userType, setUserType] = useState<'customer' | 'business_owner' | null>(null);
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('type_selection');
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [showManualFormForOwner, setShowManualFormForOwner] = useState(false);
  const isSubmittingRef = useRef(false);
  const { register, loginWithGoogle, loginWithFacebook } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    setError('');

    // Validate Data Consent
    if (!formData.gdpr_data_processing_consent) {
      setError('You must consent to data processing to continue');
      return;
    }

    // For customers: password is required only if not using OAuth
    if (formData.user_type === 'customer' && !formData.password) {
      setError('Password is required for manual registration');
      return;
    }

    // For business owners: First Name, Last Name, Email, Password are required for manual registration
    if (formData.user_type === 'business_owner') {
      if (!formData.first_name || !formData.last_name || !formData.email) {
        setError('Please fill in First Name, Last Name, and Email');
        return;
      }
      if (!formData.password) {
        setError('Password is required for manual registration');
        return;
      }
      if (!selectedPlan) {
        setError('Please select a plan');
        return;
      }
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const payload: RegisterRequest = {
        ...formData,
        selected_plan_code: formData.user_type === 'business_owner' ? selectedPlan?.id : undefined,
      };
      await register(payload as any);
      setUserType(payload.user_type);

      // If owner and plan chosen, attempt to start trial for first place (if exists)
      if (payload.user_type === 'business_owner' && selectedPlan) {
        try {
          const places = await ownerAPI.getOwnerPlaces();
          const firstPlace = Array.isArray(places) ? places[0] : undefined;
          if (firstPlace?.id) {
            await api.post('/subscriptions/start-trial', {
              place_id: firstPlace.id,
              plan_code: selectedPlan.id,
            });
          }
        } catch (e) {
          // Non-blocking; user can start trial after creating a place
        }
      }

      setSuccess(true);
      setCurrentStep('success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Registration failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handlePlanSelect = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    // After plan selection, show registration form for manual registration or allow OAuth
    // The PricingSelection component will show OAuth buttons if data consent is checked
  };

  const handleDataConsentChange = (consent: boolean) => {
    setFormData({
      ...formData,
      gdpr_data_processing_consent: consent,
    });
  };

  const handleBackToForm = () => {
    setCurrentStep('type_selection');
    setError('');
  };

  const handleUserTypeSelect = (type: 'customer' | 'business_owner') => {
    setFormData({
      ...formData,
      user_type: type,
    });
    if (type === 'business_owner') {
      setCurrentStep('pricing');
    } else {
      setCurrentStep('form');
    }
  };

  // Handle card hover for background effects (used for type selection container)
  const handleTypeSelectionMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('cardHover', { 
      detail: { 
        hovered: true,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      } 
    }));
  };

  const handleTypeSelectionMouseLeave = () => {
    window.dispatchEvent(new CustomEvent('cardHover', { 
      detail: { hovered: false } 
    }));
  };

  // Render different steps based on current step
  if (currentStep === 'type_selection') {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div 
          className="bg-white rounded-lg shadow-2xl p-6 sm:p-8 md:p-10"
          onMouseEnter={handleTypeSelectionMouseEnter}
          onMouseLeave={handleTypeSelectionMouseLeave}
        >
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2" style={{color: '#2a2a2e'}}>
              {t('auth.register')}
            </h2>
            <p className="text-center text-gray-600 mt-2">
              I am registering as:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* Customer Option */}
            <button
              type="button"
              onClick={() => handleUserTypeSelect('customer')}
              className="p-8 border-2 border-gray-300 rounded-lg hover:border-gray-900 hover:shadow-lg transition-all duration-200 text-left group"
              style={{borderColor: formData.user_type === 'customer' ? '#2a2a2e' : undefined}}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                window.dispatchEvent(new CustomEvent('cardHover', { 
                  detail: { 
                    hovered: true,
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                  } 
                }));
              }}
              onMouseLeave={() => {
                window.dispatchEvent(new CustomEvent('cardHover', { 
                  detail: { hovered: false } 
                }));
              }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  <User className="h-12 w-12 mx-auto mb-4" style={{color: formData.user_type === 'customer' ? '#2a2a2e' : '#9ca3af'}} />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{color: '#2a2a2e'}}>
                  Customer (Looking for services)
                </h3>
                <p className="text-sm text-gray-600">
                  Find and book services from local businesses
                </p>
              </div>
            </button>

            {/* Business Owner Option */}
            <button
              type="button"
              onClick={() => handleUserTypeSelect('business_owner')}
              className="p-8 border-2 border-gray-300 rounded-lg hover:border-gray-900 hover:shadow-lg transition-all duration-200 text-left group"
              style={{borderColor: formData.user_type === 'business_owner' ? '#2a2a2e' : undefined}}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                window.dispatchEvent(new CustomEvent('cardHover', { 
                  detail: { 
                    hovered: true,
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                  } 
                }));
              }}
              onMouseLeave={() => {
                window.dispatchEvent(new CustomEvent('cardHover', { 
                  detail: { hovered: false } 
                }));
              }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color: formData.user_type === 'business_owner' ? '#2a2a2e' : '#9ca3af'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2" style={{color: '#2a2a2e'}}>
                  Business Owner (Offering services)
                </h3>
                <p className="text-sm text-gray-600">
                  Manage your business and offer services to customers
                </p>
              </div>
            </button>
          </div>

          <div className="text-center pt-6 mt-6">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-sm font-medium hover:opacity-75 transition-opacity duration-200"
              style={{color: '#2a2a2e'}}
            >
              {t('auth.switchToLogin')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleManualRegisterForOwner = () => {
    setShowManualFormForOwner(true);
    setCurrentStep('form');
  };

  if (currentStep === 'pricing') {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <PricingSelection
          onPlanSelect={handlePlanSelect}
          onBack={handleBackToForm}
          loading={loading}
          dataConsent={formData.gdpr_data_processing_consent}
          onDataConsentChange={handleDataConsentChange}
          onOAuthGoogle={() => {
            if (!formData.gdpr_data_processing_consent) {
              setError('You must consent to data processing to continue');
              return;
            }
            if (!selectedPlan) {
              setError('Please select a plan first');
              return;
            }
            loginWithGoogle('business_owner', selectedPlan.id);
          }}
          onOAuthFacebook={() => {
            if (!formData.gdpr_data_processing_consent) {
              setError('You must consent to data processing to continue');
              return;
            }
            if (!selectedPlan) {
              setError('Please select a plan first');
              return;
            }
            loginWithFacebook('business_owner', selectedPlan.id);
          }}
          showOAuth={true}
          error={error}
          onManualRegister={handleManualRegisterForOwner}
          showManualForm={showManualFormForOwner}
        />
      </div>
    );
  }

  // Handle card hover for background effects
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('cardHover', { 
      detail: { 
        hovered: true,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      } 
    }));
  };

  const handleMouseLeave = () => {
    window.dispatchEvent(new CustomEvent('cardHover', { 
      detail: { hovered: false } 
    }));
  };

  // Show form for customers or business owners doing manual registration
  if (formData.user_type !== 'customer' && !showManualFormForOwner) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Form Container - More rectangular design */}
      <div 
        className="bg-white rounded-lg shadow-2xl p-6 sm:p-8 md:p-10"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2" style={{color: '#2a2a2e'}}>
            {t('auth.register')}
          </h2>
        </div>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
              First Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="first_name"
                name="first_name"
                type="text"
                autoComplete="given-name"
                required
                value={formData.first_name}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-3 sm:py-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 text-gray-900 text-sm sm:text-base"
                placeholder="First Name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
              Last Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="last_name"
                name="last_name"
                type="text"
                autoComplete="family-name"
                required
                value={formData.last_name}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-3 sm:py-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 text-gray-900 text-sm sm:text-base"
                placeholder="Last Name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
              {t('auth.email')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-3 sm:py-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 text-gray-900 text-sm sm:text-base"
                placeholder={t('auth.email')}
              />
            </div>
          </div>

          {/* Password field - required for manual registration */}
          {(formData.user_type === 'customer' || showManualFormForOwner) && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                {t('auth.password')} {formData.user_type === 'customer' && <span className="text-gray-500 text-xs">(optional if using OAuth)</span>}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required={showManualFormForOwner}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-3 sm:py-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 text-gray-900 text-sm sm:text-base"
                  placeholder={t('auth.password')}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* OAuth Buttons */}
          <OAuthButtons 
            onGoogleLogin={() => {
              const userType = formData.user_type || 'customer';
              // Ensure userType is a string, not an object
              const validUserType = (typeof userType === 'string' && (userType === 'customer' || userType === 'business_owner')) 
                ? userType 
                : 'customer';
              // For business owners, require plan selection before OAuth
              if (validUserType === 'business_owner' && !selectedPlan) {
                setCurrentStep('pricing');
                return;
              }
              loginWithGoogle(validUserType, selectedPlan?.id);
            }}
            onFacebookLogin={() => {
              const userType = formData.user_type || 'customer';
              // Ensure userType is a string, not an object
              const validUserType = (typeof userType === 'string' && (userType === 'customer' || userType === 'business_owner')) 
                ? userType 
                : 'customer';
              // For business owners, require plan selection before OAuth
              if (validUserType === 'business_owner' && !selectedPlan) {
                setCurrentStep('pricing');
                return;
              }
              loginWithFacebook(validUserType, selectedPlan?.id);
            }}
            loading={loading}
          />

          {/* GDPR Consent Section */}
              <div className="space-y-4 border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold" style={{color: '#2a2a2e'}}>{t('gdpr.title')}</h3>
            
            {/* Required Data Processing Consent */}
            <div className="space-y-2">
              <div className="flex items-start">
                    <div className="flex items-center h-5 mt-1">
                  <input
                    id="gdpr_data_processing_consent"
                    name="gdpr_data_processing_consent"
                    type="checkbox"
                    required
                    checked={formData.gdpr_data_processing_consent}
                    onChange={handleChange}
                        className="h-4 w-4 border-gray-300 rounded focus:ring-2"
                        style={{color: '#2a2a2e'}}
                  />
                </div>
                <div className="ml-3 text-sm">
                      <label htmlFor="gdpr_data_processing_consent" className="font-medium" style={{color: '#2a2a2e'}}>
                    {t('gdpr.dataProcessing')} <span className="text-red-500">*</span>
                  </label>
                  <p className="text-gray-600 text-xs mt-1">
                    I consent to my personal data being processed and used internally by LinkUup to provide the requested services, including account management, bookings and service-related communication.
                  </p>
                </div>
              </div>
            </div>

            {/* Optional Marketing Consent */}
            <div className="space-y-2">
              <div className="flex items-start">
                    <div className="flex items-center h-5 mt-1">
                  <input
                    id="gdpr_marketing_consent"
                    name="gdpr_marketing_consent"
                    type="checkbox"
                    checked={formData.gdpr_marketing_consent}
                    onChange={handleChange}
                        className="h-4 w-4 border-gray-300 rounded focus:ring-2"
                        style={{color: '#2a2a2e'}}
                  />
                </div>
                <div className="ml-3 text-sm">
                      <label htmlFor="gdpr_marketing_consent" className="font-medium" style={{color: '#2a2a2e'}}>
                    {t('gdpr.marketing')} <span className="text-gray-500">({t('gdpr.optional')})</span>
                  </label>
                  <p className="text-gray-600 text-xs mt-1">
                    {t('gdpr.marketingText')}
                  </p>
                </div>
              </div>
            </div>

            {/* Terms and Privacy Policy */}
            <div className="text-xs text-gray-600">
              <p>
                    {t('gdpr.readAndAccept')} <a href="/privacy-policy" className="hover:opacity-75 underline" style={{color: '#2a2a2e'}}>{t('gdpr.privacyPolicy')}</a> {t('gdpr.and')} <a href="/terms-of-service" className="hover:opacity-75 underline" style={{color: '#2a2a2e'}}>{t('gdpr.termsOfService')}</a>.
              </p>
            </div>
          </div>

          {/* Register button - for customers or business owners doing manual registration */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !formData.gdpr_data_processing_consent || !formData.first_name || !formData.last_name || !formData.email || (formData.user_type === 'customer' && !formData.password) || (formData.user_type === 'business_owner' && !formData.password)}
              className="w-full py-3 sm:py-4 px-4 text-white font-semibold rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm sm:text-base"
              style={{backgroundColor: '#2a2a2e'}}
            >
              {loading ? t('auth.loading') : t('auth.register')}
            </button>
          </div>

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-sm font-medium hover:opacity-75 transition-opacity duration-200"
              style={{color: '#2a2a2e'}}
            >
              {t('auth.switchToLogin')}
            </button>
          </div>
        </form>
        
        {/* Success Message and Navigation Options */}
        {success && currentStep === 'success' && (
          <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-green-800 mb-2">
                {t('auth.registrationSuccess')}
              </h3>
              <p className="text-sm text-green-600 mb-6">
                {userType === 'business_owner' 
                  ? (selectedPlan ? `Welcome! Your ${selectedPlan.name} trial is started or will start after you create your first place.` : t('auth.registrationSuccessOwner'))
                  : t('auth.registrationSuccessCustomer')
                }
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  {t('auth.goToHomepage')}
                </button>
                
                {userType === 'business_owner' && (
                  <button
                    onClick={() => navigate('/owner/dashboard')}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    {t('auth.goToDashboard')}
                  </button>
                )}
                
                {userType === 'customer' && (
                  <button
                    onClick={() => navigate('/search')}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    {t('auth.browseSalons')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterForm;
