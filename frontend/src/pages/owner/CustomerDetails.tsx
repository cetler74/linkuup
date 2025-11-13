import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  GiftIcon,
  StarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon} from '@heroicons/react/24/outline';
import { useOwnerApi } from '../../utils/ownerApi';

interface CustomerDetail {
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
  place_name: string;
  bookings_history: BookingHistoryItem[];
  reward_transactions: RewardTransactionItem[];
}

interface BookingHistoryItem {
  id: number;
  service_name: string;
  employee_name?: string;
  booking_date: string;
  booking_time: string;
  status: string;
  points_earned?: number;
  points_redeemed?: number;
  created_at: string;
}

interface RewardTransactionItem {
  id: number;
  transaction_type: string;
  points_change: number;
  points_balance_after: number;
  description?: string;
  booking_id?: number;
  created_at: string;
}

const CustomerDetails: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const placeId = searchParams.get('place');
  const navigate = useNavigate();
  
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRewardAdjustment, setShowRewardAdjustment] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentDescription, setAdjustmentDescription] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [saving, setSaving] = useState(false);

  const { useCustomerDetails, useUpdateCustomerRewards } = useOwnerApi();

  const { data: customerData, isLoading, error: queryError } = useCustomerDetails(
    placeId ? parseInt(placeId) : 0,
    userId ? parseInt(userId) : 0
  );

  useEffect(() => {
    if (customerData) {
      setCustomerDetail(customerData);
    }
  }, [customerData]);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  useEffect(() => {
    if (queryError) {
      setError(queryError.message);
    }
  }, [queryError]);

  const updateCustomerRewards = useUpdateCustomerRewards();

  const handleRewardAdjustment = async () => {
    if (!customerDetail || !placeId) return;
    
    setSaving(true);
    try {
      const pointsChange = adjustmentType === 'add' ? adjustmentAmount : -adjustmentAmount;
      
      await updateCustomerRewards.mutateAsync({
        placeId: parseInt(placeId),
        userId: customerDetail.user_id,
        adjustment: {
          points_change: pointsChange,
          description: adjustmentDescription || `${adjustmentType === 'add' ? 'Added' : 'Subtracted'} ${adjustmentAmount} points`,
          transaction_type: 'adjusted'
        }
      });
      
      setShowRewardAdjustment(false);
      setAdjustmentAmount(0);
      setAdjustmentDescription('');
      alert('Reward points updated successfully!');
    } catch (error) {
      console.error('Error updating rewards:', error);
      alert('Error updating reward points');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'confirmed':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4" />;
      case 'cancelled':
        return <XCircleIcon className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircleIcon className="h-4 w-4" />;
      default:
        return <ExclamationTriangleIcon className="h-4 w-4" />;
    }
  };

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'bronze': return 'text-amber-600 bg-amber-100';
      case 'silver': return 'text-gray-600 bg-gray-100';
      case 'gold': return 'text-yellow-600 bg-yellow-100';
      case 'platinum': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <StarIcon className="h-4 w-4 text-green-600" />;
      case 'redeemed':
        return <GiftIcon className="h-4 w-4 text-purple-600" />;
      case 'adjusted':
        return <PlusIcon className="h-4 w-4 text-blue-600" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error || !customerDetail) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Customer Not Found</h2>
          <p className="text-gray-400 mb-4">
            {error || 'The requested customer could not be found.'}
          </p>
          <button
            onClick={() => navigate('/owner/customers')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/owner/customers')}
                className="mr-4 p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Customer Details</h1>
                <p className="text-gray-400">{customerDetail.place_name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Information */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-6">
                <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-white">{customerDetail.user_name}</h2>
                  <p className="text-gray-400">Customer Profile</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-white">{customerDetail.user_email}</span>
                </div>
                
                {customerDetail.user_phone && (
                  <div className="flex items-center">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-white">{customerDetail.user_phone}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Booking Statistics</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{customerDetail.total_bookings}</p>
                      <p className="text-sm text-gray-400">Total Bookings</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{customerDetail.completed_bookings}</p>
                      <p className="text-sm text-gray-400">Completed</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">First Booking:</span>
                      <span className="text-white">
                        {customerDetail.first_booking_date ? 
                          new Date(customerDetail.first_booking_date).toLocaleDateString() : 
                          'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Last Booking:</span>
                      <span className="text-white">
                        {customerDetail.last_booking_date ? 
                          new Date(customerDetail.last_booking_date).toLocaleDateString() : 
                          'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rewards Section */}
                {customerDetail.points_balance !== undefined && (
                  <div className="pt-4 border-t border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Rewards</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Current Points:</span>
                        <span className="text-xl font-bold text-white">{customerDetail.points_balance}</span>
                      </div>
                      
                      {customerDetail.tier && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Tier:</span>
                          <span className={`px-2 py-1 text-sm font-medium rounded-full ${getTierColor(customerDetail.tier)}`}>
                            {customerDetail.tier.charAt(0).toUpperCase() + customerDetail.tier.slice(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowRewardAdjustment(true)}
                      className="w-full mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                    >
                      Adjust Points
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bookings History */}
            <div className="bg-gray-800 rounded-lg shadow-lg">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Booking History</h2>
              </div>
              
              <div className="p-6">
                {customerDetail.bookings_history.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No booking history found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customerDetail.bookings_history.map((booking) => (
                      <div key={booking.id} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                              {getStatusIcon(booking.status)}
                              <span className="ml-1">{booking.status}</span>
                            </span>
                          </div>
                          <span className="text-sm text-gray-400">
                            {new Date(booking.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-white font-medium">{booking.service_name}</p>
                            {booking.employee_name && (
                              <p className="text-sm text-gray-400">with {booking.employee_name}</p>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <p className="text-white">
                              {new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}
                            </p>
                            
                            {(booking.points_earned || booking.points_redeemed) && (
                              <div className="mt-2 space-y-1">
                                {booking.points_earned && (
                                  <p className="text-sm text-green-400">
                                    +{booking.points_earned} points earned
                                  </p>
                                )}
                                {booking.points_redeemed && (
                                  <p className="text-sm text-purple-400">
                                    -{booking.points_redeemed} points redeemed
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reward Transactions */}
            {customerDetail.reward_transactions.length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow-lg">
                <div className="px-6 py-4 border-b border-gray-700">
                  <h2 className="text-xl font-semibold text-white">Reward Transactions</h2>
                </div>
                
                <div className="p-6">
                  <div className="space-y-3">
                    {customerDetail.reward_transactions.map((transaction) => (
                      <div key={transaction.id} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="mr-3">
                              {getTransactionIcon(transaction.transaction_type)}
                            </div>
                            <div>
                              <p className="text-white font-medium">{transaction.description}</p>
                              <p className="text-sm text-gray-400">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className={`font-medium ${
                              transaction.points_change > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {transaction.points_change > 0 ? '+' : ''}{transaction.points_change} points
                            </p>
                            <p className="text-sm text-gray-400">
                              Balance: {transaction.points_balance_after}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reward Adjustment Modal */}
      {showRewardAdjustment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Adjust Reward Points</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Adjustment Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="add"
                      checked={adjustmentType === 'add'}
                      onChange={(e) => setAdjustmentType(e.target.value as 'add' | 'subtract')}
                      className="mr-2"
                    />
                    <span className="text-white">Add Points</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="subtract"
                      checked={adjustmentType === 'subtract'}
                      onChange={(e) => setAdjustmentType(e.target.value as 'add' | 'subtract')}
                      className="mr-2"
                    />
                    <span className="text-white">Subtract Points</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={adjustmentDescription}
                  onChange={(e) => setAdjustmentDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Reason for adjustment"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowRewardAdjustment(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRewardAdjustment}
                disabled={saving || adjustmentAmount <= 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Apply Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetails;
