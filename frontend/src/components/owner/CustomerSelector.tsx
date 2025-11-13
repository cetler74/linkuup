import React, { useState, useEffect, useMemo } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  CheckIcon, 
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
// Temporarily inline the type to debug import issue
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

interface CustomerSelectorProps {
  customers: MessagingCustomer[];
  selectedCustomerIds: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  loading?: boolean;
}

const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  customers,
  selectedCustomerIds,
  onSelectionChange,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter customers based on search and filter criteria
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term)
      );
    }

    // Apply filter criteria
    switch (filterBy) {
      case 'has_email':
        filtered = filtered.filter(customer => customer.email);
        break;
      case 'has_phone':
        filtered = filtered.filter(customer => customer.phone);
        break;
      case 'marketing_consent':
        filtered = filtered.filter(customer => customer.gdpr_marketing_consent);
        break;
      case 'recent_bookings':
        filtered = filtered.filter(customer => 
          customer.last_booking_date && 
          new Date(customer.last_booking_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        );
        break;
    }

    return filtered;
  }, [customers, searchTerm, filterBy]);

  // Handle individual customer selection
  const handleCustomerToggle = (customerId: number) => {
    const newSelection = selectedCustomerIds.includes(customerId)
      ? selectedCustomerIds.filter(id => id !== customerId)
      : [...selectedCustomerIds, customerId];
    onSelectionChange(newSelection);
  };

  // Bulk selection actions
  const handleSelectAll = () => {
    const allIds = filteredCustomers.map(customer => customer.user_id);
    onSelectionChange(allIds);
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  const handleSelectWithEmail = () => {
    const emailIds = filteredCustomers
      .filter(customer => customer.email)
      .map(customer => customer.user_id);
    onSelectionChange(emailIds);
  };

  const handleSelectWithPhone = () => {
    const phoneIds = filteredCustomers
      .filter(customer => customer.phone)
      .map(customer => customer.user_id);
    onSelectionChange(phoneIds);
  };

  const handleSelectWithConsent = () => {
    const consentIds = filteredCustomers
      .filter(customer => customer.gdpr_marketing_consent)
      .map(customer => customer.user_id);
    onSelectionChange(consentIds);
  };

  // Format phone number for display (mask middle digits)
  const formatPhoneForDisplay = (phone: string) => {
    if (!phone) return '';
    if (phone.length <= 4) return phone;
    return phone.slice(0, 2) + '****' + phone.slice(-2);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E90FF]"></div>
        <span className="ml-2 text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Loading customers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#9E9E9E]" />
          <input
            type="text"
            placeholder="Search customers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E]"
            style={{ fontFamily: 'Open Sans, sans-serif' }}
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-[#333333] bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg hover:bg-[#E0E0E0]"
              style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
            >
              <FunnelIcon className="h-4 w-4" />
              <span>Filters</span>
            </button>
            
            {showFilters && (
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="px-3 py-2 text-sm border border-[#E0E0E0] rounded-lg focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent bg-[#F5F5F5] text-[#333333]"
                style={{ fontFamily: 'Open Sans, sans-serif' }}
              >
                <option value="all">All Customers</option>
                <option value="has_email">Has Email</option>
                <option value="has_phone">Has Phone</option>
                <option value="marketing_consent">Marketing Consent</option>
                <option value="recent_bookings">Recent Bookings (30 days)</option>
              </select>
            )}
          </div>

          <div className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            {selectedCustomerIds.length} of {filteredCustomers.length} selected
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1 text-sm font-medium text-white bg-[#1E90FF] rounded-lg hover:bg-[#1877D2]"
            style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
          >
            Select All
          </button>
          <button
            onClick={handleDeselectAll}
            className="px-3 py-1 text-sm font-medium text-[#333333] bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg hover:bg-[#E0E0E0]"
            style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
          >
            Deselect All
          </button>
          <button
            onClick={handleSelectWithEmail}
            className="px-3 py-1 text-sm font-medium text-white bg-[#A3D55D] rounded-lg hover:bg-[#8BC34A]"
            style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
          >
            Select with Email
          </button>
          <button
            onClick={handleSelectWithPhone}
            className="px-3 py-1 text-sm font-medium text-white bg-[#FFD43B] rounded-lg hover:bg-[#FFC107]"
            style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
          >
            Select with Phone
          </button>
          <button
            onClick={handleSelectWithConsent}
            className="px-3 py-1 text-sm font-medium text-white bg-[#FF5A5F] rounded-lg hover:bg-[#E04A4F]"
            style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
          >
            Select with Consent
          </button>
        </div>
      </div>

      {/* Customer List */}
      <div className="border border-[#E0E0E0] rounded-lg overflow-hidden bg-white shadow-sm">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-[#9E9E9E]">
            <UserIcon className="mx-auto h-12 w-12 text-[#9E9E9E] mb-4" />
            <p style={{ fontFamily: 'Open Sans, sans-serif' }}>No customers found matching your criteria</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {filteredCustomers.map((customer) => {
              const isSelected = selectedCustomerIds.includes(customer.user_id);
              
              return (
                <div
                  key={customer.user_id}
                  className={`p-4 border-b border-[#E0E0E0] hover:bg-[#F5F5F5] transition-colors ${
                    isSelected ? 'bg-[#1E90FF] bg-opacity-10 border-[#1E90FF]' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Selection Checkbox */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => handleCustomerToggle(customer.user_id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#1E90FF] border-[#1E90FF] text-white'
                            : 'border-[#E0E0E0] hover:border-[#1E90FF] bg-white'
                        }`}
                      >
                        {isSelected && <CheckIcon className="h-3 w-3" />}
                      </button>
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-[#333333] truncate" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          {customer.name}
                        </h3>
                        {customer.gdpr_marketing_consent && (
                          <CheckCircleIcon className="h-4 w-4 text-[#A3D55D]" title="Marketing consent given" />
                        )}
                      </div>
                      
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-[#9E9E9E]">
                          <EnvelopeIcon className="h-4 w-4" />
                          <span style={{ fontFamily: 'Open Sans, sans-serif' }}>{customer.email || 'No email'}</span>
                        </div>
                        
                        {customer.phone && (
                          <div className="flex items-center space-x-2 text-sm text-[#9E9E9E]">
                            <PhoneIcon className="h-4 w-4" />
                            <span style={{ fontFamily: 'Open Sans, sans-serif' }}>{formatPhoneForDisplay(customer.phone)}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2 text-sm text-[#9E9E9E]">
                          <CalendarIcon className="h-4 w-4" />
                          <span style={{ fontFamily: 'Open Sans, sans-serif' }}>Last booking: {formatDate(customer.last_booking_date || '')}</span>
                          <span className="text-[#E0E0E0]">•</span>
                          <span style={{ fontFamily: 'Open Sans, sans-serif' }}>{customer.total_bookings} bookings</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Indicators */}
                    <div className="flex-shrink-0 flex flex-col items-end space-y-1">
                      <div className="flex items-center space-x-2">
                        {customer.email && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#A3D55D] text-white" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                            Email
                          </span>
                        )}
                        {customer.phone && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#1E90FF] text-white" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                            WhatsApp
                          </span>
                        )}
                      </div>
                      
                      {!customer.gdpr_marketing_consent && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#FF5A5F] text-white" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          No Consent
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selection Summary */}
      {selectedCustomerIds.length > 0 && (
        <div className="bg-[#1E90FF] border border-[#1E90FF] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-white" />
              <span className="text-sm font-medium text-white" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                {selectedCustomerIds.length} customer{selectedCustomerIds.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <button
              onClick={handleDeselectAll}
              className="text-sm text-white hover:opacity-80 font-medium transition-opacity"
              style={{ fontFamily: 'Open Sans, sans-serif' }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSelector;
