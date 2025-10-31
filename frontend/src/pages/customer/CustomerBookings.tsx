import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Search, Filter, ArrowLeft, RefreshCw, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { customerAPI } from '../../utils/api';
import BookingCard from '../../components/customer/BookingCard';
import Header from '../../components/common/Header';

const CustomerBookings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await customerAPI.cancelBooking(bookingId);
      fetchBookings(); // Refresh data
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking. Please try again.');
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
      <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src="/dashboard_background.png" 
            alt="Retro Dashboard Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20"></div>
        </div>
        
        {/* Header integrated into hero section */}
        <div className="relative z-10">
          <Header />
        </div>
        
        <div className="relative z-10 flex items-center justify-center flex-grow">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-center">Loading your bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src="/dashboard_background.png" 
          alt="Retro Dashboard Background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
      
      {/* Header integrated into hero section */}
      <div className="relative z-10">
        <Header />
      </div>

      <div className="relative z-10 flex-grow p-6 grid grid-cols-12 gap-6 min-h-0">
        {/* Left Sidebar Card */}
        <div className="col-span-2 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 pb-6 h-fit flex flex-col">
          <div className="space-y-6">
            {/* Logo */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">Customer Portal</h1>
              <p className="text-white/60 text-sm">Booking Management</p>
            </div>

            {/* User Info */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-semibold text-lg">
                    {user?.name?.charAt(0)?.toUpperCase() || 'C'}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">{user?.name || 'Carlos'}</h3>
                  <p className="text-white/70 text-sm">{user?.email || 'cetler74@gmail.com'}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Quick Actions</h4>
              <nav className="space-y-2">
                <button
                  onClick={() => navigate('/search')}
                  className="w-full justify-start text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg"
                >
                  <Search className="mr-3 h-5 w-5" />
                  Browse Salons
                </button>
                <button
                  onClick={() => navigate('/customer/bookings')}
                  className="w-full justify-start text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg bg-white/10 text-white"
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  My Bookings
                </button>
                <button
                  onClick={() => navigate('/customer/rewards')}
                  className="w-full justify-start text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg"
                >
                  <Gift className="mr-3 h-5 w-5" />
                  Rewards
                </button>
              </nav>
            </div>
          </div>

          <div className="flex-shrink-0 space-y-4 pt-4 border-t border-white/10">
            <button
              onClick={() => navigate('/customer/dashboard')}
              className="w-full justify-start text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg"
            >
              <ArrowLeft className="mr-3 h-5 w-5" />
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="col-span-8 space-y-6 overflow-y-auto">
          {/* Header Card */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white">My Bookings</h2>
                <p className="text-white/60">Manage your appointments and view booking details</p>
              </div>
              <button
                onClick={fetchBookings}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Refresh bookings"
              >
                <RefreshCw className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 transition-all duration-700 ease-out hover:scale-[1.02] hover:bg-white/15">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Total Bookings</p>
                  <p className="text-2xl font-bold text-white">{statusCounts.all}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-400" />
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 transition-all duration-700 ease-out hover:scale-[1.02] hover:bg-white/15">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Confirmed</p>
                  <p className="text-2xl font-bold text-white">{statusCounts.confirmed}</p>
                </div>
                <Clock className="h-8 w-8 text-green-400" />
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 transition-all duration-700 ease-out hover:scale-[1.02] hover:bg-white/15">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Pending</p>
                  <p className="text-2xl font-bold text-white">{statusCounts.pending}</p>
                </div>
                <Gift className="h-8 w-8 text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                  <input
                    type="text"
                    placeholder="Search by salon, service, or employee..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-white/60" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                >
                  <option value="all" className="bg-gray-800">All Status</option>
                  <option value="pending" className="bg-gray-800">Pending</option>
                  <option value="confirmed" className="bg-gray-800">Confirmed</option>
                  <option value="completed" className="bg-gray-800">Completed</option>
                  <option value="cancelled" className="bg-gray-800">Cancelled</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-white/60" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                >
                  <option value="date" className="bg-gray-800">Sort by Date</option>
                  <option value="salon" className="bg-gray-800">Sort by Salon</option>
                  <option value="status" className="bg-gray-800">Sort by Status</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bookings List */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">All Bookings 📅</h2>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-white/40 mx-auto mb-4" />
                <p className="text-white/80 mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No bookings match your filters' 
                    : 'No bookings found'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <button
                    onClick={() => navigate('/search')}
                    className="px-6 py-2 bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/40 text-white rounded-xl transition-all duration-700 ease-out hover:scale-[1.02]"
                  >
                    Browse Salons
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

        {/* Right Sidebar Card */}
        <div className="col-span-2 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 pb-6 h-fit">
          <div className="space-y-6">
            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions ⚡</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/search')}
                  className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg"
                >
                  <Search className="mr-3 h-4 w-4" />
                  Browse Salons
                </button>
                <button
                  onClick={() => navigate('/customer/bookings')}
                  className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg bg-white/10 text-white"
                >
                  <Calendar className="mr-3 h-4 w-4" />
                  My Bookings
                </button>
                <button
                  onClick={() => navigate('/customer/rewards')}
                  className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg"
                >
                  <Gift className="mr-3 h-4 w-4" />
                  Rewards
                </button>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
              <div className="text-center space-y-3">
                <div className="text-2xl">📊</div>
                <div>
                  <h4 className="text-white font-semibold">Your Stats</h4>
                  <p className="text-white/70 text-sm">Booking Summary</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-white/80">
                    <span>Total:</span>
                    <span className="font-semibold">{statusCounts.all}</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>Confirmed:</span>
                    <span className="font-semibold">{statusCounts.confirmed}</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>Pending:</span>
                    <span className="font-semibold">{statusCounts.pending}</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>Completed:</span>
                    <span className="font-semibold">{statusCounts.completed}</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>Cancelled:</span>
                    <span className="font-semibold">{statusCounts.cancelled}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerBookings;