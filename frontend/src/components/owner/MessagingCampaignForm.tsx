import React, { useState, useEffect } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import CustomerSelector from './CustomerSelector';
import { useOwnerApi } from '../../utils/ownerApi';
// Temporarily inline types to debug import issue
interface MessagingCustomer {
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  gdpr_marketing_consent: boolean;
  last_booking_date?: string;
  total_bookings: number;
  is_selected: boolean;
}

interface MessagingConfig {
  channels: ('email' | 'whatsapp')[];
  email_subject?: string;
  email_body?: string;
  whatsapp_message?: string;
  scheduled_send_time?: string;
  send_immediately: boolean;
}

interface MessagingCampaignFormProps {
  onSubmit: (data: MessagingCampaignData) => void;
  onCancel: () => void;
  places: Array<{ id: number; name: string; city?: string }>;
  loading?: boolean;
}

interface MessagingCampaignData {
  name: string;
  description: string;
  place_ids: number[];
  messaging_config: MessagingConfig;
  selected_customer_ids: number[];
}

const MessagingCampaignForm: React.FC<MessagingCampaignFormProps> = ({
  onSubmit,
  onCancel,
  places,
  loading = false
}) => {
  const { useMessagingCampaignCustomers } = useOwnerApi();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<MessagingCampaignData>({
    name: '',
    description: '',
    place_ids: [],
    messaging_config: {
      channels: [],
      email_subject: '',
      email_body: '',
      whatsapp_message: '',
      send_immediately: true,
      scheduled_send_time: undefined
    },
    selected_customer_ids: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalSteps = 6;

  // Use the real API to fetch customers
  const { 
    data: customers = [], 
    isLoading: customersLoading, 
    error: customersError 
  } = useMessagingCampaignCustomers(formData.place_ids);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = 'Campaign name is required';
        break;
      case 2:
        if (formData.place_ids.length === 0) newErrors.places = 'At least one place must be selected';
        break;
      case 3:
        if (formData.messaging_config.channels.length === 0) {
          newErrors.channels = 'At least one channel must be selected';
        }
        break;
      case 4:
        if (formData.selected_customer_ids.length === 0) {
          newErrors.customers = 'At least one customer must be selected';
        }
        break;
      case 5:
        if (formData.messaging_config.channels.includes('email')) {
          if (!formData.messaging_config.email_subject?.trim()) {
            newErrors.email_subject = 'Email subject is required';
          }
          if (!formData.messaging_config.email_body?.trim()) {
            newErrors.email_body = 'Email body is required';
          }
        }
        if (formData.messaging_config.channels.includes('whatsapp')) {
          if (!formData.messaging_config.whatsapp_message?.trim()) {
            newErrors.whatsapp_message = 'WhatsApp message is required';
          }
          if (formData.messaging_config.whatsapp_message && formData.messaging_config.whatsapp_message.length > 1600) {
            newErrors.whatsapp_message = 'WhatsApp message must be 1600 characters or less';
          }
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      onSubmit(formData);
    }
  };

  const handleChannelToggle = (channel: 'email' | 'whatsapp') => {
    setFormData(prev => ({
      ...prev,
      messaging_config: {
        ...prev.messaging_config,
        channels: prev.messaging_config.channels.includes(channel)
          ? prev.messaging_config.channels.filter(c => c !== channel)
          : [...prev.messaging_config.channels, channel]
      }
    }));
  };

  const handlePlaceToggle = (placeId: number) => {
    setFormData(prev => ({
      ...prev,
      place_ids: prev.place_ids.includes(placeId)
        ? prev.place_ids.filter(id => id !== placeId)
        : [...prev.place_ids, placeId]
    }));
  };

  const handleCustomerSelectionChange = (selectedIds: number[]) => {
    setFormData(prev => ({
      ...prev,
      selected_customer_ids: selectedIds
    }));
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold ${
                i + 1 <= currentStep 
                  ? 'bg-[#1E90FF] text-white' 
                  : 'bg-[#E0E0E0] text-[#333333]'
              }`}>
                {i + 1}
              </div>
              <div className="mt-2 text-sm font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {i + 1 === 1 && 'Basic Info'}
                {i + 1 === 2 && 'Places'}
                {i + 1 === 3 && 'Channels'}
                {i + 1 === 4 && 'Customers'}
                {i + 1 === 5 && 'Messages'}
                {i + 1 === 6 && 'Schedule'}
              </div>
            </div>
            {i < totalSteps - 1 && (
              <div className={`w-16 h-1 mx-2 ${
                i + 1 < currentStep ? 'bg-[#1E90FF]' : 'bg-[#E0E0E0]'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                Campaign Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] ${
                  errors.name ? 'border-red-500' : 'border-[#E0E0E0]'
                }`}
                style={{ fontFamily: 'Open Sans, sans-serif' }}
                placeholder="e.g., Holiday Special Promotion"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent resize-none bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E]"
                style={{ fontFamily: 'Open Sans, sans-serif' }}
                placeholder="Describe your messaging campaign..."
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                Select Places *
              </label>
              <p className="text-sm text-[#9E9E9E] mb-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>Choose which places this campaign applies to</p>
              <div className="space-y-3 max-h-64 overflow-y-auto border border-[#E0E0E0] rounded-lg p-4 bg-white shadow-sm">
                {places.map((place) => (
                  <label key={place.id} className="flex items-center space-x-3 p-2 hover:bg-[#F5F5F5] rounded-md transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.place_ids.includes(place.id)}
                      onChange={() => handlePlaceToggle(place.id)}
                      className="h-5 w-5 text-[#1E90FF] focus:ring-[#1E90FF] border-[#E0E0E0] rounded bg-white"
                    />
                    <span className="text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{place.name}</span>
                    {place.city && (
                      <span className="text-xs text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>({place.city})</span>
                    )}
                  </label>
                ))}
              </div>
              {errors.places && <p className="mt-1 text-sm text-red-500">{errors.places}</p>}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                Select Channels *
              </label>
              <p className="text-sm text-[#9E9E9E] mb-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>Choose how you want to reach your customers</p>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-3 p-4 border border-[#E0E0E0] rounded-lg hover:bg-[#F5F5F5] transition-colors bg-white shadow-sm">
                  <input
                    type="checkbox"
                    checked={formData.messaging_config.channels.includes('email')}
                    onChange={() => handleChannelToggle('email')}
                    className="h-5 w-5 text-[#1E90FF] focus:ring-[#1E90FF] border-[#E0E0E0] rounded bg-white"
                  />
                  <EnvelopeIcon className="h-6 w-6 text-[#333333]" />
                  <div>
                    <span className="text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Email</span>
                    <p className="text-xs text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Send HTML emails with rich formatting</p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-4 border border-[#E0E0E0] rounded-lg hover:bg-[#F5F5F5] transition-colors bg-white shadow-sm">
                  <input
                    type="checkbox"
                    checked={formData.messaging_config.channels.includes('whatsapp')}
                    onChange={() => handleChannelToggle('whatsapp')}
                    className="h-5 w-5 text-[#1E90FF] focus:ring-[#1E90FF] border-[#E0E0E0] rounded bg-white"
                  />
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-[#333333]" />
                  <div>
                    <span className="text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>WhatsApp</span>
                    <p className="text-xs text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Send instant messages via WhatsApp</p>
                  </div>
                </label>
              </div>
              {errors.channels && <p className="mt-1 text-sm text-red-500">{errors.channels}</p>}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                Select Customers *
              </label>
              <p className="text-sm text-[#9E9E9E] mb-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                Choose which customers to include in this campaign. Only customers with marketing consent are shown.
              </p>
              
              <CustomerSelector
                customers={customers}
                selectedCustomerIds={formData.selected_customer_ids}
                onSelectionChange={handleCustomerSelectionChange}
                loading={customersLoading}
              />
              {customersError && (
                <p className="mt-2 text-sm text-red-500">
                  Error loading customers: {customersError.message}
                </p>
              )}
              {errors.customers && <p className="mt-1 text-sm text-red-500">{errors.customers}</p>}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            {formData.messaging_config.channels.includes('email') && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#333333] flex items-center" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                  <EnvelopeIcon className="h-5 w-5 mr-2" />
                  Email Content
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                    Email Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.messaging_config.email_subject || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      messaging_config: {
                        ...prev.messaging_config,
                        email_subject: e.target.value
                      }
                    }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] ${
                      errors.email_subject ? 'border-red-500' : 'border-[#E0E0E0]'
                    }`}
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                    placeholder="e.g., Special Holiday Offer Inside!"
                  />
                  {errors.email_subject && <p className="mt-1 text-sm text-red-500">{errors.email_subject}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                    Email Body *
                  </label>
                  <textarea
                    value={formData.messaging_config.email_body || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      messaging_config: {
                        ...prev.messaging_config,
                        email_body: e.target.value
                      }
                    }))}
                    rows={8}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent resize-none bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] ${
                      errors.email_body ? 'border-red-500' : 'border-[#E0E0E0]'
                    }`}
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                    placeholder="Write your email content here. HTML is supported..."
                  />
                  {errors.email_body && <p className="mt-1 text-sm text-red-500">{errors.email_body}</p>}
                </div>
              </div>
            )}
            
            {formData.messaging_config.channels.includes('whatsapp') && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#333333] flex items-center" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                  <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                  WhatsApp Content
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                    WhatsApp Message *
                  </label>
                  <textarea
                    value={formData.messaging_config.whatsapp_message || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      messaging_config: {
                        ...prev.messaging_config,
                        whatsapp_message: e.target.value
                      }
                    }))}
                    rows={6}
                    maxLength={1600}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent resize-none bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] ${
                      errors.whatsapp_message ? 'border-red-500' : 'border-[#E0E0E0]'
                    }`}
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                    placeholder="Write your WhatsApp message here..."
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Plain text only (no HTML)</p>
                    <p className="text-xs text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                      {(formData.messaging_config.whatsapp_message || '').length}/1600 characters
                    </p>
                  </div>
                  {errors.whatsapp_message && <p className="mt-1 text-sm text-red-500">{errors.whatsapp_message}</p>}
                </div>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                Send Schedule
              </label>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-3 p-4 border border-[#E0E0E0] rounded-lg hover:bg-[#F5F5F5] transition-colors bg-white shadow-sm">
                  <input
                    type="radio"
                    checked={formData.messaging_config.send_immediately}
                    onChange={() => setFormData(prev => ({
                      ...prev,
                      messaging_config: {
                        ...prev.messaging_config,
                        send_immediately: true,
                        scheduled_send_time: undefined
                      }
                    }))}
                    className="h-5 w-5 text-[#1E90FF] focus:ring-[#1E90FF] border-[#E0E0E0] bg-white"
                  />
                  <div>
                    <span className="text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Send Immediately</span>
                    <p className="text-xs text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Send the campaign as soon as it's created</p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-4 border border-[#E0E0E0] rounded-lg hover:bg-[#F5F5F5] transition-colors bg-white shadow-sm">
                  <input
                    type="radio"
                    checked={!formData.messaging_config.send_immediately}
                    onChange={() => setFormData(prev => ({
                      ...prev,
                      messaging_config: {
                        ...prev.messaging_config,
                        send_immediately: false
                      }
                    }))}
                    className="h-5 w-5 text-[#1E90FF] focus:ring-[#1E90FF] border-[#E0E0E0] bg-white"
                  />
                  <ClockIcon className="h-6 w-6 text-[#333333]" />
                  <div>
                    <span className="text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Schedule for Later</span>
                    <p className="text-xs text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Choose when to send the campaign</p>
                  </div>
                </label>
              </div>
              
              {!formData.messaging_config.send_immediately && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                    Scheduled Send Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.messaging_config.scheduled_send_time || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      messaging_config: {
                        ...prev.messaging_config,
                        scheduled_send_time: e.target.value
                      }
                    }))}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333]"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  />
                </div>
              )}
            </div>
            
            {/* Preview Summary */}
            <div className="bg-white border border-[#E0E0E0] rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-[#333333] mb-3" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Campaign Summary</h3>
              <div className="space-y-2 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                <p><span className="font-medium text-[#333333]">Name:</span> {formData.name}</p>
                <p><span className="font-medium text-[#333333]">Places:</span> {formData.place_ids.length}</p>
                <p><span className="font-medium text-[#333333]">Channels:</span> {formData.messaging_config.channels.join(', ')}</p>
                <p><span className="font-medium text-[#333333]">Recipients:</span> {formData.selected_customer_ids.length}</p>
                <p><span className="font-medium text-[#333333]">Send:</span> {formData.messaging_config.send_immediately ? 'Immediately' : 'Scheduled'}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {renderStepIndicator()}
      
      <div className="bg-white rounded-lg shadow-sm border border-[#E0E0E0] p-6" style={{ boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)' }}>
        {renderStepContent()}
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <div>
          {currentStep > 1 && (
            <button
              onClick={handlePrevious}
              className="flex items-center px-4 py-2 text-sm font-medium text-[#333333] bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg hover:bg-[#E0E0E0]"
              style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Previous
            </button>
          )}
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[#333333] bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg hover:bg-[#E0E0E0]"
            style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
          >
            Cancel
          </button>
          
          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#1E90FF] rounded-lg hover:bg-[#1877D2]"
              style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
            >
              Next
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#FF5A5F] rounded-lg hover:bg-[#E04A4F] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Campaign...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-1" />
                  Create Campaign
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagingCampaignForm;
