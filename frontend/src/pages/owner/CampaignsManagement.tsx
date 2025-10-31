import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MegaphoneIcon, TagIcon, GiftIcon, ClockIcon, CheckCircleIcon, XCircleIcon, EnvelopeIcon, ChatBubbleLeftRightIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useOwnerApi } from '../../utils/ownerApi';
import MessagingCampaignForm from '../../components/owner/MessagingCampaignForm';
import CampaignStats from '../../components/owner/CampaignStats';
import CampaignRecipientsModal from '../../components/owner/CampaignRecipientsModal';
// Define campaign_types inline to avoid module resolution issues
interface Campaign {
  id: number;
  created_by: number;
  name: string;
  description?: string;
  banner_message: string;
  campaign_type: 'price_reduction' | 'rewards_increase' | 'free_service' | 'messaging';
  start_datetime: string;
  end_datetime: string;
  discount_type?: 'percentage' | 'fixed_amount';
  discount_value?: number;
  rewards_multiplier?: number;
  rewards_bonus_points?: number;
  free_service_type?: 'specific_free' | 'buy_x_get_y';
  buy_quantity?: number;
  get_quantity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  places?: Array<{ id: number; nome: string; cidade?: string }>;
  services?: Array<{ id: number; name: string; category?: string }>;
  is_currently_active?: boolean;
  days_remaining?: number;
}
import PlaceSelector from '../../components/owner/PlaceSelector';

interface CampaignFormData {
  name: string;
  description: string;
  banner_message: string;
  campaign_type: 'price_reduction' | 'rewards_increase' | 'free_service' | 'messaging';
  start_datetime: string;
  end_datetime: string;
  discount_type?: 'percentage' | 'fixed_amount';
  discount_value?: number;
  rewards_multiplier?: number;
  rewards_bonus_points?: number;
  free_service_type?: 'specific_free' | 'buy_x_get_y';
  buy_quantity?: number;
  get_quantity?: number;
  is_active: boolean;
  place_ids: number[];
  service_ids: number[];
}

const CampaignsManagement: React.FC = () => {
  const { 
    usePlaces, 
    useAllCampaigns, 
    useCampaign, 
    useCreateCampaign, 
    useUpdateCampaign, 
    useDeleteCampaign,
    useCampaignStats 
  } = useOwnerApi();
  
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Messaging campaign states
  const [showMessagingForm, setShowMessagingForm] = useState(false);
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);
  const [selectedCampaignForRecipients, setSelectedCampaignForRecipients] = useState<Campaign | null>(null);
  
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    banner_message: '',
    campaign_type: 'price_reduction',
    start_datetime: '',
    end_datetime: '',
    discount_type: 'percentage',
    discount_value: 10,
    rewards_multiplier: 1,
    rewards_bonus_points: 0,
    free_service_type: 'specific_free',
    buy_quantity: 1,
    get_quantity: 1,
    is_active: true,
    place_ids: [],
    service_ids: []
  });

  const { data: places = [] } = usePlaces();
  const { data: campaignsData, isLoading } = useAllCampaigns({ page: 1, size: 50 });
  const { data: campaignStats } = useCampaignStats();
  const createCampaignMutation = useCreateCampaign();
  const updateCampaignMutation = useUpdateCampaign();
  const deleteCampaignMutation = useDeleteCampaign();

  const campaigns = campaignsData?.campaigns || [];

  useEffect(() => {
    if (places.length > 0 && !selectedPlaceId) {
      setSelectedPlaceId(places[0].id);
    }
  }, [places, selectedPlaceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Only submit on the last step; otherwise move to next step
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      return;
    }
    
    // Prevent duplicate submissions
    if (createCampaignMutation.isPending || updateCampaignMutation.isPending) {
      return;
    }
    
    try {
      // Client-side validation guards before final submit
      if (formData.campaign_type === 'price_reduction') {
        const dv = Number(formData.discount_value);
        if (!dv || dv <= 0) {
          console.error('Discount value must be greater than 0');
          return;
        }
      }

      const campaignData = {
        name: formData.name,
        description: formData.description || undefined,
        banner_message: formData.banner_message,
        campaign_type: formData.campaign_type,
        start_datetime: new Date(formData.start_datetime).toISOString(),
        end_datetime: new Date(formData.end_datetime).toISOString(),
        is_active: formData.is_active,
        place_ids: formData.place_ids,
        service_ids: formData.service_ids,
        // Add campaign type specific configurations
        ...(formData.campaign_type === 'price_reduction' && formData.discount_value && formData.discount_value > 0 && {
          price_reduction_config: {
            discount_type: formData.discount_type,
            discount_value: Number(formData.discount_value)
          }
        }),
        ...(formData.campaign_type === 'rewards_increase' && {
          rewards_increase_config: {
            rewards_multiplier: formData.rewards_multiplier ? Number(formData.rewards_multiplier) : null,
            rewards_bonus_points: formData.rewards_bonus_points || null
          }
        }),
        ...(formData.campaign_type === 'free_service' && {
          free_service_config: {
            free_service_type: formData.free_service_type,
            buy_quantity: formData.buy_quantity,
            get_quantity: formData.get_quantity
          }
        })
      };

      console.log('Campaign data being sent:', JSON.stringify(campaignData, null, 2));

      if (editingCampaign) {
        await updateCampaignMutation.mutateAsync({
          id: editingCampaign.id,
          data: campaignData
        });
      } else {
        await createCampaignMutation.mutateAsync(campaignData);
      }
      
      setShowModal(false);
      setEditingCampaign(null);
      resetForm();
    } catch (error) {
      console.error('Error saving campaign:', error);
    }
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      banner_message: campaign.banner_message,
      campaign_type: campaign.campaign_type,
      start_datetime: campaign.start_datetime,
      end_datetime: campaign.end_datetime,
      discount_type: campaign.discount_type,
      discount_value: campaign.discount_value || 0,
      rewards_multiplier: campaign.rewards_multiplier || 1,
      rewards_bonus_points: campaign.rewards_bonus_points || 0,
      free_service_type: campaign.free_service_type,
      buy_quantity: campaign.buy_quantity || 1,
      get_quantity: campaign.get_quantity || 1,
      is_active: campaign.is_active,
      place_ids: campaign.places?.map(p => p.id) || [],
      service_ids: campaign.services?.map(s => s.id) || []
    });
    setCurrentStep(1);
    setShowModal(true);
  };

  const handleDelete = async (campaignId: number) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      try {
        await deleteCampaignMutation.mutateAsync(campaignId);
      } catch (error) {
        console.error('Error deleting campaign:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      banner_message: '',
      campaign_type: 'price_reduction',
      start_datetime: '',
      end_datetime: '',
      discount_type: 'percentage',
      discount_value: 0,
      rewards_multiplier: 1,
      rewards_bonus_points: 0,
      free_service_type: 'specific_free',
      buy_quantity: 1,
      get_quantity: 1,
      is_active: true,
      place_ids: [],
      service_ids: []
    });
    setCurrentStep(1);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingCampaign(null);
    resetForm();
  };

  const handlePlaceToggle = (placeId: number) => {
    setFormData(prev => ({
      ...prev,
      place_ids: prev.place_ids.includes(placeId)
        ? prev.place_ids.filter(id => id !== placeId)
        : [...prev.place_ids, placeId]
    }));
  };

  const getCampaignIcon = (campaign_type: string) => {
    switch (campaign_type) {
      case 'price_reduction':
        return <TagIcon className="h-6 w-6 text-orange-600" />;
      case 'rewards_increase':
        return <GiftIcon className="h-6 w-6 text-purple-600" />;
      case 'free_service':
        return <GiftIcon className="h-6 w-6 text-green-600" />;
      case 'messaging':
        return <EnvelopeIcon className="h-6 w-6 text-teal-600" />;
      default:
        return <MegaphoneIcon className="h-6 w-6 text-gray-600" />;
    }
  };

  const getCampaignTypeColor = (campaign_type: string) => {
    switch (campaign_type) {
      case 'price_reduction':
        return 'bg-orange-100 text-orange-800';
      case 'rewards_increase':
        return 'bg-purple-100 text-purple-800';
      case 'free_service':
        return 'bg-green-100 text-green-800';
      case 'messaging':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCampaignStatus = (campaign: Campaign) => {
    const now = new Date();
    const start = new Date(campaign.start_datetime);
    const end = new Date(campaign.end_datetime);

    if (!campaign.is_active) {
      return { status: 'inactive', color: 'bg-red-100 text-red-800', icon: XCircleIcon };
    }
    if (now < start) {
      return { status: 'scheduled', color: 'bg-blue-100 text-blue-800', icon: ClockIcon };
    }
    if (now > end) {
      return { status: 'expired', color: 'bg-gray-100 text-gray-800', icon: XCircleIcon };
    }
    return { status: 'active', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon };
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const getDaysRemaining = (endDateTime: string) => {
    const now = new Date();
    const end = new Date(endDateTime);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Messaging campaign handlers
  const handleCreateMessagingCampaign = (data: any) => {
    // This would integrate with the actual API
    console.log('Creating messaging campaign:', data);
    setShowMessagingForm(false);
    // Refresh campaigns list
  };

  const handleViewRecipients = (campaign: Campaign) => {
    setSelectedCampaignForRecipients(campaign);
    setShowRecipientsModal(true);
  };

  const handleSendMessagingCampaign = async (campaignId: number) => {
    try {
      // This would integrate with the actual API
      console.log('Sending messaging campaign:', campaignId);
      // Refresh campaigns list
    } catch (error) {
      console.error('Error sending campaign:', error);
    }
  };

  const handleRemoveRecipient = async (recipientId: number) => {
    try {
      // This would integrate with the actual API
      console.log('Removing recipient:', recipientId);
    } catch (error) {
      console.error('Error removing recipient:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>Campaigns Management</h1>
          <p className="mt-2 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            Create and manage promotional campaigns across your places
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setEditingCampaign(null);
                setShowModal(true);
              }}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#1E90FF] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1877D2] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:ring-offset-2 sm:w-auto"
              style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Promotions
            </button>
            
            <button
              type="button"
              onClick={() => setShowMessagingForm(true)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#FF5A5F] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#E04A4F] focus:outline-none focus:ring-2 focus:ring-[#FF5A5F] focus:ring-offset-2 sm:w-auto"
              style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
            >
              <EnvelopeIcon className="h-4 w-4 mr-2" />
              Create Messaging Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {campaignStats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <MegaphoneIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Campaigns</dt>
                    <dd className="text-lg font-medium text-gray-900">{campaignStats.total_campaigns}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Campaigns</dt>
                    <dd className="text-lg font-medium text-gray-900">{campaignStats.active_campaigns}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Scheduled</dt>
                    <dd className="text-lg font-medium text-gray-900">{campaignStats.scheduled_campaigns}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Expired</dt>
                    <dd className="text-lg font-medium text-gray-900">{campaignStats.expired_campaigns}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <MegaphoneIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new campaign.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#E0E0E0]">
            {campaigns.map((campaign) => {
              const status = getCampaignStatus(campaign);
              const StatusIcon = status.icon;
              const daysRemaining = getDaysRemaining(campaign.end_datetime);
              
              return (
                <li key={campaign.id}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-[#F5F5F5] flex items-center justify-center">
                          {getCampaignIcon(campaign.campaign_type)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{campaign.name}</p>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCampaignTypeColor(campaign.campaign_type)}`}>
                            {campaign.campaign_type.replace('_', ' ')}
                          </span>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.status}
                          </span>
                        </div>
                        <div className="mt-1">
                          <p className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{campaign.banner_message}</p>
                          <div className="flex items-center space-x-4 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                            <span>{formatDateTime(campaign.start_datetime)} - {formatDateTime(campaign.end_datetime)}</span>
                            {campaign.discount_value && (
                              <span>
                                {campaign.discount_type === 'percentage' 
                                  ? `${campaign.discount_value}% off` 
                                  : `€${campaign.discount_value} off`
                                }
                              </span>
                            )}
                            {campaign.rewards_multiplier && campaign.rewards_multiplier > 1 && (
                              <span>{campaign.rewards_multiplier}x points</span>
                            )}
                            {campaign.rewards_bonus_points && (
                              <span>+{campaign.rewards_bonus_points} bonus points</span>
                            )}
                            {status.status === 'active' && daysRemaining > 0 && (
                              <span className="text-[#FFD43B]">{daysRemaining} days left</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {campaign.campaign_type === 'messaging' && (
                        <>
                          <button
                            onClick={() => handleViewRecipients(campaign)}
                            className="text-[#1E90FF] hover:text-[#1877D2]"
                            title="View Recipients"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleSendMessagingCampaign(campaign.id)}
                            className="text-[#A3D55D] hover:text-[#8BC34A]"
                            title="Send Campaign"
                          >
                            <ChatBubbleLeftRightIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEdit(campaign)}
                        className="text-[#1E90FF] hover:text-[#1877D2]"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        className="text-[#FF5A5F] hover:text-[#E04A4F]"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white border-[#E0E0E0]">
            <div className="mt-3">
              <h3 className="text-2xl font-semibold mb-6 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
              </h3>
              
              {/* Step Indicator */}
              <div className="mb-8">
                <div className="flex items-center justify-center">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold ${
                          step <= currentStep 
                            ? 'bg-[#1E90FF] text-white' 
                            : 'bg-[#E0E0E0] text-[#333333]'
                        }`}>
                          {step}
                        </div>
                        <div className="mt-2 text-sm font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {step === 1 && 'Basic Info'}
                          {step === 2 && 'Timing'}
                          {step === 3 && 'Places'}
                          {step === 4 && 'Services'}
                          {step === 5 && 'Config'}
                        </div>
                      </div>
                      {step < 5 && (
                        <div className={`w-16 h-1 mx-2 ${
                          step < currentStep ? 'bg-[#1E90FF]' : 'bg-[#E0E0E0]'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Basic Info */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Campaign Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E]"
                        style={{ fontFamily: 'Open Sans, sans-serif' }}
                        placeholder="e.g., Summer Sale 2024"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent resize-none bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E]"
                        style={{ fontFamily: 'Open Sans, sans-serif' }}
                        placeholder="Campaign description..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Banner Message *</label>
                      <input
                        type="text"
                        required
                        value={formData.banner_message}
                        onChange={(e) => setFormData({ ...formData, banner_message: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E]"
                        style={{ fontFamily: 'Open Sans, sans-serif' }}
                        placeholder="e.g., Special Offer - Up to 50% Off!"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Campaign Type *</label>
                      <select
                        required
                        value={formData.campaign_type}
                        onChange={(e) => setFormData({ ...formData, campaign_type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333]"
                        style={{ fontFamily: 'Open Sans, sans-serif' }}
                      >
                        <option value="price_reduction">Price Reduction</option>
                        <option value="rewards_increase">Rewards Increase</option>
                        <option value="free_service">Free Service</option>
                        <option value="messaging">Messaging Campaign</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Step 2: Timing */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Start Date & Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={formData.start_datetime}
                          onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333]"
                          style={{ fontFamily: 'Open Sans, sans-serif' }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>End Date & Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={formData.end_datetime}
                          onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333]"
                          style={{ fontFamily: 'Open Sans, sans-serif' }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-5 w-5 text-[#1E90FF] focus:ring-[#1E90FF] border-[#E0E0E0] rounded bg-white"
                      />
                      <label className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                        Campaign is active
                      </label>
                    </div>
                  </div>
                )}

                {/* Step 3: Places */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Select Places *</label>
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
                    </div>
                  </div>
                )}

                {/* Step 4: Services */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Target Services</label>
                      <p className="text-sm text-[#9E9E9E] mb-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>Leave empty to apply to all services</p>
                      <div className="p-4 bg-[#F5F5F5] rounded-lg border border-[#E0E0E0]">
                        <div className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          Service selection will be available after selecting places
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Campaign Configuration */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    {formData.campaign_type === 'price_reduction' && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Discount Type *</label>
                          <select
                            value={formData.discount_type}
                            onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                            className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333]"
                            style={{ fontFamily: 'Open Sans, sans-serif' }}
                          >
                            <option value="percentage">Percentage</option>
                            <option value="fixed_amount">Fixed Amount</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                            Discount Value * {formData.discount_type === 'percentage' ? '(%)' : '(€)'}
                          </label>
                          <input
                            type="number"
                            required
                            min="0.01"
                            max={formData.discount_type === 'percentage' ? 100 : undefined}
                            step={formData.discount_type === 'percentage' ? '0.1' : '0.01'}
                            value={formData.discount_value}
                            onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333]"
                            style={{ fontFamily: 'Open Sans, sans-serif' }}
                          />
                        </div>
                      </div>
                    )}

                    {formData.campaign_type === 'rewards_increase' && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Points Multiplier</label>
                          <input
                            type="number"
                            min="1"
                            step="0.1"
                            value={formData.rewards_multiplier}
                            onChange={(e) => setFormData({ ...formData, rewards_multiplier: parseFloat(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E]"
                            style={{ fontFamily: 'Open Sans, sans-serif' }}
                            placeholder="e.g., 2.0 for 2x points"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Bonus Points</label>
                          <input
                            type="number"
                            min="0"
                            value={formData.rewards_bonus_points}
                            onChange={(e) => setFormData({ ...formData, rewards_bonus_points: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E]"
                            style={{ fontFamily: 'Open Sans, sans-serif' }}
                            placeholder="e.g., 50 for 50 bonus points"
                          />
                        </div>
                      </div>
                    )}

                    {formData.campaign_type === 'free_service' && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Free Service Type *</label>
                          <select
                            value={formData.free_service_type}
                            onChange={(e) => setFormData({ ...formData, free_service_type: e.target.value as any })}
                            className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333]"
                            style={{ fontFamily: 'Open Sans, sans-serif' }}
                          >
                            <option value="specific_free">Specific Services Free</option>
                            <option value="buy_x_get_y">Buy X Get Y Free</option>
                          </select>
                        </div>
                        {formData.free_service_type === 'buy_x_get_y' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium mb-2 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Buy Quantity</label>
                              <input
                                type="number"
                                min="1"
                                value={formData.buy_quantity}
                                onChange={(e) => setFormData({ ...formData, buy_quantity: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333]"
                                style={{ fontFamily: 'Open Sans, sans-serif' }}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2 text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Get Quantity</label>
                              <input
                                type="number"
                                min="1"
                                value={formData.get_quantity}
                                onChange={(e) => setFormData({ ...formData, get_quantity: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333]"
                                style={{ fontFamily: 'Open Sans, sans-serif' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-8 border-t border-[#E0E0E0]">
                  <div>
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(currentStep - 1)}
                        className="flex items-center px-4 py-2 text-sm font-medium text-[#333333] bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg hover:bg-[#E0E0E0]"
                        style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
                      >
                        Previous
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={handleModalClose}
                      className="px-4 py-2 text-sm font-medium text-[#333333] bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg hover:bg-[#E0E0E0]"
                      style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
                    >
                      Cancel
                    </button>
                    {currentStep < 5 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(currentStep + 1)}
                        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#1E90FF] rounded-lg hover:bg-[#1877D2]"
                        style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={createCampaignMutation.isPending || updateCampaignMutation.isPending}
                        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#FF5A5F] rounded-lg hover:bg-[#E04A4F] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
                      >
                        {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Messaging Campaign Form Modal */}
      {showMessagingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white border-[#E0E0E0]">
            <div className="mt-3">
              <MessagingCampaignForm
                onSubmit={handleCreateMessagingCampaign}
                onCancel={() => setShowMessagingForm(false)}
                places={places || []}
                loading={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Campaign Recipients Modal */}
      {showRecipientsModal && selectedCampaignForRecipients && (
        <CampaignRecipientsModal
          isOpen={showRecipientsModal}
          onClose={() => {
            setShowRecipientsModal(false);
            setSelectedCampaignForRecipients(null);
          }}
          campaignId={selectedCampaignForRecipients.id}
          campaignName={selectedCampaignForRecipients.name}
          onRemoveRecipient={handleRemoveRecipient}
        />
      )}
    </div>
  );
};

export default CampaignsManagement;