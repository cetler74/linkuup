import React, { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import { useTranslation } from 'react-i18next';
import ServiceManagement from '../components/admin/ServiceManagement';
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  MegaphoneIcon,
  ChatBubbleLeftRightIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface AdminStats {
  users: {
    total: number;
    active: number;
    admins: number;
  };
  salons: {
    total: number;
    active: number;
    booking_enabled: number;
    total_services: number;
  };
  bookings: {
    total: number;
    recent_week: number;
  };
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  salon_count: number;
  created_at: string;
}

interface AdminSalonService {
  id: number;
  service_id: number;
  name: string;
  category: string;
  description: string;
  is_bio_diamond: boolean;
  price: number;
  duration: number;
}

interface AdminSalon {
  id: number;
  nome: string;
  cidade: string;
  regiao: string;
  telefone?: string;
  email?: string;
  estado: string;
  booking_enabled: boolean;
  is_active: boolean;
  is_bio_diamond: boolean;
  owner?: {
    id: number;
    name: string;
    email: string;
    customer_id?: string;
  };
  services: AdminSalonService[];
  services_count: number;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'stats' | 'owners' | 'places' | 'bookings' | 'campaigns' | 'messages' | 'services'>('stats');
  const [stats, setStats] = useState<any | null>(null);
  const [owners, setOwners] = useState<any[]>([]);
  const [places, setPlaces] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedPlaces, setExpandedPlaces] = useState<Set<number>>(new Set());
  const [selectedOwner, setSelectedOwner] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [activeTab, currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'stats') {
        const statsData = await adminAPI.getStats();
        setStats(statsData);
      } else if (activeTab === 'owners') {
        const ownersData = await adminAPI.getOwners(currentPage, 20, searchTerm, statusFilter);
        setOwners(ownersData.items);
        setTotalPages(ownersData.pages);
      } else if (activeTab === 'places') {
        const placesData = await adminAPI.getPlaces(currentPage, 20, searchTerm, selectedOwner || undefined, undefined, undefined, statusFilter);
        setPlaces(placesData.items);
        setTotalPages(placesData.pages);
      } else if (activeTab === 'bookings') {
        const bookingsData = await adminAPI.getBookings(currentPage, 20);
        setBookings(bookingsData.items);
        setTotalPages(bookingsData.pages);
      } else if (activeTab === 'campaigns') {
        const campaignsData = await adminAPI.getCampaigns(currentPage, 20, statusFilter);
        setCampaigns(campaignsData.items);
        setTotalPages(campaignsData.pages);
      } else if (activeTab === 'messages') {
        const messagesData = await adminAPI.getAdminMessages(currentPage, 20, statusFilter);
        setMessages(messagesData.items);
        setTotalPages(messagesData.pages);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      
      if (err.response?.status === 401 || err.response?.data?.detail === 'Not authenticated') {
        setError('Authentication required. Please log in as a platform administrator.');
      } else if (err.response?.status === 403) {
        setError('Access denied. You do not have administrator privileges.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later or contact support.');
      } else {
        setError(err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOwnerStatus = async (ownerId: number) => {
    try {
      await adminAPI.toggleOwnerStatus(ownerId);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update owner status');
    }
  };

  const handleTogglePlaceBooking = async (placeId: number) => {
    try {
      await adminAPI.togglePlaceBooking(placeId);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update place booking status');
    }
  };

  const handleTogglePlaceStatus = async (placeId: number) => {
    try {
      await adminAPI.togglePlaceStatus(placeId);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update place status');
    }
  };

  const handleTogglePlaceBioDiamond = async (placeId: number) => {
    try {
      await adminAPI.togglePlaceBioDiamond(placeId);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update BIO Diamond status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const togglePlaceExpansion = (placeId: number) => {
    const newExpanded = new Set(expandedPlaces);
    if (newExpanded.has(placeId)) {
      newExpanded.delete(placeId);
    } else {
      newExpanded.add(placeId);
    }
    setExpandedPlaces(newExpanded);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  const groupPlacesByOwner = (places: any[]) => {
    const grouped: { [key: string]: { owner: any; places: any[] } } = {};
    
    places.forEach(place => {
      const ownerKey = place.owner ? `${place.owner.id}-${place.owner.name}` : 'no-owner';
      
      if (!grouped[ownerKey]) {
        grouped[ownerKey] = {
          owner: place.owner || { name: 'No Owner', customer_id: null },
          places: []
        };
      }
      
      grouped[ownerKey].places.push(place);
    });
    
    return Object.entries(grouped).sort(([a], [b]) => {
      if (a === 'no-owner') return 1;
      if (b === 'no-owner') return -1;
      return grouped[a].owner.name.localeCompare(grouped[b].owner.name);
    });
  };

  if (loading && !stats && !owners.length && !places.length && !bookings.length && !campaigns.length && !messages.length) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1E90FF]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {t('admin.dashboard') || 'Admin Dashboard'}
        </h1>
        <p className="mt-1 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
          {t('admin.overview') || 'Platform administration and management'}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg border-l-4 border-[#FF5A5F] p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[#FF5A5F]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {error.includes('Authentication') ? 'Authentication Required' : 
                 error.includes('Access denied') ? 'Access Denied' : 
                 error.includes('Server error') ? 'Server Error' : 'Error'}
              </h3>
              <div className="mt-2 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                <p>{error}</p>
                {error.includes('Authentication') && (
                  <div className="mt-2">
                    <p className="font-medium text-[#333333]">To access the Admin Dashboard:</p>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Log out of your current account</li>
                      <li>Log in with platform.admin@linkuup.com</li>
                      <li>Use password: PlatformAdmin2025!</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg">
        <div className="border-b border-[#E0E0E0]">
          <nav className="flex space-x-1 overflow-x-auto px-4" aria-label="Tabs">
            {[
              { id: 'stats', label: t('admin.overview') || 'Overview', icon: ChartBarIcon },
              { id: 'owners', label: 'Owners', icon: UserGroupIcon },
              { id: 'places', label: 'Places', icon: BuildingOfficeIcon },
              { id: 'bookings', label: 'Bookings', icon: CalendarIcon },
              { id: 'campaigns', label: 'Campaigns', icon: MegaphoneIcon },
              { id: 'messages', label: 'Messages', icon: ChatBubbleLeftRightIcon },
              { id: 'services', label: t('admin.services') || 'Services', icon: WrenchScrewdriverIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setCurrentPage(1);
                  }}
                  className={`
                    flex items-center space-x-2 py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                    ${activeTab === tab.id
                      ? 'border-[#1E90FF] text-[#1E90FF]'
                      : 'border-transparent text-[#9E9E9E] hover:text-[#333333] hover:border-[#E0E0E0]'
                    }
                  `}
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'stats' && (
        <>
          {loading && !stats ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E90FF]"></div>
              <span className="ml-3 text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Loading statistics...</span>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Users Stats */}
              <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UserGroupIcon className="h-6 w-6 text-[#1E90FF]" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-[#9E9E9E] truncate" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          Total Users
                        </dt>
                        <dd className="text-lg font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {stats?.users?.total || 0}
                        </dd>
                        <dd className="text-xs text-[#9E9E9E] mt-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          {stats?.users?.active || 0} active • {stats?.users?.admins || 0} admins
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Places Stats */}
              <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BuildingOfficeIcon className="h-6 w-6 text-[#FF5A5F]" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-[#9E9E9E] truncate" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          Total Places
                        </dt>
                        <dd className="text-lg font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {stats?.places?.total || stats?.salons?.total || 0}
                        </dd>
                        <dd className="text-xs text-[#9E9E9E] mt-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          {stats?.places?.active || stats?.salons?.active || 0} active • {stats?.places?.booking_enabled || stats?.salons?.booking_enabled || 0} booking enabled
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bookings Stats */}
              <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CalendarIcon className="h-6 w-6 text-[#A3D55D]" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-[#9E9E9E] truncate" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          Total Bookings
                        </dt>
                        <dd className="text-lg font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {stats?.bookings?.total || 0}
                        </dd>
                        <dd className="text-xs text-[#9E9E9E] mt-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          {stats?.bookings?.recent_week || 0} this week
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services Stats */}
              <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <WrenchScrewdriverIcon className="h-6 w-6 text-[#FFD43B]" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-[#9E9E9E] truncate" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          Total Services
                        </dt>
                        <dd className="text-lg font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {stats?.places?.total_services || stats?.salons?.total_services || 0}
                        </dd>
                        <dd className="text-xs text-[#9E9E9E] mt-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          Across all places
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg p-8 text-center">
              <p className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>No statistics available</p>
            </div>
          )}
        </>
      )}

      {/* Owners Tab */}
      {activeTab === 'owners' && (
        <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {t('admin.userManagement') || 'Owner Management'}
            </h3>
            <p className="mt-1 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              Manage business owners and their accounts
            </p>
          </div>
          <div className="divide-y divide-[#E0E0E0]">
            {loading ? (
              <div className="px-4 py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E90FF] mx-auto"></div>
              </div>
            ) : owners.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <UserGroupIcon className="h-12 w-12 text-[#9E9E9E] mx-auto mb-4" />
                <p className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>No owners found</p>
              </div>
            ) : (
              owners.map((owner) => (
                <div key={owner.id} className="px-4 py-4 sm:px-6 hover:bg-[#F5F5F5] transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          owner.is_admin ? 'bg-[#1E90FF]' : 'bg-[#A3D55D]'
                        }`}>
                          <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {owner.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <p className="text-base font-semibold text-[#333333] truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {owner.name}
                          </p>
                          {owner.is_admin && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1E90FF] bg-opacity-20 text-[#1E90FF]">
                              Admin
                            </span>
                          )}
                          {!owner.is_active && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FF5A5F] bg-opacity-20 text-[#FF5A5F]">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#9E9E9E] truncate mt-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          {owner.email}
                        </p>
                        <p className="text-sm text-[#9E9E9E] mt-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          {owner.place_count || owner.salon_count || 0} place{(owner.place_count || owner.salon_count || 0) !== 1 ? 's' : ''} • Joined {formatDate(owner.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end sm:justify-start">
                      <button
                        onClick={() => handleToggleOwnerStatus(owner.id)}
                        className={`inline-flex items-center px-6 py-3 border text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                          owner.is_active
                            ? 'text-[#FF5A5F] bg-[#FF5A5F] bg-opacity-10 border-[#FF5A5F] border-opacity-30 hover:bg-opacity-20'
                            : 'text-[#A3D55D] bg-[#A3D55D] bg-opacity-10 border-[#A3D55D] border-opacity-30 hover:bg-opacity-20'
                        }`}
                        style={{ fontFamily: 'Open Sans, sans-serif' }}
                      >
                        {owner.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-4 flex items-center justify-between border-t border-[#E0E0E0]">
              <div className="flex-1 flex justify-between gap-3 sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center justify-center px-4 py-2 border border-[#E0E0E0] text-sm font-medium rounded-lg text-[#333333] bg-white hover:bg-[#F5F5F5] disabled:opacity-50"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center justify-center px-4 py-2 border border-[#E0E0E0] text-sm font-medium rounded-lg text-[#333333] bg-white hover:bg-[#F5F5F5] disabled:opacity-50"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                    Page <span className="font-medium text-[#333333]">{currentPage}</span> of{' '}
                    <span className="font-medium text-[#333333]">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-lg -space-x-px">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 rounded-l-lg border border-[#E0E0E0] bg-white text-sm font-medium text-[#333333] hover:bg-[#F5F5F5] disabled:opacity-50"
                      style={{ fontFamily: 'Open Sans, sans-serif' }}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-4 py-2 rounded-r-lg border border-[#E0E0E0] bg-white text-sm font-medium text-[#333333] hover:bg-[#F5F5F5] disabled:opacity-50"
                      style={{ fontFamily: 'Open Sans, sans-serif' }}
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Places Tab - Using same style but simplified for space */}
      {activeTab === 'places' && (
        <div className="space-y-6">
          <div className="bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>Places Management</h3>
              <p className="mt-1 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Manage all places across the platform</p>
            </div>
            {loading ? (
              <div className="px-4 py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E90FF] mx-auto"></div>
              </div>
            ) : places.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <BuildingOfficeIcon className="h-12 w-12 text-[#9E9E9E] mx-auto mb-4" />
                <p className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>No places found</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E0E0E0]">
                {groupPlacesByOwner(places).map(([ownerKey, { owner, places: ownerPlaces }]) => (
                  <div key={ownerKey}>
                    <div className="bg-[#F5F5F5] px-4 py-3 sm:px-6 border-b border-[#E0E0E0]">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-lg bg-[#1E90FF] flex items-center justify-center">
                          <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {owner.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {owner.name}
                            {owner.customer_id && (
                              <span className="ml-2 text-xs text-[#9E9E9E]">(ID: {owner.customer_id})</span>
                            )}
                          </h4>
                          <p className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                            {ownerPlaces.length} place{ownerPlaces.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    <ul className="divide-y divide-[#E0E0E0]">
                      {ownerPlaces.map((place) => (
                        <li key={place.id} className="px-4 py-4 sm:px-6">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                place.is_active ? 'bg-[#A3D55D]' : 'bg-[#E0E0E0]'
                              }`}>
                                <span className={`text-sm font-medium ${
                                  place.is_active ? 'text-white' : 'text-[#9E9E9E]'
                                }`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                                  {place.nome.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4 flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-2">
                                <p className="text-sm font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                  {place.nome}
                                </p>
                                {!place.is_active && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FF5A5F] bg-opacity-20 text-[#FF5A5F]">
                                    Inactive
                                  </span>
                                )}
                                {place.booking_enabled && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#A3D55D] bg-opacity-20 text-[#A3D55D]">
                                    Booking Enabled
                                  </span>
                                )}
                                {place.is_bio_diamond && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFD43B] bg-opacity-20 text-[#FFD43B]">
                                    BIO Diamond
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[#9E9E9E] mt-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                {place.cidade}, {place.regiao}
                              </p>
                              <div className="flex flex-wrap gap-3 mt-3">
                                <button
                                  onClick={() => handleTogglePlaceBioDiamond(place.id)}
                                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    place.is_bio_diamond
                                      ? 'text-[#FF5A5F] bg-[#FF5A5F] bg-opacity-10 hover:bg-opacity-20'
                                      : 'text-[#FFD43B] bg-[#FFD43B] bg-opacity-10 hover:bg-opacity-20'
                                  }`}
                                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                                >
                                  {place.is_bio_diamond ? 'Remove BIO Diamond' : 'Make BIO Diamond'}
                                </button>
                                <button
                                  onClick={() => handleTogglePlaceBooking(place.id)}
                                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    place.booking_enabled
                                      ? 'text-[#FF5A5F] bg-[#FF5A5F] bg-opacity-10 hover:bg-opacity-20'
                                      : 'text-[#A3D55D] bg-[#A3D55D] bg-opacity-10 hover:bg-opacity-20'
                                  }`}
                                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                                >
                                  {place.booking_enabled ? 'Disable Booking' : 'Enable Booking'}
                                </button>
                                <button
                                  onClick={() => handleTogglePlaceStatus(place.id)}
                                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    place.is_active
                                      ? 'text-[#FF5A5F] bg-[#FF5A5F] bg-opacity-10 hover:bg-opacity-20'
                                      : 'text-[#A3D55D] bg-[#A3D55D] bg-opacity-10 hover:bg-opacity-20'
                                  }`}
                                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                                >
                                  {place.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-4 flex items-center justify-between border-t border-[#E0E0E0]">
                <div className="flex-1 flex justify-between gap-3 sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center justify-center px-4 py-2 border border-[#E0E0E0] text-sm font-medium rounded-lg text-[#333333] bg-white hover:bg-[#F5F5F5] disabled:opacity-50"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center justify-center px-4 py-2 border border-[#E0E0E0] text-sm font-medium rounded-lg text-[#333333] bg-white hover:bg-[#F5F5F5] disabled:opacity-50"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                      Page <span className="font-medium text-[#333333]">{currentPage}</span> of{' '}
                      <span className="font-medium text-[#333333]">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-lg -space-x-px">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 rounded-l-lg border border-[#E0E0E0] bg-white text-sm font-medium text-[#333333] hover:bg-[#F5F5F5] disabled:opacity-50"
                        style={{ fontFamily: 'Open Sans, sans-serif' }}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-4 py-2 rounded-r-lg border border-[#E0E0E0] bg-white text-sm font-medium text-[#333333] hover:bg-[#F5F5F5] disabled:opacity-50"
                        style={{ fontFamily: 'Open Sans, sans-serif' }}
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>Bookings Overview</h3>
            <p className="mt-1 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Platform-wide booking management and analytics</p>
          </div>
          <div className="px-4 py-5 sm:px-6">
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-[#9E9E9E] mx-auto mb-4" />
              <p className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Bookings management interface coming soon...</p>
              <p className="text-sm text-[#9E9E9E] mt-2" style={{ fontFamily: 'Open Sans, sans-serif' }}>This will include filtering, export, and analytics features</p>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>Campaigns Management</h3>
            <p className="mt-1 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Create and manage platform-wide marketing campaigns</p>
          </div>
          <div className="px-4 py-5 sm:px-6">
            <div className="text-center py-8">
              <MegaphoneIcon className="h-12 w-12 text-[#9E9E9E] mx-auto mb-4" />
              <p className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Campaigns management interface coming soon...</p>
              <p className="text-sm text-[#9E9E9E] mt-2" style={{ fontFamily: 'Open Sans, sans-serif' }}>This will include campaign creation, targeting, and analytics</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>Admin Messages</h3>
            <p className="mt-1 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>GDPR-compliant admin-to-owner messaging system</p>
          </div>
          <div className="px-4 py-5 sm:px-6">
            <div className="text-center py-8">
              <ChatBubbleLeftRightIcon className="h-12 w-12 text-[#9E9E9E] mx-auto mb-4" />
              <p className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Admin messaging interface coming soon...</p>
              <p className="text-sm text-[#9E9E9E] mt-2" style={{ fontFamily: 'Open Sans, sans-serif' }}>This will include message composition, delivery tracking, and replies</p>
            </div>
          </div>
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg">
          <ServiceManagement onError={setError} />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
