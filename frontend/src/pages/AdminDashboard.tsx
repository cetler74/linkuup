import React, { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import { useTranslation } from 'react-i18next';
import ServiceManagement from '../components/admin/ServiceManagement';

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
      
      // Handle authentication errors specifically
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
      loadData(); // Reload data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update owner status');
    }
  };

  const handleTogglePlaceBooking = async (placeId: number) => {
    try {
      await adminAPI.togglePlaceBooking(placeId);
      loadData(); // Reload data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update place booking status');
    }
  };

  const handleTogglePlaceStatus = async (placeId: number) => {
    try {
      await adminAPI.togglePlaceStatus(placeId);
      loadData(); // Reload data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update place status');
    }
  };

  const handleTogglePlaceBioDiamond = async (placeId: number) => {
    try {
      await adminAPI.togglePlaceBioDiamond(placeId);
      loadData(); // Reload data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update BIO Diamond status');
    }
  };

  // Legacy methods for backward compatibility
  const handleToggleUserStatus = handleToggleOwnerStatus;
  const handleToggleSalonBooking = handleTogglePlaceBooking;
  const handleToggleSalonStatus = handleTogglePlaceStatus;
  const handleToggleSalonBioDiamond = handleTogglePlaceBioDiamond;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT');
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

  // Legacy method for backward compatibility
  const toggleSalonExpansion = togglePlaceExpansion;

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

  // Group places by owner
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
    
    // Sort owners by name, with "No Owner" at the end
    return Object.entries(grouped).sort(([a], [b]) => {
      if (a === 'no-owner') return 1;
      if (b === 'no-owner') return -1;
      return grouped[a].owner.name.localeCompare(grouped[b].owner.name);
    });
  };

  // Legacy method for backward compatibility
  const groupSalonsByOwner = groupPlacesByOwner;

  if (loading && !stats && !owners.length && !places.length && !bookings.length && !campaigns.length && !messages.length) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#2a2a2e'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white/70">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-cream/95 to-cream/90">
      <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-burgundy font-display">{t('admin.dashboard')}</h1>
          <p className="mt-1 text-sm text-charcoal/70">{t('admin.overview')}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 backdrop-blur-xl bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-300">
                  {error.includes('Authentication') ? 'Authentication Required' : 
                   error.includes('Access denied') ? 'Access Denied' : 
                   error.includes('Server error') ? 'Server Error' : 'Error'}
                </h3>
                <div className="mt-2 text-sm text-red-200">
                  <p>{error}</p>
                  {error.includes('Authentication') && (
                    <div className="mt-2">
                      <p className="font-medium">To access the Admin Dashboard:</p>
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
        <div className="mb-4">
          <div className="overflow-x-auto">
            <nav className="flex space-x-2 min-w-max">
              {[
                { id: 'stats', label: t('admin.overview'), icon: '📊' },
                { id: 'owners', label: 'Owners', icon: '👥' },
                { id: 'places', label: 'Places', icon: '🏪' },
                { id: 'bookings', label: 'Bookings', icon: '📅' },
                { id: 'campaigns', label: 'Campaigns', icon: '📢' },
                { id: 'messages', label: 'Messages', icon: '💬' },
                { id: 'services', label: t('admin.services'), icon: '🛠️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center space-x-2 py-3 px-4 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'backdrop-blur-xl bg-white/20 border border-white/30 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <span className="text-base sm:text-sm">{tab.icon}</span>
                  <span className="text-sm">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'stats' && (
          <>
            {loading && !stats ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <span className="ml-3 text-white/70">Loading statistics...</span>
              </div>
            ) : stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {/* Users Stats */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <span className="text-white text-base">👥</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-white/70">{t('admin.users')}</div>
                      <div className="text-xl font-bold text-white">{stats?.users?.total || 0}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-white/60">
                    <span className="text-green-300">{stats?.users?.active || 0}</span> active,{' '}
                    <span className="text-white">{stats?.users?.admins || 0}</span> admins
                  </div>
                </div>

                {/* Places Stats */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <span className="text-white text-base">🏪</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-white/70">Places</div>
                      <div className="text-xl font-bold text-white">{stats?.places?.total || 0}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-white/60">
                    <span className="text-green-300">{stats?.places?.active || 0}</span> active,{' '}
                    <span className="text-white">{stats?.places?.booking_enabled || 0}</span> booking
                  </div>
                </div>

                {/* Bookings Stats */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <span className="text-white text-base">📅</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-white/70">Bookings</div>
                      <div className="text-xl font-bold text-white">{stats?.bookings?.total || 0}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-white/60">
                    <span className="text-white">{stats?.bookings?.recent_week || 0}</span> this week
                  </div>
                </div>

                {/* Services Stats */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <span className="text-white text-base">🛠️</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-white/70">Services</div>
                      <div className="text-xl font-bold text-white">{stats?.places?.total_services || 0}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-white/60">
                    Total services
                  </div>
                </div>

                {/* Active Places Stats */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <span className="text-white text-base">✅</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-white/70">Active</div>
                      <div className="text-xl font-bold text-white">{stats?.places?.active || 0}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-white/60">
                    Active places
                  </div>
                </div>

                {/* This Week Stats */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <span className="text-white text-base">📈</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-white/70">This Week</div>
                      <div className="text-xl font-bold text-white">{stats?.bookings?.recent_week || 0}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-white/60">
                    Recent bookings
                  </div>
                </div>
          </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-white/60">
                  <p className="text-lg font-medium">No statistics available</p>
                  <p className="text-sm mt-2">Unable to load platform statistics</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Owners Tab */}
        {activeTab === 'owners' && (
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl overflow-hidden">
            <div className="px-4 py-4">
              <h3 className="text-lg font-bold text-white">{t('admin.userManagement')}</h3>
              <p className="mt-1 text-sm text-white/70">{t('admin.overview')}</p>
            </div>
            <div className="divide-y divide-white/10">
              {owners.map((owner) => (
                <div key={owner.id} className="px-4 py-4 hover:bg-white/5 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                          owner.is_admin ? 'bg-purple-500/20' : 'bg-white/20'
                        }`}>
                          <span className={`text-lg font-semibold ${
                            owner.is_admin ? 'text-purple-300' : 'text-white'
                          }`}>
                            {owner.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <p className="text-base font-semibold text-white truncate">{owner.name}</p>
                          {owner.is_admin && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Admin
                            </span>
                          )}
                          {!owner.is_active && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/70 truncate">{owner.email}</p>
                        <p className="text-sm text-white/60">
                          {owner.place_count} place{owner.place_count !== 1 ? 's' : ''} • Joined {formatDate(owner.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end sm:justify-start">
                      <button
                        onClick={() => handleToggleOwnerStatus(owner.id)}
                        className={`inline-flex items-center px-6 py-3 border text-sm font-medium rounded-xl whitespace-nowrap min-h-[48px] transition-all ${
                          owner.is_active
                            ? 'text-red-300 bg-red-500/20 border-red-500/30 hover:bg-red-500/30'
                            : 'text-green-300 bg-green-500/20 border-green-500/30 hover:bg-green-500/30'
                        }`}
                      >
                        {owner.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-4 flex items-center justify-between border-t border-white/10">
                <div className="flex-1 flex justify-between gap-3 sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center justify-center px-4 py-2 border border-white/20 text-sm font-medium rounded-xl text-white/70 bg-white/10 hover:bg-white/20 disabled:opacity-50 min-h-[40px] flex-1"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center justify-center px-4 py-2 border border-white/20 text-sm font-medium rounded-xl text-white/70 bg-white/10 hover:bg-white/20 disabled:opacity-50 min-h-[40px] flex-1"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-white/70">
                      Page                       <span className="font-medium text-white">{currentPage}</span> of{' '}
                      <span className="font-medium text-white">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-xl -space-x-px">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 rounded-l-xl border border-white/20 bg-white/10 text-sm font-medium text-white/70 hover:bg-white/20 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-4 py-2 rounded-r-xl border border-white/20 bg-white/10 text-sm font-medium text-white/70 hover:bg-white/20 disabled:opacity-50"
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

        {/* Places Tab */}
        {activeTab === 'places' && (
          <div className="space-y-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Places Management</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">{t('admin.overview')}</p>
              </div>
            </div>
            
            {groupPlacesByOwner(places).map(([ownerKey, { owner, places: ownerPlaces }]) => (
              <div key={ownerKey} className="bg-white shadow overflow-hidden sm:rounded-md">
                {/* Owner Header */}
                <div className="bg-gray-50 px-4 py-3 sm:px-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-900">
                            {owner.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          {owner.name}
                          {owner.customer_id && (
                            <span className="ml-2 text-xs text-gray-500">(ID: {owner.customer_id})</span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {ownerPlaces.length} place{ownerPlaces.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Total: {ownerPlaces.length}
                    </div>
                  </div>
                </div>
                
                {/* Places List */}
                <ul className="divide-y divide-gray-200">
                  {ownerPlaces.map((place) => (
                    <li key={place.id} className="px-4 py-4 sm:px-6">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              place.is_active ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              <span className={`text-sm font-medium ${
                                place.is_active ? 'text-green-600' : 'text-gray-600'
                              }`}>
                                {place.nome.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4 flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2">
                              <p className="text-sm font-medium text-gray-900">{place.nome}</p>
                              {!place.is_active && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Inactive
                                </span>
                              )}
                              {place.booking_enabled && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Booking Enabled
                                </span>
                              )}
                              {place.is_bio_diamond && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white">
                                  BIO Diamond
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{place.cidade}, {place.regiao}</p>
                            <p className="text-sm text-gray-500">
                              Owner: {owner.name} • {formatDate(place.created_at)}
                            </p>
                            <div className="flex items-center mt-1 flex-wrap gap-2">
                              <span className="text-sm text-gray-500">
                                {place.services_count} service{place.services_count !== 1 ? 's' : ''}
                              </span>
                              {place.services_count > 0 && (
                                <button
                                  onClick={() => togglePlaceExpansion(place.id)}
                                  className="text-xs text-gray-900 hover:text-gray-800 underline"
                                >
                                  {expandedPlaces.has(place.id) ? 'Hide services' : 'Show services'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Action buttons - stacked vertically on mobile for easy touch */}
                        <div className="flex flex-col gap-3 mt-4 ml-0 sm:ml-14">
                          <button
                            onClick={() => handleTogglePlaceBioDiamond(place.id)}
                            className={`w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg whitespace-nowrap min-h-[48px] transition-all ${
                              place.is_bio_diamond
                                ? 'text-red-700 bg-red-100 hover:bg-red-200 active:bg-red-300'
                                : 'text-purple-700 bg-purple-100 hover:bg-purple-200 active:bg-purple-300'
                            }`}
                          >
                            {place.is_bio_diamond ? '❌ Remove BIO Diamond' : '💎 Make BIO Diamond'}
                          </button>
                          <button
                            onClick={() => handleTogglePlaceBooking(place.id)}
                            className={`w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg whitespace-nowrap min-h-[48px] transition-all ${
                              place.booking_enabled
                                ? 'text-red-700 bg-red-100 hover:bg-red-200 active:bg-red-300'
                                : 'text-green-700 bg-green-100 hover:bg-green-200 active:bg-green-300'
                            }`}
                          >
                            {place.booking_enabled ? '🚫 Disable Booking' : '✅ Enable Booking'}
                          </button>
                          <button
                            onClick={() => handleTogglePlaceStatus(place.id)}
                            className={`w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg whitespace-nowrap min-h-[48px] transition-all ${
                              place.is_active
                                ? 'text-red-700 bg-red-100 hover:bg-red-200 active:bg-red-300'
                                : 'text-green-700 bg-green-100 hover:bg-green-200 active:bg-green-300'
                            }`}
                          >
                            {place.is_active ? '⏸️ Deactivate' : '▶️ Activate'}
                          </button>
                        </div>
                      </div>
                      
                      {/* Services Section */}
                      {expandedPlaces.has(place.id) && place.services.length > 0 && (
                        <div className="mt-4 ml-0 sm:ml-14 border-t border-gray-200 pt-4">
                          <h5 className="text-sm font-medium text-gray-900 mb-3">Services & Prices</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {place.services.map((service: any) => (
                              <div key={service.id} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <h6 className="text-sm font-medium text-gray-900 break-words">{service.name}</h6>
                                    {service.category && (
                                      <p className="text-xs text-gray-500 mt-1">{service.category}</p>
                                    )}
                                    {service.description && (
                                      <p className="text-xs text-gray-600 mt-1 line-clamp-2 break-words">{service.description}</p>
                                    )}
                                  </div>
                                  {service.is_bio_diamond && (
                                    <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      BIO
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-sm font-semibold text-green-600">
                                    {formatPrice(service.price)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDuration(service.duration)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-4 flex items-center justify-between border-t border-white/10">
                <div className="flex-1 flex justify-between gap-3 sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center justify-center px-4 py-2 border border-white/20 text-sm font-medium rounded-xl text-white/70 bg-white/10 hover:bg-white/20 disabled:opacity-50 min-h-[40px] flex-1"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center justify-center px-4 py-2 border border-white/20 text-sm font-medium rounded-xl text-white/70 bg-white/10 hover:bg-white/20 disabled:opacity-50 min-h-[40px] flex-1"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-white/70">
                      Page                       <span className="font-medium text-white">{currentPage}</span> of{' '}
                      <span className="font-medium text-white">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-xl -space-x-px">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 rounded-l-xl border border-white/20 bg-white/10 text-sm font-medium text-white/70 hover:bg-white/20 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-4 py-2 rounded-r-xl border border-white/20 bg-white/10 text-sm font-medium text-white/70 hover:bg-white/20 disabled:opacity-50"
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

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Bookings Overview</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Platform-wide booking management and analytics</p>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <div className="text-center py-8">
                <p className="text-gray-500">Bookings management interface coming soon...</p>
                <p className="text-sm text-gray-400 mt-2">This will include filtering, export, and analytics features</p>
              </div>
            </div>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Campaigns Management</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Create and manage platform-wide marketing campaigns</p>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <div className="text-center py-8">
                <p className="text-gray-500">Campaigns management interface coming soon...</p>
                <p className="text-sm text-gray-400 mt-2">This will include campaign creation, targeting, and analytics</p>
              </div>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Admin Messages</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">GDPR-compliant admin-to-owner messaging system</p>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <div className="text-center py-8">
                <p className="text-gray-500">Admin messaging interface coming soon...</p>
                <p className="text-sm text-gray-400 mt-2">This will include message composition, delivery tracking, and replies</p>
              </div>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <ServiceManagement onError={setError} />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
