import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Search, Filter, ArrowLeft, RefreshCw, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { customerAPI } from '../../utils/api';
import BookingCard from '../../components/customer/BookingCard';
import Header from '../../components/common/Header';
import CustomLanguageSelector from '../../components/common/CustomLanguageSelector';
import { useTranslation } from 'react-i18next';

const CustomerBookings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterAndSortBookings();
  }, [bookings, searchTerm, statusFilter, sortBy]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const allBookings = await customerAPI.getBookings();
      setBookings(allBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortBookings = () => {
    let filtered = [...bookings];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.salon_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Sort bookings
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime();
        case 'salon':
          return (a.salon_name || '').localeCompare(b.salon_name || '');
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    setFilteredBookings(filtered);
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm(t('customerBookings.confirmCancel'))) return;

    try {
      await customerAPI.cancelBooking(bookingId);
      fetchBookings(); // Refresh data
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert(t('customerBookings.cancelError'));
    }
  };

  const getStatusCounts = () => {
    const counts = {
      all: bookings.length,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0
    };

    bookings.forEach(booking => {
      if (counts.hasOwnProperty(booking.status)) {
        counts[booking.status as keyof typeof counts]++;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden bg-light-gray">
        {/* Header */}
        <div className="relative z-10">
          <Header />
        </div>
        {/* Floating Language Selector - positioned in safe area */}
        <div className="fixed top-24 right-6 z-[9999]">
          <CustomLanguageSelector />
        </div>
        <div className="relative z-10 flex items-center justify-center flex-grow p-8">
          <div className="bg-white rounded-lg shadow-form p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bright-blue mx-auto mb-4"></div>
            <p className="text-charcoal" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerBookings.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden bg-light-gray">
      {/* Header integrated into hero section */}
      <div className="relative z-10">
        <Header />
      </div>

      {/* Floating Language Selector - positioned in safe area to avoid overlap with cards */}
      <div className="fixed top-24 right-6 z-[9999]">
        <CustomLanguageSelector />
      </div>

      <div className="relative z-10 flex-grow p-6 grid grid-cols-12 gap-6 min-h-0">
        {/* Left Sidebar Card */}
        <div className="col-span-2 bg-white border border-medium-gray rounded-lg p-6 pb-6 h-fit flex flex-col shadow-form">
          <div className="space-y-6">
            {/* Logo */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('customerBookings.customerPortal')}</h1>
              <p className="text-charcoal/70 text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerBookings.bookingManagement')}</p>
            </div>

            {/* User Info */}
            <div className="bg-bright-blue/10 border border-bright-blue/20 rounded-lg p-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-bright-blue/20 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-bright-blue font-semibold text-lg">
                    {user?.name?.charAt(0)?.toUpperCase() || 'C'}
                  </span>
                </div>
                <div>
                  <h3 className="text-charcoal font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>{user?.name || 'User'}</h3>
                  <p className="text-charcoal/70 text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="text-charcoal/80 text-sm font-semibold uppercase tracking-wider mb-3" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerBookings.quickActions')}</h4>
              <nav className="space-y-2">
                <button
                  onClick={() => navigate('/search')}
                  className="w-full justify-start text-base text-charcoal/80 hover:bg-bright-blue/10 hover:text-bright-blue transition-all duration-200 h-11 flex items-center px-3 rounded-lg"
                >
                  <Search className="mr-3 h-5 w-5" />
                  {t('customerBookings.browseSalons')}
                </button>
                <button
                  onClick={() => navigate('/customer/bookings')}
                  className="w-full justify-start text-base text-charcoal/80 hover:bg-bright-blue/10 hover:text-bright-blue transition-all duration-200 h-11 flex items-center px-3 rounded-lg bg-bright-blue/10 text-bright-blue"
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  {t('customerBookings.myBookings')}
                </button>
                <button
                  onClick={() => navigate('/customer/rewards')}
                  className="w-full justify-start text-base text-charcoal/80 hover:bg-bright-blue/10 hover:text-bright-blue transition-all duration-200 h-11 flex items-center px-3 rounded-lg"
                >
                  <Gift className="mr-3 h-5 w-5" />
                  {t('customerBookings.rewards')}
                </button>
              </nav>
            </div>
          </div>

          <div className="flex-shrink-0 space-y-4 pt-4 border-t border-medium-gray">
            <button
              onClick={() => navigate('/customer/dashboard')}
              className="w-full justify-start text-base text-charcoal/80 hover:bg-bright-blue/10 hover:text-bright-blue transition-all duration-200 h-11 flex items-center px-3 rounded-lg"
            >
              <ArrowLeft className="mr-3 h-5 w-5" />
              {t('customerBookings.backToDashboard')}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="col-span-10 space-y-6 overflow-y-auto">
          {/* Header Card */}
          <div className="bg-white border border-medium-gray rounded-lg p-6 shadow-form">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('customerBookings.myBookings')}</h2>
                <p className="text-charcoal/70" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerBookings.manageAppointments')}</p>
              </div>
              <button
                onClick={fetchBookings}
                className="p-2 hover:bg-bright-blue/10 rounded-lg transition-colors text-charcoal/80 hover:text-bright-blue"
                title="Refresh bookings"
              >
                <RefreshCw className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white border border-medium-gray rounded-lg p-6 shadow-form transition-all duration-200 hover:scale-[1.02] hover:shadow-elevated">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-charcoal/70 text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerBookings.totalBookings')}</p>
                  <p className="text-2xl font-bold text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>{statusCounts.all}</p>
                </div>
                <Calendar className="h-8 w-8 text-bright-blue" />
              </div>
            </div>

            <div className="bg-white border border-medium-gray rounded-lg p-6 shadow-form transition-all duration-200 hover:scale-[1.02] hover:shadow-elevated">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-charcoal/70 text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerBookings.confirmed')}</p>
                  <p className="text-2xl font-bold text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>{statusCounts.confirmed}</p>
                </div>
                <Clock className="h-8 w-8 text-lime-green" />
              </div>
            </div>

            <div className="bg-white border border-medium-gray rounded-lg p-6 shadow-form transition-all duration-200 hover:scale-[1.02] hover:shadow-elevated">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-charcoal/70 text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerBookings.pending')}</p>
                  <p className="text-2xl font-bold text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>{statusCounts.pending}</p>
                </div>
                <Gift className="h-8 w-8 text-soft-yellow" />
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white border border-medium-gray rounded-lg p-6 shadow-form">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-charcoal/60" />
                  <input
                    type="text"
                    placeholder={t('customerBookings.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-charcoal/60" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="all">{t('customerBookings.allStatus')}</option>
                  <option value="pending">{t('customerBookings.pending')}</option>
                  <option value="confirmed">{t('customerBookings.confirmed')}</option>
                  <option value="completed">{t('customerBookings.completed')}</option>
                  <option value="cancelled">{t('customerBookings.cancelled')}</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-charcoal/60" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-field"
                >
                  <option value="date">{t('customerBookings.sortByDate')}</option>
                  <option value="salon">{t('customerBookings.sortBySalon')}</option>
                  <option value="status">{t('customerBookings.sortByStatus')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bookings List */}
          <div className="bg-white border border-medium-gray rounded-lg p-6 shadow-form">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('customerBookings.allBookings')}</h2>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-charcoal/40 mx-auto mb-4" />
                <p className="text-charcoal/70 mb-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                  {searchTerm || statusFilter !== 'all' 
                    ? t('customerBookings.noBookingsMatchFilters') 
                    : t('customerBookings.noBookingsFound')
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <button
                    onClick={() => navigate('/search')}
                    className="btn-primary"
                  >
                    {t('customerBookings.browseSalons')}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onCancel={handleCancelBooking}
                    showCancelButton={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerBookings;