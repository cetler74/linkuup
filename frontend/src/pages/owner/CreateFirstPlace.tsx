import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BuildingOfficeIcon, 
  MapPinIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface FormData {
  name: string;
  sector: string;
  description: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  location_type: 'fixed' | 'mobile';
  booking_enabled: boolean;
  latitude?: number;
  longitude?: number;
}

const CreateFirstPlace: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    sector: '',
    description: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    email: '',
    location_type: 'fixed',
    booking_enabled: true,
    latitude: undefined,
    longitude: undefined,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleLocationTypeChange = (type: 'fixed' | 'mobile') => {
    setFormData(prev => ({ ...prev, location_type: type }));
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
        },
        () => {
          alert('Unable to get your location. Please enter coordinates manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const token = localStorage.getItem('auth_token');
    if (!token) {
      alert('You must be logged in to create a place. Please log in first.');
      return;
    }

    try {
      setLoading(true);
      
      const placeData = {
        codigo: null,
        nome: formData.name,
        tipo: formData.sector,
        about: formData.description,
        rua: formData.address,
        cidade: formData.city,
        cod_postal: formData.postal_code,
        telefone: formData.phone,
        email: formData.email,
        booking_enabled: formData.booking_enabled,
        pais: 'Portugal',
        regiao: formData.sector,
        porta: '',
        website: '',
        instagram: '',
        is_bio_diamond: false,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        working_hours: {}
      };

      const response = await fetch('/api/v1/owner/places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(placeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create place');
      }

      const newPlace = await response.json();
      console.log('✅ Place created successfully:', newPlace);
      
      // Redirect to places management
      navigate('/owner/places');
    } catch (error) {
      console.error('❌ Error creating place:', error);
      alert('Failed to create place: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const isStepValid = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return formData.name.trim() !== '' && formData.sector.trim() !== '';
      case 2:
        return formData.address.trim() !== '' && formData.city.trim() !== '';
      case 3:
        return true; // Optional step
      default:
        return false;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#2a2a2e'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#2a2a2e'}}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-6">
            <BuildingOfficeIcon className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Your First Place</h1>
          <p className="text-white/70 text-lg">
            Let's set up your business location to get started with LinkUup
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step >= stepNumber 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {step > stepNumber ? (
                      <CheckIcon className="h-5 w-5" />
                    ) : (
                      stepNumber
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    step >= stepNumber ? 'text-white' : 'text-gray-400'
                  }`}>
                    {stepNumber === 1 && 'Basic Info'}
                    {stepNumber === 2 && 'Location'}
                    {stepNumber === 3 && 'Contact'}
                  </span>
                </div>
                {stepNumber < 3 && (
                  <div className={`w-8 h-0.5 ${
                    step > stepNumber ? 'bg-blue-600' : 'bg-gray-700'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-8">
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
                  <p className="text-gray-400 mb-6">Tell us about your business</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter your business name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Business Sector *
                    </label>
                    <select
                      name="sector"
                      required
                      value={formData.sector}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">{t('search.selectService')}</option>
                      <option value="allServices">{t('search.allServices')}</option>
                      <option value="salon">{t('search.salon')}</option>
                      <option value="barber">{t('search.barber')}</option>
                      <option value="nails">{t('search.nails')}</option>
                      <option value="spaSauna">{t('search.spaSauna')}</option>
                      <option value="medicalSpa">{t('search.medicalSpa')}</option>
                      <option value="massage">{t('search.massage')}</option>
                      <option value="fitnessRehab">{t('search.fitnessRehab')}</option>
                      <option value="physiotherapy">{t('search.physiotherapy')}</option>
                      <option value="medicalOffices">{t('search.medicalOffices')}</option>
                      <option value="tattooPiercing">{t('search.tattooPiercing')}</option>
                      <option value="petGrooming">{t('search.petGrooming')}</option>
                      <option value="tanningClinic">{t('search.tanningClinic')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Describe your business and what services you offer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4">
                    Location Type
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleLocationTypeChange('fixed')}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        formData.location_type === 'fixed'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <BuildingOfficeIcon className="h-6 w-6 text-white" />
                        <div className="text-left">
                          <div className="text-white font-medium">Fixed Location</div>
                          <div className="text-gray-400 text-sm">Physical business address</div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLocationTypeChange('mobile')}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        formData.location_type === 'mobile'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <MapPinIcon className="h-6 w-6 text-white" />
                        <div className="text-left">
                          <div className="text-white font-medium">Mobile Service</div>
                          <div className="text-gray-400 text-sm">Service area or mobile business</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">Location Details</h2>
                  <p className="text-gray-400 mb-6">Where is your business located?</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Address *
                    </label>
                    <input
                      type="text"
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Street address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="City"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="1234-567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Coordinates (Optional)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        step="any"
                        value={formData.latitude || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          latitude: e.target.value ? parseFloat(e.target.value) : undefined 
                        }))}
                        className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Latitude"
                      />
                      <input
                        type="number"
                        step="any"
                        value={formData.longitude || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          longitude: e.target.value ? parseFloat(e.target.value) : undefined 
                        }))}
                        className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Longitude"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
                    >
                      📍 Use current location
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Contact Information */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">Contact Information</h2>
                  <p className="text-gray-400 mb-6">How can customers reach you?</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="+351 123 456 789"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="business@example.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="booking_enabled"
                    checked={formData.booking_enabled}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-gray-300">
                    Enable online booking for this place
                  </label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  step === 1
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                Previous
              </button>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/owner/dashboard')}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-all duration-200"
                >
                  Cancel
                </button>

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={!isStepValid(step)}
                    className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      isStepValid(step)
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                      loading
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating...</span>
                      </div>
                    ) : (
                      'Create Place'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFirstPlace;
