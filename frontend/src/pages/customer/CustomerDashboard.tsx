import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Gift, Search, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { customerAPI } from '../../utils/api';
import BookingCard from '../../components/customer/BookingCard';
import Header from '../../components/common/Header';

const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    upcomingCount: 0,
    totalBookings: 0,
    rewardsPoints: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [upcoming, all, rewards] = await Promise.all([
        customerAPI.getUpcomingBookings(),
        customerAPI.getBookings(),
        customerAPI.getRewards().catch(() => []) // Handle case where rewards API might not be available
      ]);

      setUpcomingBookings(upcoming.slice(0, 3)); // Show only first 3
      
      // Calculate total rewards points across all places
      const totalPoints = rewards.reduce((sum: number, reward: any) => sum + (reward.points_balance || 0), 0);
      
      setStats({
        upcomingCount: upcoming.length,
        totalBookings: all.length,
        rewardsPoints: totalPoints,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await customerAPI.cancelBooking(bookingId);
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden bg-[#F5F5F5]">
        {/* Header */}
        <div className="relative z-10">
          <Header />
        </div>
        <div className="relative z-10 flex items-center justify-center flex-grow p-8">
          <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E90FF] mx-auto mb-4"></div>
            <p className="text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Loading your dashboard...</p>
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

      <div className="relative z-10 flex-grow p-6 grid grid-cols-12 gap-6 min-h-0">
        {/* Left Sidebar Card */}
        <div className="col-span-2 bg-white border border-medium-gray rounded-lg p-6 pb-6 h-fit flex flex-col shadow-form">
          <div className="space-y-6">
            {/* Logo */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>Customer Portal</h1>
              <p className="text-charcoal/70 text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>Booking Management</p>
            </div>

            {/* User Info */}
            <div className="bg-bright-blue/10 border border-bright-blue/20 rounded-lg p-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-bright-blue/20 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-bright-blue font-semibold text-lg">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
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
              <h4 className="text-charcoal/80 text-sm font-semibold uppercase tracking-wider mb-3" style={{ fontFamily: 'Open Sans, sans-serif' }}>Quick Actions</h4>
              <nav className="space-y-2">
                <button
                  onClick={() => navigate('/search')}
                  className="w-full justify-start text-base text-charcoal/80 hover:bg-bright-blue/10 hover:text-bright-blue transition-all duration-200 h-11 flex items-center px-3 rounded-lg"
                >
                  <Search className="mr-3 h-5 w-5" />
                  Browse Salons
                </button>
                <button
                  onClick={() => navigate('/customer/bookings')}
                  className="w-full justify-start text-base text-charcoal/80 hover:bg-bright-blue/10 hover:text-bright-blue transition-all duration-200 h-11 flex items-center px-3 rounded-lg"
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  My Bookings
                </button>
                <button
                  onClick={() => navigate('/customer/rewards')}
                  className="w-full justify-start text-base text-charcoal/80 hover:bg-bright-blue/10 hover:text-bright-blue transition-all duration-200 h-11 flex items-center px-3 rounded-lg"
                >
                  <Gift className="mr-3 h-5 w-5" />
                  Rewards
                </button>
              </nav>
            </div>
          </div>

          <div className="flex-shrink-0 space-y-4 pt-4 border-t border-medium-gray">
            <button
              onClick={handleLogout}
              className="w-full justify-start text-base text-charcoal/80 hover:bg-coral-red/10 hover:text-coral-red transition-all duration-200 h-11 flex items-center px-3 rounded-lg"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="col-span-10 space-y-6 overflow-y-auto">
          {/* Header Card */}
          <div className="bg-white border border-medium-gray rounded-lg p-6 shadow-form">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-charcoal" style={{ fontFamily: 'Poppins, sans-serif' }}>Welcome back, {user?.name}! 👋</h2>
                <p className="text-charcoal/70" style={{ fontFamily: 'Open Sans, sans-serif' }}>Manage your bookings and rewards</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white border border-medium-gray rounded-lg p-6 shadow-form transition-all duration-200 hover:scale-[1.02] hover:shadow-elevated">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-charcoal/70 text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>Upcoming Bookings</p>
                  <p className="text-2xl font-bold text-charcoal" style={{ fontFamily: 'Poppins, sans-serif' }}>{stats.upcomingCount}</p>
                </div>
                <Calendar className="h-8 w-8 text-bright-blue" />
              </div>
            </div>

            <div className="bg-white border border-medium-gray rounded-lg p-6 shadow-form transition-all duration-200 hover:scale-[1.02] hover:shadow-elevated">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-charcoal/70 text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>Total Bookings</p>
                  <p className="text-2xl font-bold text-charcoal" style={{ fontFamily: 'Poppins, sans-serif' }}>{stats.totalBookings}</p>
                </div>
                <Clock className="h-8 w-8 text-lime-green" />
              </div>
            </div>

            <div className="bg-white border border-medium-gray rounded-lg p-6 shadow-form transition-all duration-200 hover:scale-[1.02] hover:shadow-elevated">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-charcoal/70 text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>Rewards Points</p>
                  <p className="text-2xl font-bold text-charcoal" style={{ fontFamily: 'Poppins, sans-serif' }}>{stats.rewardsPoints}</p>
                </div>
                <Gift className="h-8 w-8 text-soft-yellow" />
              </div>
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="bg-white border border-medium-gray rounded-lg p-6 shadow-form">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-charcoal" style={{ fontFamily: 'Poppins, sans-serif' }}>Upcoming Appointments 📅</h2>
              {upcomingBookings.length > 0 && (
                <button
                  onClick={() => navigate('/customer/bookings')}
                  className="text-bright-blue hover:text-blue-600 text-sm font-medium transition-colors"
                >
                  View All
                </button>
              )}
            </div>

            {upcomingBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-charcoal/40 mx-auto mb-4" />
                <p className="text-charcoal/70 mb-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>No upcoming bookings</p>
                <button
                  onClick={() => navigate('/search')}
                  className="px-4 py-2 rounded-lg bg-bright-blue text-white hover:bg-[#1877D2] transition-colors"
                >
                  Browse Salons
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingBookings.map((booking) => (
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

export default CustomerDashboard;

