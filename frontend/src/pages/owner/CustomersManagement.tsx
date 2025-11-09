import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  BuildingOfficeIcon, 
  UserIcon, 
  GiftIcon,
  ChevronDownIcon, 
  ChevronRightIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  TagIcon,
  ShieldCheckIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useOwnerApi } from '../../utils/ownerApi';
import CustomerMessageModal from '../../components/owner/CustomerMessageModal';

interface Customer {
  user_id: number;
  place_id: number;
  user_name: string;
  user_email: string;
  user_phone?: string;
  total_bookings: number;
  completed_bookings: number;
  last_booking_date?: string;
  first_booking_date?: string;
  points_balance?: number;
  tier?: string;
  last_service_name?: string;
  last_campaign_name?: string;
  last_campaign_type?: string;
  // Subscription and opt-in information
  gdpr_data_processing_consent?: boolean;
  gdpr_data_processing_consent_date?: string;
  gdpr_marketing_consent?: boolean;
  gdpr_marketing_consent_date?: string;
  gdpr_consent_version?: string;
  rewards_program_subscribed?: boolean;
  is_active_user?: boolean;
}

interface Place {
  id: number;
  name: string;
  location_type: 'fixed' | 'mobile';
  city?: string;
  service_areas?: string[];
}

const CustomersManagement: React.FC = () => {
  const navigate = useNavigate();
  const { usePlaces, usePlaceCustomers, usePlaceFeatureSettings, useSendMessage } = useOwnerApi();
  
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set());
  const [rewardsEnabled, setRewardsEnabled] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: places = [] } = usePlaces();
  
  const searchParams = useMemo(() => ({
    search_term: searchTerm,
    tier_filter: tierFilter,
    booking_status_filter: bookingStatusFilter,
    page: 1,
    page_size: 100
  }), [searchTerm, tierFilter, bookingStatusFilter]);
  
  const { data: customersData, isLoading } = usePlaceCustomers(selectedPlace?.id || 0, searchParams);
  const { data: featureSettings } = usePlaceFeatureSettings(selectedPlace?.id || 0);
  const sendMessageMutation = useSendMessage();

  useEffect(() => {
    if (places.length > 0 && !selectedPlace) {
      setSelectedPlace(places[0]);
    }
  }, [places, selectedPlace]);

  useEffect(() => {
    if (customersData?.customers) {
      console.log('Customers data received:', customersData.customers);
      setCustomers(customersData.customers);
    }
  }, [customersData]);

  useEffect(() => {
    if (featureSettings?.feature_settings) {
      console.log('Feature settings received:', featureSettings.feature_settings);
      setRewardsEnabled(featureSettings.feature_settings.rewards_enabled);
    } else {
      console.log('No feature settings received, using default');
      setRewardsEnabled(false); // Default to false if no settings
    }
  }, [featureSettings]);

  const toggleCustomerExpansion = (userId: number) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedCustomers(newExpanded);
  };

  const handleSendMessage = async (message: { subject: string; content: string; message_type: string }) => {
    if (!selectedCustomer || !selectedPlace) return;

    await sendMessageMutation.mutateAsync({
      business_id: selectedPlace.id,
      customer_name: selectedCustomer.user_name,
      customer_email: selectedCustomer.user_email,
      sender_type: 'business_owner',
      message_type: message.message_type,
      subject: message.subject,
      content: message.content
    });
  };

  const openMessageModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowMessageModal(true);
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
    setSelectedCustomer(null);
  };

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'bronze': return 'text-amber-700 bg-amber-100';
      case 'silver': return 'text-gray-700 bg-gray-100';
      case 'gold': return 'text-yellow-700 bg-yellow-100';
      case 'platinum': return 'text-purple-700 bg-purple-100';
      default: return 'text-[#9E9E9E] bg-[#F5F5F5]';
    }
  };

  // Filter places based on search term
  const filteredPlaces = places.filter(place =>
    place.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter customers based on search term, tier, and booking status
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchTerm || 
      customer.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTier = !tierFilter || customer.tier === tierFilter;
    const matchesBookingStatus = !bookingStatusFilter || 
      (bookingStatusFilter === 'completed' && customer.completed_bookings > 0) ||
      (bookingStatusFilter === 'pending' && customer.total_bookings > customer.completed_bookings) ||
      (bookingStatusFilter === 'cancelled' && customer.total_bookings === 0);
    
    return matchesSearch && matchesTier && matchesBookingStatus;
  });

  // Deduplicate customers by email and place_id to prevent duplicate keys
  const uniqueCustomers = filteredCustomers.reduce((acc, customer, index) => {
    const key = `${customer.user_email}-${customer.place_id}`;
    if (!acc.find(c => `${c.user_email}-${c.place_id}` === key)) {
      acc.push(customer);
    }
    return acc;
  }, [] as Customer[]);

  // Debug calculations
  const activeBookings = uniqueCustomers.reduce((sum, customer) => sum + (customer.total_bookings - customer.completed_bookings), 0);
  const completedBookings = uniqueCustomers.reduce((sum, customer) => sum + customer.completed_bookings, 0);
  
  console.log('Customer calculations:', {
    totalCustomers: uniqueCustomers.length,
    activeBookings,
    completedBookings,
    rewardsEnabled
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1E90FF]"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-[#F5F5F5] overflow-hidden">
        {/* Header */}
        <div className="bg-transparent border-b border-medium-gray p-3 sm:p-4 lg:p-6 rounded-lg" style={{ borderRadius: '8px' }}>
          <div className="max-w-7xl">
            <div className="flex flex-wrap justify-start items-center gap-2 sm:gap-3 mb-4">
              <h1 className="text-charcoal text-xl sm:text-2xl lg:text-3xl font-bold leading-tight font-display">
                Customers Management
              </h1>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-charcoal/60" />
                </div>
                <input
                  type="text"
                  className="input-field pl-8 sm:pl-10 text-sm sm:text-base"
                  placeholder="Search for a place"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Place Selector - Horizontal Tabs */}
            <div className="bg-white rounded-lg shadow-form p-4" style={{ borderRadius: '8px' }}>
              <label className="block text-sm font-medium text-charcoal mb-3 font-body px-1" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>
                Select Place
              </label>
              <div className="overflow-x-auto -mx-4 px-4">
                <div className="flex gap-2 -mb-px border-b border-medium-gray">
                {filteredPlaces.map((place) => {
                  const isSelected = selectedPlace?.id === place.id;
                  return (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => setSelectedPlace(place)}
                      className={`
                        flex items-center gap-2 px-3 py-2.5 max-[412px]:px-4 max-[412px]:py-3 max-[412px]:min-h-[48px] border-b-2 transition-all duration-200 font-body flex-shrink-0 rounded-lg max-[412px]:rounded-full
                        ${isSelected 
                          ? 'border-bright-blue text-bright-blue bg-bright-blue bg-opacity-10' 
                          : 'border-transparent text-charcoal opacity-70 hover:opacity-100 hover:border-medium-gray hover:bg-light-gray'
                        }
                      `}
                      style={{ 
                        fontFamily: 'Open Sans, sans-serif', 
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: '14px'
                      }}
                    >
                      <div className={`flex items-center justify-center rounded-lg shrink-0 size-7 ${
                        isSelected ? 'bg-bright-blue' : 'bg-light-gray'
                      }`}>
                        {place.location_type === 'mobile' ? (
                          <MapPinIcon className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-bright-blue'}`} />
                        ) : (
                          <BuildingOfficeIcon className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-bright-blue'}`} />
                        )}
                      </div>
                      <span className="text-sm whitespace-nowrap">
                        {place.name} ({place.location_type === 'fixed' ? 'Fixed' : 'Mobile'})
                      </span>
                    </button>
                  );
                })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="max-w-7xl w-full">
            <div className="bg-white border-b border-[#E0E0E0] px-3 lg:px-6 py-3 lg:py-4 shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg w-full max-w-full lg:w-[1280px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="mt-1 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                  {selectedPlace ? `Manage customers for ${selectedPlace.name}` : 'Select a place to manage customers'}
                </p>
              </div>
            </div>
            
            {/* Search and Filter Bar */}
            {selectedPlace && customers.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                      Showing {filteredCustomers.length} of {customers.length} customers
                    </span>
                    {(searchTerm || tierFilter || bookingStatusFilter) && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setTierFilter('');
                          setBookingStatusFilter('');
                        }}
                        className="text-sm max-[412px]:text-base max-[412px]:px-3 max-[412px]:py-2 max-[412px]:min-h-[44px] max-[412px]:rounded-full text-[#1E90FF] hover:text-[#1877D2] underline max-[412px]:no-underline max-[412px]:bg-[#1E90FF] max-[412px]:text-white max-[412px]:hover:bg-[#1877D2]"
                        style={{ fontFamily: 'Open Sans, sans-serif' }}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-[#9E9E9E]" />
                      </div>
                      <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF]"
                        placeholder="Search customers by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ fontFamily: 'Open Sans, sans-serif' }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
          {rewardsEnabled && (
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
                        className="px-3 py-2 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF]"
                        style={{ fontFamily: 'Open Sans, sans-serif' }}
            >
              <option value="">All Tiers</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>
          )}
          <select
            value={bookingStatusFilter}
            onChange={(e) => setBookingStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF]"
                      style={{ fontFamily: 'Open Sans, sans-serif' }}
          >
            <option value="">All Bookings</option>
            <option value="completed">Completed Only</option>
            <option value="pending">Pending Only</option>
            <option value="cancelled">Cancelled Only</option>
          </select>
        </div>
                </div>
              </div>
            )}
            </div>
            </div>
          </div>

          {/* Customers Content */}
          <div className="flex-1 overflow-y-auto p-3 max-[412px]:p-2 sm:p-4 lg:p-6 bg-[#F5F5F5]">
            {selectedPlace ? (
              <>
                <div className="max-w-7xl w-full">
                {/* Quick Stats */}
                {customers.length > 0 && (
                  <div className="grid grid-cols-2 max-[412px]:grid-cols-1 lg:grid-cols-4 gap-2 lg:gap-4 mb-4 lg:mb-6 w-full max-w-full lg:w-[1280px]">
                    <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-2 lg:p-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <UserIcon className="h-8 w-8 text-[#1E90FF]" />
            </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Total Customers</p>
                          <p className="text-2xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>{uniqueCustomers.length}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-4 border border-[#E0E0E0]">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white"></div>
                          </div>
                            </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Active Bookings</p>
                          <p className="text-2xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {activeBookings}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-4 border border-[#E0E0E0]">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white"></div>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Completed</p>
                          <p className="text-2xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {completedBookings}
                          </p>
                        </div>
                      </div>
                      </div>
                    
                    <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-4 border border-[#E0E0E0]">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <GiftIcon className="h-8 w-8 text-[#1E90FF]" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Rewards Enabled</p>
                          <p className="text-2xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {rewardsEnabled ? 'Yes' : 'No'}
                          </p>
                        </div>
                      </div>
                    </div>
                        </div>
                      )}
                
                <div className="bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.1)] overflow-hidden sm:rounded-lg border border-[#E0E0E0] w-full max-w-full lg:max-w-[1280px]">
                  {uniqueCustomers.length === 0 ? (
                    <div className="text-center py-12">
                      <UserIcon className="mx-auto h-12 w-12 text-[#9E9E9E]" />
                      <h3 className="mt-2 text-sm font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        {uniqueCustomers.length === 0 ? 'No customers' : 'No customers match your filters'}
                      </h3>
                      <p className="mt-1 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                        {uniqueCustomers.length === 0 
                          ? 'Customers will appear here after they make bookings.'
                          : 'Try adjusting your search or filter criteria.'
                        }
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-[#E0E0E0]">
                      {uniqueCustomers.map((customer, index) => (
                        <li key={`customer-${customer.user_email}-${customer.place_id}-${index}`} className="bg-white hover:bg-[#F5F5F5] transition-colors">
                          <div className="px-3 lg:px-6 py-4 lg:py-6">
                            {/* Main Customer Information */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-2 lg:space-x-4">
                                <div className="flex-shrink-0">
                                  <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-full flex items-center justify-center shadow-lg bg-[#1E90FF]">
                                    <UserIcon className="h-5 w-5 lg:h-7 lg:w-7 text-white" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 lg:space-x-3 mb-2">
                                    <h3 className="text-base lg:text-lg font-semibold text-[#333333] truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>{customer.user_name}</h3>
                                    <div className="flex items-center space-x-2">
                                      {rewardsEnabled && customer.tier && (
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTierColor(customer.tier)}`}>
                                          {customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1)}
                                        </span>
                                      )}
                    </div>
                  </div>

                                  {/* Contact Information */}
                                  <div className="grid grid-cols-1 max-[412px]:grid-cols-1 lg:grid-cols-2 gap-3 max-[412px]:gap-2 lg:gap-4 mb-3 lg:mb-4">
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <EnvelopeIcon className="h-4 w-4 text-[#9E9E9E]" />
                                        <span className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{customer.user_email}</span>
                                      </div>
                                      {customer.user_phone && (
                                        <div className="flex items-center space-x-2">
                                          <PhoneIcon className="h-4 w-4 text-[#9E9E9E]" />
                                          <span className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{customer.user_phone}</span>
                                        </div>
                                      )}
                  </div>

                          <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <CalendarIcon className="h-4 w-4 text-[#9E9E9E]" />
                                        <span className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                          First: {customer.first_booking_date ? 
                                  new Date(customer.first_booking_date).toLocaleDateString() : 
                                  'N/A'
                                }
                              </span>
                            </div>
                                      <div className="flex items-center space-x-2">
                                        <ClockIcon className="h-4 w-4 text-[#9E9E9E]" />
                                        <span className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                          Last: {customer.last_booking_date ? 
                                  new Date(customer.last_booking_date).toLocaleDateString() : 
                                  'N/A'
                                }
                              </span>
                                      </div>
                                      {customer.last_service_name && (
                                        <div className="flex items-center space-x-2">
                                          <TagIcon className="h-4 w-4 text-[#9E9E9E]" />
                                          <span className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                            Last Service: {customer.last_service_name}
                                          </span>
                                        </div>
                                      )}
                                      {customer.last_campaign_name && (
                                        <div className="flex items-center space-x-2">
                                          <GiftIcon className="h-4 w-4 text-[#9E9E9E]" />
                                          <span className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                            Last Campaign: {customer.last_campaign_name}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                            </div>
                          </div>
                        </div>
                        
                              {/* Action Buttons */}
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4 lg:mt-0 lg:space-x-2">
                                <button
                                  onClick={() => toggleCustomerExpansion(customer.user_id)}
                                  className="flex items-center justify-center space-x-1 px-3 py-2 max-[412px]:px-4 max-[412px]:py-3 max-[412px]:min-h-[44px] max-[412px]:rounded-full text-xs lg:text-sm font-medium text-[#333333] hover:text-[#1E90FF] hover:bg-[#F5F5F5] rounded-lg transition-colors border border-[#E0E0E0]"
                                  title="Toggle Details"
                                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                                >
                                  {expandedCustomers.has(customer.user_id) ? (
                                    <>
                                      <ChevronDownIcon className="h-4 w-4" />
                                      <span>Hide Details</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronRightIcon className="h-4 w-4" />
                                      <span>Show Details</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => openMessageModal(customer)}
                                  className="flex items-center justify-center space-x-1 px-3 py-2 max-[412px]:px-4 max-[412px]:py-3 max-[412px]:min-h-[44px] max-[412px]:rounded-full text-xs lg:text-sm font-medium text-white bg-[#FF5A5F] hover:bg-[#E54B50] rounded-lg transition-colors"
                                  title="Send Message"
                                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                                >
                                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                  <span>Message</span>
                                </button>
                                <button
                                  onClick={() => navigate(`/owner/customers/${customer.user_id}?place=${selectedPlace?.id}`)}
                                  className="flex items-center justify-center space-x-1 px-3 py-2 max-[412px]:px-4 max-[412px]:py-3 max-[412px]:min-h-[44px] max-[412px]:rounded-full text-xs lg:text-sm font-medium text-white bg-[#1E90FF] hover:bg-[#1877D2] rounded-lg transition-colors"
                                  title="View Details"
                                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                                >
                                  <UserIcon className="h-4 w-4" />
                                  <span>View Details</span>
                                </button>
                              </div>
                            </div>
                            
                            {/* Expanded Detailed Information */}
                            {expandedCustomers.has(customer.user_id) && (
                              <div className="mt-4 max-[412px]:mt-3 lg:mt-6 pt-4 max-[412px]:pt-3 lg:pt-6 border-t border-[#E0E0E0]">
                                <div className="grid grid-cols-1 max-[412px]:grid-cols-1 lg:grid-cols-2 gap-3 max-[412px]:gap-2 lg:gap-6">
                                  
                                  {/* Customer Details Card */}
                                  <div className="bg-white rounded-lg p-3 max-[412px]:p-2 lg:p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.1)] border border-[#E0E0E0]">
                                    <h4 className="text-lg font-semibold text-[#333333] mb-4 flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                      <UserIcon className="h-5 w-5 mr-2 text-[#1E90FF]" />
                                      Customer Details
                                    </h4>
                                    <div className="space-y-4">
                                      <div>
                                        <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>Full Name</label>
                                        <p className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{customer.user_name}</p>
                                      </div>
                                      
                                      <div>
                                        <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>Email Address</label>
                                        <p className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{customer.user_email}</p>
                                      </div>
                                      
                                      {customer.user_phone && (
                                        <div>
                                          <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>Phone Number</label>
                                          <p className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{customer.user_phone}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Booking Statistics Card */}
                                  <div className="bg-white rounded-lg p-3 max-[412px]:p-2 lg:p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.1)] border border-[#E0E0E0]">
                                    <h4 className="text-lg font-semibold text-[#333333] mb-4 flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                      <CalendarIcon className="h-5 w-5 mr-2 text-[#1E90FF]" />
                                      Booking Statistics
                                    </h4>
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>Total Bookings</label>
                                          <p className="text-2xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>{customer.total_bookings}</p>
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>Completed</label>
                                          <p className="text-2xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>{customer.completed_bookings}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>First Booking</label>
                                          <p className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                            {customer.first_booking_date ? 
                                              new Date(customer.first_booking_date).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                              }) : 
                                              'N/A'
                                            }
                                          </p>
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>Last Booking</label>
                                          <p className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                            {customer.last_booking_date ? 
                                              new Date(customer.last_booking_date).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                              }) : 
                                              'N/A'
                                            }
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Subscription & Opt-in Information Card */}
                                  <div className="bg-white rounded-lg p-3 max-[412px]:p-2 lg:p-6 lg:col-span-2 shadow-[0px_2px_8px_rgba(0,0,0,0.1)] border border-[#E0E0E0]">
                                    <h4 className="text-lg font-semibold text-[#333333] mb-4 flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                      <ShieldCheckIcon className="h-5 w-5 mr-2 text-[#1E90FF]" />
                                      Subscriptions & Opt-ins
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      
                                      {/* GDPR Consent Section */}
                                      <div>
                                        <h5 className="text-sm font-medium text-[#333333] mb-3 flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                          <ShieldCheckIcon className="h-4 w-4 mr-2 text-[#1E90FF]" />
                                          GDPR Consent
                                        </h5>
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Data Processing</span>
                                            <div className="flex items-center">
                                              {customer.gdpr_data_processing_consent === true ? (
                                                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                                              ) : customer.gdpr_data_processing_consent === false ? (
                                                <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                                              ) : (
                                                <div className="h-4 w-4 rounded-full bg-[#9E9E9E] mr-1"></div>
                                              )}
                                              <span className={`text-xs font-medium ${
                                                customer.gdpr_data_processing_consent === true ? 'text-green-600' :
                                                customer.gdpr_data_processing_consent === false ? 'text-red-600' :
                                                'text-[#9E9E9E]'
                                              }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                                {customer.gdpr_data_processing_consent === true ? 'Consented' :
                                                 customer.gdpr_data_processing_consent === false ? 'Declined' :
                                                 'Unknown'}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Marketing</span>
                                            <div className="flex items-center">
                                              {customer.gdpr_marketing_consent === true ? (
                                                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                                              ) : customer.gdpr_marketing_consent === false ? (
                                                <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                                              ) : (
                                                <div className="h-4 w-4 rounded-full bg-[#9E9E9E] mr-1"></div>
                                              )}
                                              <span className={`text-xs font-medium ${
                                                customer.gdpr_marketing_consent === true ? 'text-green-600' :
                                                customer.gdpr_marketing_consent === false ? 'text-red-600' :
                                                'text-[#9E9E9E]'
                                              }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                                {customer.gdpr_marketing_consent === true ? 'Consented' :
                                                 customer.gdpr_marketing_consent === false ? 'Declined' :
                                                 'Unknown'}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          {customer.gdpr_consent_version && (
                                            <div className="text-xs text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                              Version: {customer.gdpr_consent_version}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Program Subscriptions Section */}
                                      <div>
                                        <h5 className="text-sm font-medium text-[#333333] mb-3 flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                          <BellIcon className="h-4 w-4 mr-2 text-[#1E90FF]" />
                                          Program Subscriptions
                                        </h5>
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Rewards Program</span>
                                            <div className="flex items-center">
                                              {customer.rewards_program_subscribed === true ? (
                                                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                                              ) : customer.rewards_program_subscribed === false ? (
                                                <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                                              ) : (
                                                <div className="h-4 w-4 rounded-full bg-[#9E9E9E] mr-1"></div>
                                              )}
                                              <span className={`text-xs font-medium ${
                                                customer.rewards_program_subscribed === true ? 'text-green-600' :
                                                customer.rewards_program_subscribed === false ? 'text-red-600' :
                                                'text-[#9E9E9E]'
                                              }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                                {customer.rewards_program_subscribed === true ? 'Subscribed' :
                                                 customer.rewards_program_subscribed === false ? 'Not Subscribed' :
                                                 'Unknown'}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Account Status</span>
                                            <div className="flex items-center">
                                              {customer.is_active_user === true ? (
                                                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                                              ) : customer.is_active_user === false ? (
                                                <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                                              ) : (
                                                <div className="h-4 w-4 rounded-full bg-[#9E9E9E] mr-1"></div>
                                              )}
                                              <span className={`text-xs font-medium ${
                                                customer.is_active_user === true ? 'text-green-600' :
                                                customer.is_active_user === false ? 'text-red-600' :
                                                'text-[#9E9E9E]'
                                              }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                                {customer.is_active_user === true ? 'Active' :
                                                 customer.is_active_user === false ? 'Inactive' :
                                                 'Unknown'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Rewards Card */}
                                  {rewardsEnabled && (
                                    <div className="bg-white rounded-lg p-3 max-[412px]:p-2 lg:p-6 lg:col-span-2 shadow-[0px_2px_8px_rgba(0,0,0,0.1)] border border-[#E0E0E0]">
                                      <h4 className="text-lg font-semibold text-[#333333] mb-4 flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                        <GiftIcon className="h-5 w-5 mr-2 text-[#1E90FF]" />
                                        Rewards & Loyalty
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                          <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>Current Points</label>
                                          <p className="text-3xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>{customer.points_balance || 0}</p>
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>Tier Status</label>
                                          <div className="mt-2">
                                            <span className={`inline-flex px-4 py-2 text-sm font-medium rounded-full ${getTierColor(customer.tier)}`}>
                                  {customer.tier ? customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1) : 'Bronze'}
                                </span>
                                          </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      </div>
                            )}
                    </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <UserIcon className="mx-auto h-12 w-12 text-[#9E9E9E]" />
                <h3 className="mt-2 text-sm font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>Select a place</h3>
                <p className="mt-1 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                  Choose a place from the sidebar to manage customers.
                </p>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Message Modal */}
      {selectedCustomer && (
        <CustomerMessageModal
          isOpen={showMessageModal}
          onClose={closeMessageModal}
          customer={selectedCustomer}
          onSendMessage={handleSendMessage}
        />
      )}
    </>
  );
};

export default CustomersManagement;
