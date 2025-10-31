import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  BuildingOfficeIcon, 
  CalendarIcon, 
  UserGroupIcon, 
  MegaphoneIcon, 
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { managerAPI, ownerAPI } from '../../utils/api';
import { useSubscriptionStatus } from '../../hooks/useFeatureAccess';

interface DashboardStats {
  registered_places: number;
  total_bookings: number;
  active_customers: number;
  ongoing_campaigns: number;
  unread_messages: number;
}

interface RecentBooking {
  id: number;
  customer_name: string;
  customer_email: string;
  service_name: string;
  booking_date: string;
  status: string;
  place_name: string;
}

const OwnerDashboard: React.FC = () => {
  console.log('🏢 OwnerDashboard component rendered');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    registered_places: 0,
    total_bookings: 0,
    active_customers: 0,
    ongoing_campaigns: 0,
    unread_messages: 0
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePlaceCTA, setShowCreatePlaceCTA] = useState(false);
  const [primaryPlaceId, setPrimaryPlaceId] = useState<number | undefined>(undefined);
  const { status: subStatus, showTrialBanner } = useSubscriptionStatus(primaryPlaceId);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    console.log('🔍 Fetching dashboard data from new dashboard APIs...');
    try {
      // Get dashboard stats
      const statsData = await ownerAPI.getDashboardStats();
      console.log('📊 Dashboard stats:', statsData);
      
      // Check if business owner has no places
      if (statsData.registered_places === 0) {
        setShowCreatePlaceCTA(true);
        setLoading(false);
        return;
      }
      
      // Set real stats data
      setStats({
        registered_places: statsData.registered_places,
        total_bookings: statsData.total_bookings,
        active_customers: statsData.active_customers,
        ongoing_campaigns: statsData.ongoing_campaigns,
        unread_messages: statsData.unread_messages
      });
      
      // Determine a primary place id (first place) for trial banner
      try {
        const places = await ownerAPI.getOwnerPlaces();
        if (Array.isArray(places) && places.length > 0) {
          setPrimaryPlaceId(places[0].id);
        }
      } catch (e) {
        // ignore
      }

      // Get real recent bookings
      const bookingsData = await ownerAPI.getRecentBookings(10);
      console.log('📅 Recent bookings:', bookingsData);
      setRecentBookings(bookingsData);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1E90FF]"></div>
      </div>
    );
  }

  // Show Create Place CTA if no places exist
  if (showCreatePlaceCTA) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
        <div className="max-w-2xl w-full mx-auto p-8">
          <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-12 text-center">
            <BuildingOfficeIcon className="h-24 w-24 text-[#1E90FF] mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-[#333333] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('owner.dashboard.welcome')}</h1>
            <p className="text-lg text-[#333333] mb-8" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              {t('owner.dashboard.noPlacesYet')}
            </p>
            <button
              onClick={() => navigate('/owner/create-first-place')}
              className="inline-flex items-center px-8 py-4 bg-[#1E90FF] text-white text-lg font-semibold rounded-lg hover:bg-[#1877D2] transition-colors duration-200 shadow-md hover:shadow-lg"
              style={{ fontFamily: 'Open Sans, sans-serif' }}
            >
              <BuildingOfficeIcon className="h-6 w-6 mr-2" />
              {t('owner.dashboard.createFirstPlace')}
            </button>
            <p className="mt-6 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              {t('owner.dashboard.createPlaceDescription')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trial Banner */}
      {showTrialBanner && subStatus && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{subStatus.plan_name || subStatus.plan_code} trial</div>
              <div className="text-sm">
                {subStatus.trial_days_remaining} day{subStatus.trial_days_remaining === 1 ? '' : 's'} left. You can change plans anytime.
              </div>
            </div>
            <button
              onClick={() => navigate('/billing')}
              className="px-3 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
            >
              Manage Plan
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('owner.dashboard.title')}</h1>
        <p className="mt-1 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
          {t('owner.dashboard.subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-6 w-6 text-[#1E90FF]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#9E9E9E] truncate" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                    {t('owner.dashboard.registeredPlaces')}
                  </dt>
                  <dd className="text-lg font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {stats.registered_places}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-[#FF5A5F]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#9E9E9E] truncate" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                    {t('owner.dashboard.totalBookings')}
                  </dt>
                  <dd className="text-lg font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {stats.total_bookings}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-[#A3D55D]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#9E9E9E] truncate" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                    {t('owner.dashboard.activeCustomers')}
                  </dt>
                  <dd className="text-lg font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {stats.active_customers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MegaphoneIcon className="h-6 w-6 text-[#FFD43B]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#9E9E9E] truncate" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                    {t('owner.dashboard.ongoingCampaigns')}
                  </dt>
                  <dd className="text-lg font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {stats.ongoing_campaigns}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-[#1E90FF]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#9E9E9E] truncate" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                    {t('owner.dashboard.unreadMessages')}
                  </dt>
                  <dd className="text-lg font-medium text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {stats.unread_messages}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities Section */}
      <div className="bg-white p-6 rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)]">
        <h3 className="text-lg font-medium text-[#333333] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('owner.dashboard.recentActivities')}</h3>
        {recentBookings.length === 0 ? (
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-[#9E9E9E] mx-auto mb-4" />
            <p className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('owner.dashboard.noRecentBookings')}</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="flow-root">
              <ul className="-mb-8">
                {recentBookings.map((booking, bookingIdx) => (
                  <li key={booking.id}>
                    <div className="relative pb-8">
                      {bookingIdx !== recentBookings.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-[#E0E0E0]"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-[#1E90FF] flex items-center justify-center ring-8 ring-white">
                            <CalendarIcon className="h-5 w-5 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                              {booking.customer_name}
                            </p>
                            <p className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                              {booking.service_name} at {booking.place_name}
                            </p>
                            <p className="text-xs text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                              {booking.customer_email}
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap">
                            <div className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                              <time dateTime={booking.booking_date}>
                                {new Date(booking.booking_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </time>
                            </div>
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              booking.status === 'confirmed' 
                                ? 'bg-[#A3D55D] bg-opacity-20 text-[#A3D55D]'
                                : booking.status === 'pending'
                                ? 'bg-[#FFD43B] bg-opacity-20 text-[#FFD43B]'
                                : booking.status === 'cancelled'
                                ? 'bg-[#FF5A5F] bg-opacity-20 text-[#FF5A5F]'
                                : 'bg-[#E0E0E0] text-[#333333]'
                            }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                              {booking.status}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;
