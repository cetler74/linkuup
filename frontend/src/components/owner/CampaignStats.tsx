import React from 'react';
import { 
  EnvelopeIcon, 
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
// Temporarily inline type to debug import issue
interface MessagingStats {
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  delivery_rate: number;
  email_count: number;
  whatsapp_count: number;
  last_sent_at?: string;
}

interface CampaignStatsProps {
  stats: MessagingStats;
  campaignType: 'messaging' | 'price_reduction' | 'rewards_increase' | 'free_service';
}

const CampaignStats: React.FC<CampaignStatsProps> = ({ stats, campaignType }) => {
  // For non-messaging campaigns, return null or basic stats
  if (campaignType !== 'messaging') {
    return null;
  }

  const deliveryRate = stats.delivery_rate || 0;
  const totalSent = stats.sent_count + stats.failed_count;
  const successRate = totalSent > 0 ? (stats.sent_count / totalSent) * 100 : 0;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Recipients */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Recipients</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total_recipients}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Sent Count */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Sent</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.sent_count}
                    {stats.total_recipients > 0 && (
                      <span className="text-sm text-gray-500 ml-1">
                        ({Math.round((stats.sent_count / stats.total_recipients) * 100)}%)
                      </span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Failed Count */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Failed</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.failed_count}
                    {stats.total_recipients > 0 && (
                      <span className="text-sm text-gray-500 ml-1">
                        ({Math.round((stats.failed_count / stats.total_recipients) * 100)}%)
                      </span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Count */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.pending_count}
                    {stats.total_recipients > 0 && (
                      <span className="text-sm text-gray-500 ml-1">
                        ({Math.round((stats.pending_count / stats.total_recipients) * 100)}%)
                      </span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Breakdown */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Channel Breakdown
          </h3>
          
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Email Stats */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <EnvelopeIcon className="h-5 w-5 text-gray-600 mr-2" />
                <h4 className="text-sm font-medium text-gray-900">Email</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Recipients:</span>
                  <span className="font-medium">{stats.email_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Rate:</span>
                  <span className="font-medium">{deliveryRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* WhatsApp Stats */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600 mr-2" />
                <h4 className="text-sm font-medium text-gray-900">WhatsApp</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Recipients:</span>
                  <span className="font-medium">{stats.whatsapp_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Rate:</span>
                  <span className="font-medium">{deliveryRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Progress Bar */}
      {stats.total_recipients > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Delivery Progress
            </h3>
            
            <div className="space-y-4">
              {/* Overall Progress */}
              <div>
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                  <span>Overall Progress</span>
                  <span>{Math.round(((stats.sent_count + stats.failed_count) / stats.total_recipients) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((stats.sent_count + stats.failed_count) / stats.total_recipients) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Success Rate */}
              <div>
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                  <span>Success Rate</span>
                  <span>{successRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${successRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Campaign Details
          </h3>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Sent</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(stats.last_sent_at)}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Delivery Rate</dt>
              <dd className="mt-1 text-sm text-gray-900">{deliveryRate.toFixed(1)}%</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Attempts</dt>
              <dd className="mt-1 text-sm text-gray-900">{stats.sent_count + stats.failed_count}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Remaining</dt>
              <dd className="mt-1 text-sm text-gray-900">{stats.pending_count}</dd>
            </div>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Status Legend</h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="flex items-center">
            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
            <span className="text-sm text-gray-700">Sent - Message delivered successfully</span>
          </div>
          <div className="flex items-center">
            <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />
            <span className="text-sm text-gray-700">Failed - Delivery failed</span>
          </div>
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 text-yellow-500 mr-2" />
            <span className="text-sm text-gray-700">Pending - Awaiting delivery</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignStats;
