import React, { useState, useEffect } from 'react';
import { Gift, ArrowLeft, Star, Award, Calendar, TrendingUp, Search, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { customerAPI } from '../../utils/api';
import Header from '../../components/common/Header';

interface RewardData {
  id: number;
  user_id: number;
  place_id: number;
  points_balance: number;
  total_points_earned: number;
  total_points_redeemed: number;
  tier: string;
  created_at: string;
  updated_at: string;
}

interface RewardTransaction {
  id: number;
  transaction_type: string;
  points_change: number;
  points_balance_after: number;
  description: string;
  created_at: string;
}

const CustomerRewards: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [rewards, setRewards] = useState<RewardData[]>([]);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<number | null>(null);
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalEarned: 0,
    totalRedeemed: 0,
  });

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const data = await customerAPI.getRewards();
      setRewards(data);
      
      // Calculate total stats across all places
      const totalPoints = data.reduce((sum: number, reward: RewardData) => sum + reward.points_balance, 0);
      const totalEarned = data.reduce((sum: number, reward: RewardData) => sum + reward.total_points_earned, 0);
      const totalRedeemed = data.reduce((sum: number, reward: RewardData) => sum + reward.total_points_redeemed, 0);
      
      setStats({
        totalPoints,
        totalEarned,
        totalRedeemed,
      });
      
      if (data.length > 0) {
        setSelectedPlace(data[0].place_id);
        fetchTransactions(data[0].place_id);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (placeId: number) => {
    try {
      const data = await customerAPI.getRewardsByPlace(placeId);
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'text-amber-400 bg-amber-500/20 border-amber-400/30';
      case 'silver': return 'text-gray-400 bg-gray-500/20 border-gray-400/30';
      case 'gold': return 'text-yellow-400 bg-yellow-500/20 border-yellow-400/30';
      case 'platinum': return 'text-purple-400 bg-purple-500/20 border-purple-400/30';
      default: return 'text-white/60 bg-white/20 border-white/30';
    }
  };

  const getTierThresholds = (tier: string) => {
    switch (tier) {
      case 'bronze': return { current: 0, next: 100, nextTier: 'Silver' };
      case 'silver': return { current: 100, next: 500, nextTier: 'Gold' };
      case 'gold': return { current: 500, next: 1000, nextTier: 'Platinum' };
      case 'platinum': return { current: 1000, next: null, nextTier: null };
      default: return { current: 0, next: 100, nextTier: 'Silver' };
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden bg-gray-900">
        
        {/* Header integrated into hero section */}
        <div className="relative z-10">
          <Header />
        </div>
        
        <div className="relative z-10 flex items-center justify-center flex-grow">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-center">Loading your rewards...</p>
          </div>
        </div>
      </div>
    );
  }

  if (rewards.length === 0) {
    return (
      <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden bg-gray-900">
        
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
                <h1 className="text-2xl font-bold text-white">Rewards & Loyalty</h1>
                <p className="text-white/60 text-sm">Track your points and benefits</p>
              </div>

              {/* User Info */}
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-white font-semibold text-lg">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{user?.name || 'User'}</h3>
                    <p className="text-white/70 text-sm">{user?.email}</p>
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
                    onClick={() => navigate('/customer/dashboard')}
                    className="w-full justify-start text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg"
                  >
                    <Calendar className="mr-3 h-5 w-5" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/customer/bookings')}
                    className="w-full justify-start text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg"
                  >
                    <Calendar className="mr-3 h-5 w-5" />
                    My Bookings
                  </button>
                </nav>
              </div>
            </div>

            <div className="flex-shrink-0 space-y-4 pt-4 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full justify-start text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Logout
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-span-8 space-y-6 overflow-y-auto">
            {/* Header Card */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white">Rewards & Loyalty 🎁</h2>
                  <p className="text-white/60">Track your points and benefits</p>
                </div>
                <button
                  onClick={() => navigate('/customer/dashboard')}
                  className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/40 text-white rounded-xl transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </button>
              </div>
            </div>

            {/* Empty State */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12">
              <div className="text-center">
                <Gift className="h-16 w-16 text-white/40 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">No Rewards Yet</h2>
                <p className="text-white/80 mb-6">
                  You haven't earned any rewards points yet. Complete bookings to start earning!
                </p>
                <button
                  onClick={() => navigate('/search')}
                  className="px-6 py-3 bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/40 text-white rounded-xl transition-all duration-700 ease-out hover:scale-[1.02]"
                >
                  Browse Services
                </button>
              </div>
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
                    onClick={() => navigate('/customer/dashboard')}
                    className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg"
                  >
                    <Calendar className="mr-3 h-4 w-4" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/customer/bookings')}
                    className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg"
                  >
                    <Calendar className="mr-3 h-4 w-4" />
                    My Bookings
                  </button>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                <div className="text-center space-y-3">
                  <div className="text-2xl">🎁</div>
                  <div>
                    <h4 className="text-white font-semibold">Start Earning</h4>
                    <p className="text-white/70 text-sm">Complete bookings to earn points</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentReward = rewards.find(r => r.place_id === selectedPlace) || rewards[0];
  const thresholds = getTierThresholds(currentReward.tier);

  return (
    <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src="/rewards_dashboard.png" 
          alt="Rewards Dashboard Background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30"></div>
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
              <h1 className="text-2xl font-bold text-white">Rewards & Loyalty</h1>
              <p className="text-white/60 text-sm">Track your points and benefits</p>
            </div>

            {/* User Info */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-semibold text-lg">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">{user?.name || 'User'}</h3>
                  <p className="text-white/70 text-sm">{user?.email}</p>
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
                  onClick={() => navigate('/customer/dashboard')}
                  className="w-full justify-start text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg"
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/customer/bookings')}
                  className="w-full justify-start text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg"
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  My Bookings
                </button>
              </nav>
            </div>
          </div>

          <div className="flex-shrink-0 space-y-4 pt-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full justify-start text-base text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="col-span-8 space-y-6 overflow-y-auto">
          {/* Header Card */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white">Rewards & Loyalty 🎁</h2>
                <p className="text-white/60">Track your points and benefits</p>
              </div>
              <button
                onClick={() => navigate('/customer/dashboard')}
                className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/40 text-white rounded-xl transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Place Selector */}
          {rewards.length > 1 && (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
              <label className="block text-sm font-medium text-white/80 mb-2">
                Select Business
              </label>
              <select
                value={selectedPlace || ''}
                onChange={(e) => {
                  const placeId = parseInt(e.target.value);
                  setSelectedPlace(placeId);
                  fetchTransactions(placeId);
                }}
                className="w-full max-w-md px-3 py-2 bg-white/20 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-white/60"
              >
                {rewards.map((reward) => (
                  <option key={reward.place_id} value={reward.place_id} className="bg-gray-800 text-white">
                    Business {reward.place_id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rewards Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 text-center transition-all duration-700 ease-out hover:scale-[1.02] hover:bg-white/15">
              <div className="flex items-center justify-center mb-2">
                <Star className="h-6 w-6 text-yellow-400 mr-2" />
                <p className="text-sm text-white/60">Current Points</p>
              </div>
              <p className="text-4xl font-bold text-white">{currentReward.points_balance}</p>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 text-center transition-all duration-700 ease-out hover:scale-[1.02] hover:bg-white/15">
              <div className="flex items-center justify-center mb-2">
                <Award className="h-6 w-6 text-purple-400 mr-2" />
                <p className="text-sm text-white/60">Current Tier</p>
              </div>
              <span className={`inline-flex px-3 py-1 text-lg font-bold rounded-full border ${getTierColor(currentReward.tier)}`}>
                {currentReward.tier.charAt(0).toUpperCase() + currentReward.tier.slice(1)}
              </span>
            </div>

            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 text-center transition-all duration-700 ease-out hover:scale-[1.02] hover:bg-white/15">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-green-400 mr-2" />
                <p className="text-sm text-white/60">Total Earned</p>
              </div>
              <p className="text-4xl font-bold text-white">{currentReward.total_points_earned}</p>
            </div>
          </div>

          {/* Tier Progress */}
          {thresholds.next && (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Progress to {thresholds.nextTier}</h3>
              <div className="w-full bg-white/20 rounded-full h-3 mb-2">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-purple-500 h-3 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, ((currentReward.total_points_earned - thresholds.current) / (thresholds.next - thresholds.current)) * 100)}%` 
                  }}
                ></div>
              </div>
              <p className="text-sm text-white/60">
                {currentReward.total_points_earned - thresholds.current} / {thresholds.next - thresholds.current} points to {thresholds.nextTier}
              </p>
            </div>
          )}

          {/* Transaction History */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl">
            <div className="px-6 py-4 border-b border-white/20">
              <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            </div>
            <div className="divide-y divide-white/20">
              {transactions.length === 0 ? (
                <div className="p-6 text-center text-white/60">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-white/40" />
                  <p>No transactions yet</p>
                  <p className="text-sm">Complete bookings to start earning points!</p>
                </div>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full ${
                          transaction.transaction_type === 'earned' 
                            ? 'bg-green-500/20 text-green-400 border border-green-400/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-400/30'
                        }`}>
                          {transaction.transaction_type === 'earned' ? (
                            <Star className="h-5 w-5" />
                          ) : (
                            <Gift className="h-5 w-5" />
                          )}
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-white">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-white/60">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          transaction.points_change > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {transaction.points_change > 0 ? '+' : ''}{transaction.points_change} points
                        </p>
                        <p className="text-sm text-white/60">
                          Balance: {transaction.points_balance_after}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
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
                  onClick={() => navigate('/customer/dashboard')}
                  className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg"
                >
                  <Calendar className="mr-3 h-4 w-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/customer/bookings')}
                  className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white transition-all duration-700 ease-out hover:scale-[1.02] h-11 flex items-center px-3 rounded-lg"
                >
                  <Calendar className="mr-3 h-4 w-4" />
                  My Bookings
                </button>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
              <div className="text-center space-y-3">
                <div className="text-2xl">🎁</div>
                <div>
                  <h4 className="text-white font-semibold">Your Rewards</h4>
                  <p className="text-white/70 text-sm">Points Summary</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-white/80">
                    <span>Current:</span>
                    <span className="font-semibold">{stats.totalPoints}</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>Earned:</span>
                    <span className="font-semibold">{stats.totalEarned}</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>Redeemed:</span>
                    <span className="font-semibold">{stats.totalRedeemed}</span>
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

export default CustomerRewards;

