import React, { useState, useEffect } from 'react';
import { GiftIcon, CogIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface RewardsConfig {
  calculation_method: string;
  points_per_booking: number;
  points_per_currency_unit: number;
  is_active: boolean;
  redemption_rules: {
    min_points_redemption: number;
    max_points_redemption: number;
    points_to_currency_ratio: number;
  };
}

const RewardsManagement: React.FC = () => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [config, setConfig] = useState<RewardsConfig>({
    calculation_method: 'volume_based',
    points_per_booking: 10,
    points_per_currency_unit: 1,
    is_active: true,
    redemption_rules: {
      min_points_redemption: 100,
      max_points_redemption: 1000,
      points_to_currency_ratio: 10
    }
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleConfigChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setConfig(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof RewardsConfig],
          [child]: value
        }
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    setMessage(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage({ type: 'success', text: 'Rewards configuration saved successfully!' });
      setShowConfigModal(false);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save rewards configuration' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <GiftIcon className="h-8 w-8 text-[#1E90FF] mr-3" />
            <h1 className="text-3xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>Rewards Management</h1>
          </div>
          <p className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Manage customer loyalty and rewards programs</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-[#A3D55D] bg-opacity-20 text-[#A3D55D] border border-[#A3D55D]' 
              : 'bg-[#FF5A5F] bg-opacity-20 text-[#FF5A5F] border border-[#FF5A5F]'
          }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Current Configuration */}
          <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-6">
            <div className="flex items-center mb-4">
              <CogIcon className="h-6 w-6 text-[#1E90FF] mr-3" />
              <h2 className="text-xl font-semibold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>Current Configuration</h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Calculation Method:</span>
                <span className="text-[#333333] capitalize" style={{ fontFamily: 'Open Sans, sans-serif' }}>{config.calculation_method.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Points per Booking:</span>
                <span className="text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{config.points_per_booking}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Points per Euro:</span>
                <span className="text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{config.points_per_currency_unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Status:</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  config.is_active ? 'bg-[#A3D55D] bg-opacity-20 text-[#A3D55D]' : 'bg-[#FF5A5F] bg-opacity-20 text-[#FF5A5F]'
                }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                  {config.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Redemption Rules */}
          <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-6">
            <h2 className="text-xl font-semibold text-[#333333] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Redemption Rules</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Min Points:</span>
                <span className="text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{config.redemption_rules.min_points_redemption}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Max Points:</span>
                <span className="text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{config.redemption_rules.max_points_redemption}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Points to Currency:</span>
                <span className="text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>1:{config.redemption_rules.points_to_currency_ratio}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-6">
          <div className="text-center py-8">
            <GiftIcon className="h-16 w-16 text-[#1E90FF] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#333333] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Rewards System</h2>
            <p className="text-[#9E9E9E] mb-6" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              Set up customer loyalty programs, points systems, and reward redemption rules.
            </p>
            <div className="space-y-4 text-left max-w-md mx-auto mb-6">
              <div className="flex items-center text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                <CheckIcon className="w-5 h-5 text-[#A3D55D] mr-3" />
                Points per booking
              </div>
              <div className="flex items-center text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                <CheckIcon className="w-5 h-5 text-[#A3D55D] mr-3" />
                Tier-based rewards
              </div>
              <div className="flex items-center text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                <CheckIcon className="w-5 h-5 text-[#A3D55D] mr-3" />
                Redemption tracking
              </div>
              <div className="flex items-center text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                <CheckIcon className="w-5 h-5 text-[#A3D55D] mr-3" />
                Customer analytics
              </div>
            </div>
            <button 
              onClick={() => setShowConfigModal(true)}
              className="bg-[#1E90FF] hover:bg-[#1877D2] text-white px-6 py-2 rounded-lg font-medium transition-colors"
              style={{ fontFamily: 'Open Sans, sans-serif' }}
            >
              Configure Rewards
            </button>
          </div>
        </div>

        {/* Configuration Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Configure Rewards</h3>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Calculation Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Calculation Method
                  </label>
                  <select
                    value={config.calculation_method}
                    onChange={(e) => handleConfigChange('calculation_method', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="volume_based">Volume Based (Points per Euro)</option>
                    <option value="fixed_per_booking">Fixed per Booking</option>
                  </select>
                </div>

                {/* Points per Booking */}
                {config.calculation_method === 'fixed_per_booking' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Points per Booking
                    </label>
                    <input
                      type="number"
                      value={config.points_per_booking}
                      onChange={(e) => handleConfigChange('points_per_booking', parseInt(e.target.value))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                )}

                {/* Points per Euro */}
                {config.calculation_method === 'volume_based' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Points per Euro Spent
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.points_per_currency_unit}
                      onChange={(e) => handleConfigChange('points_per_currency_unit', parseFloat(e.target.value))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      min="0.1"
                    />
                    <p className="text-sm text-gray-400 mt-1">
                      Example: 1.0 means 1 point per €1 spent, 2.0 means 2 points per €1 spent
                    </p>
                  </div>
                )}


                {/* Redemption Rules */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Min Points for Redemption
                    </label>
                    <input
                      type="number"
                      value={config.redemption_rules.min_points_redemption}
                      onChange={(e) => handleConfigChange('redemption_rules.min_points_redemption', parseInt(e.target.value))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Points for Redemption
                    </label>
                    <input
                      type="number"
                      value={config.redemption_rules.max_points_redemption}
                      onChange={(e) => handleConfigChange('redemption_rules.max_points_redemption', parseInt(e.target.value))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                {/* Points to Currency Ratio */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Points to Currency Ratio (1:?)
                  </label>
                  <input
                    type="number"
                    value={config.redemption_rules.points_to_currency_ratio}
                    onChange={(e) => handleConfigChange('redemption_rules.points_to_currency_ratio', parseInt(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={config.is_active}
                    onChange={(e) => handleConfigChange('is_active', e.target.checked)}
                    className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-300">
                    Enable rewards system
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveConfig}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardsManagement;
