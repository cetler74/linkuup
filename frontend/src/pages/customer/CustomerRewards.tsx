import React, { useState, useEffect } from 'react';
import { Gift, ArrowLeft, Star, Award, Calendar, TrendingUp, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { customerAPI } from '../../utils/api';
import Header from '../../components/common/Header';
import CustomLanguageSelector from '../../components/common/CustomLanguageSelector';
import { useTranslation } from 'react-i18next';
import ProfileDropdown from '../../components/common/ProfileDropdown';

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
  const { user } = useAuth();
  const { t } = useTranslation();
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
      case 'bronze': return { current: 0, next: 100, nextTier: t('customerRewards.silver') };
      case 'silver': return { current: 100, next: 500, nextTier: t('customerRewards.gold') };
      case 'gold': return { current: 500, next: 1000, nextTier: t('customerRewards.platinum') };
      case 'platinum': return { current: 1000, next: null, nextTier: null };
      default: return { current: 0, next: 100, nextTier: t('customerRewards.silver') };
    }
  };


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
            <p className="text-charcoal" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerRewards.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (rewards.length === 0) {
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
                <h1 className="text-2xl font-bold text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('customerRewards.rewardsLoyalty')}</h1>
                <p className="text-charcoal/70 text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerRewards.trackPoints')}</p>
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
                <h4 className="text-charcoal/80 text-sm font-semibold uppercase tracking-wider mb-3" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerRewards.quickActions')}</h4>
                <nav className="space-y-2">
                  <button
                    onClick={() => navigate('/search')}
                    className="w-full justify-start text-base text-charcoal/80 hover:bg-bright-blue/10 hover:text-bright-blue transition-all duration-200 h-11 flex items-center px-3 rounded-lg"
                  >
                    <Search className="mr-3 h-5 w-5" />
                    {t('customerRewards.browseSalons')}
                  </button>
                  <button
                    onClick={() => navigate('/customer/dashboard')}
                    className="w-full justify-start text-base text-charcoal/80 hover:bg-bright-blue/10 hover:text-bright-blue transition-all duration-200 h-11 flex items-center px-3 rounded-lg"
                  >
                    <Calendar className="mr-3 h-5 w-5" />
                    {t('customerRewards.dashboard')}
                  </button>
                  <button
                    onClick={() => navigate('/customer/bookings')}
                    className="w-full justify-start text-base text-charcoal/80 hover:bg-bright-blue/10 hover:text-bright-blue transition-all duration-200 h-11 flex items-center px-3 rounded-lg"
                  >
                    <Calendar className="mr-3 h-5 w-5" />
                    {t('customerRewards.myBookings')}
                  </button>
                </nav>
              </div>
            </div>

            <div className="flex-shrink-0 space-y-4 pt-4 border-t border-medium-gray">
              <ProfileDropdown />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-span-10 space-y-6 overflow-y-auto">
            {/* Header Card */}
            <div className="bg-white border border-medium-gray rounded-lg p-6 shadow-form">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('customerRewards.rewardsLoyalty')} 🎁</h2>
                  <p className="text-charcoal/70" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerRewards.trackPoints')}</p>
                </div>
                <button
                  onClick={() => navigate('/customer/dashboard')}
                  className="btn-outline flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('customerRewards.backToDashboard')}
                </button>
              </div>
            </div>

            {/* Empty State */}
            <div className="bg-white border border-medium-gray rounded-lg p-12 shadow-form">
              <div className="text-center">
                <Gift className="h-16 w-16 text-charcoal/40 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-charcoal mb-2 font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('customerRewards.noRewardsYet')}</h2>
                <p className="text-charcoal/70 mb-6" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                  {t('customerRewards.noRewardsDescription')}
                </p>
                <button
                  onClick={() => navigate('/search')}
                  className="btn-primary"
                >
                  {t('customerRewards.browseServices')}
                </button>
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
              <h1 className="text-2xl font-bold text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('customerRewards.rewardsLoyalty')}</h1>
              <p className="text-charcoal/70 text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerRewards.trackPoints')}</p>
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
                  onClick={() => navigate('/customer/dashboard')}
                  className="w-full justify-start text-base text-charcoal/80 hover:bg-bright-blue/10 hover:text-bright-blue transition-all duration-200 h-11 flex items-center px-3 rounded-lg"
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/customer/bookings')}
                  className="w-full justify-start text-base text-charcoal/80 hover:bg-bright-blue/10 hover:text-bright-blue transition-all duration-200 h-11 flex items-center px-3 rounded-lg"
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  My Bookings
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
                <h2 className="text-3xl font-bold text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('customerRewards.rewardsLoyalty')} 🎁</h2>
                <p className="text-charcoal/70" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerRewards.trackPoints')}</p>
              </div>
              <button
                onClick={() => navigate('/customer/dashboard')}
                className="btn-outline flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('customerRewards.backToDashboard')}
              </button>
            </div>
          </div>

          {/* Place Selector */}
          {rewards.length > 1 && (
            <div className="bg-white border border-medium-gray rounded-lg p-6 shadow-form">
              <label className="block text-sm font-medium text-charcoal mb-2" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                {t('customerRewards.selectBusiness')}
              </label>
              <select
                value={selectedPlace || ''}
                onChange={(e) => {
                  const placeId = parseInt(e.target.value);
                  setSelectedPlace(placeId);
                  fetchTransactions(placeId);
                }}
                className="input-field"
              >
                {rewards.map((reward) => (
                  <option key={reward.place_id} value={reward.place_id}>
                    Business {reward.place_id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rewards Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-medium-gray rounded-lg p-6 text-center shadow-form transition-all duration-200 hover:scale-[1.02] hover:shadow-elevated">
              <div className="flex items-center justify-center mb-2">
                <Star className="h-6 w-6 text-soft-yellow mr-2" />
                <p className="text-sm text-charcoal/70" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerRewards.currentPoints')}</p>
              </div>
              <p className="text-4xl font-bold text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>{currentReward.points_balance}</p>
            </div>

            <div className="bg-white border border-medium-gray rounded-lg p-6 text-center shadow-form transition-all duration-200 hover:scale-[1.02] hover:shadow-elevated">
              <div className="flex items-center justify-center mb-2">
                <Award className="h-6 w-6 text-lime-green mr-2" />
                <p className="text-sm text-charcoal/70" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerRewards.currentTier')}</p>
              </div>
              <span className={`inline-flex px-3 py-1 text-lg font-bold rounded-full border ${getTierColor(currentReward.tier)}`}>
                {currentReward.tier.charAt(0).toUpperCase() + currentReward.tier.slice(1)}
              </span>
            </div>

            <div className="bg-white border border-medium-gray rounded-lg p-6 text-center shadow-form transition-all duration-200 hover:scale-[1.02] hover:shadow-elevated">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-bright-blue mr-2" />
                <p className="text-sm text-charcoal/70" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerRewards.totalEarned')}</p>
              </div>
              <p className="text-4xl font-bold text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>{currentReward.total_points_earned}</p>
            </div>
          </div>

          {/* Tier Progress */}
          {thresholds.next && (
            <div className="bg-white border border-medium-gray rounded-lg p-6 shadow-form">
              <h3 className="text-lg font-semibold text-charcoal mb-4 font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('customerRewards.progressTo', { tier: thresholds.nextTier })}</h3>
              <div className="w-full bg-light-gray rounded-full h-3 mb-2">
                <div 
                  className="bg-gradient-to-r from-bright-blue to-lime-green h-3 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, ((currentReward.total_points_earned - thresholds.current) / (thresholds.next - thresholds.current)) * 100)}%` 
                  }}
                ></div>
              </div>
              <p className="text-sm text-charcoal/70" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                {t('customerRewards.pointsToTier', { 
                  current: currentReward.total_points_earned - thresholds.current,
                  next: thresholds.next - thresholds.current,
                  tier: thresholds.nextTier
                })}
              </p>
            </div>
          )}

          {/* Transaction History */}
          <div className="bg-white border border-medium-gray rounded-lg shadow-form">
            <div className="px-6 py-4 border-b border-medium-gray">
              <h3 className="text-lg font-semibold text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('customerRewards.recentActivity')}</h3>
            </div>
            <div className="divide-y divide-medium-gray">
              {transactions.length === 0 ? (
                <div className="p-6 text-center text-charcoal/70">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-charcoal/40" />
                  <p style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerRewards.noTransactions')}</p>
                  <p className="text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('customerRewards.completeBookingsPoints')}</p>
                </div>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full ${
                          transaction.transaction_type === 'earned' 
                            ? 'bg-lime-green/20 text-lime-green border border-lime-green/30' 
                            : 'bg-coral-red/20 text-coral-red border border-coral-red/30'
                        }`}>
                          {transaction.transaction_type === 'earned' ? (
                            <Star className="h-5 w-5" />
                          ) : (
                            <Gift className="h-5 w-5" />
                          )}
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-charcoal" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                            {transaction.description}
                          </p>
                          <p className="text-sm text-charcoal/70" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          transaction.points_change > 0 ? 'text-lime-green' : 'text-coral-red'
                        }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                            {transaction.points_change > 0 ? '+' : ''}{transaction.points_change} {t('customerRewards.points')}
                        </p>
                        <p className="text-sm text-charcoal/70" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          {t('customerRewards.balance')}: {transaction.points_balance_after}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerRewards;

