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

type RegistrationStep = 'form' | 'pricing' | 'success';

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
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('form');
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const isSubmittingRef = useRef(false);
  const { register, loginWithGoogle, loginWithFacebook } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    setError('');

    // Require plan selection first for business owners
    if (formData.user_type === 'business_owner' && !selectedPlan) {
      setCurrentStep('pricing');
      return;
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
    // After plan selection, return to form to submit registration
    setCurrentStep('form');
  };

  const handleBackToForm = () => {
    setCurrentStep('form');
    setError('');
  };

  // Render different steps based on current step
  if (currentStep === 'pricing') {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <PricingSelection
          onPlanSelect={handlePlanSelect}
          onBack={handleBackToForm}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Form Container - More rectangular design */}
      <div className="bg-white rounded-lg shadow-2xl p-6 sm:p-8 md:p-10">
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

          <div>
            <label htmlFor="user_type" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
              I am registering as:
            </label>
            <select
              id="user_type"
              name="user_type"
              required
              value={formData.user_type}
              onChange={handleChange}
              className="w-full px-3 py-3 sm:py-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 text-gray-900 text-sm sm:text-base"
            >
              <option value="customer">Customer (Looking for services)</option>
              <option value="business_owner">Business Owner (Offering services)</option>
            </select>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
              {t('auth.password')}
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
                required
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
          </div>

          {/* OAuth Buttons */}
          <OAuthButtons 
            onGoogleLogin={() => {
              const userType = formData.user_type || 'customer';
              // For business owners, require plan selection before OAuth
              if (userType === 'business_owner' && !selectedPlan) {
                setCurrentStep('pricing');
                return;
              }
              loginWithGoogle(userType, selectedPlan?.id);
            }}
            onFacebookLogin={() => {
              const userType = formData.user_type || 'customer';
              // For business owners, require plan selection before OAuth
              if (userType === 'business_owner' && !selectedPlan) {
                setCurrentStep('pricing');
                return;
              }
              loginWithFacebook(userType, selectedPlan?.id);
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
                    {t('gdpr.dataProcessingText')}
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !formData.gdpr_data_processing_consent}
              className="w-full py-3 sm:py-4 px-4 text-white font-semibold rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm sm:text-base"
              style={{backgroundColor: '#2a2a2e'}}
            >
              {loading ? t('auth.loading') : (formData.user_type === 'business_owner' && !selectedPlan ? 'Choose Plan' : t('auth.register'))}
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
