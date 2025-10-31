import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
// Temporarily inline type to debug import issue
interface CampaignRecipient {
  id: number;
  campaign_id: number;
  user_id: number;
  customer_email?: string;
  customer_phone?: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  sent_at?: string;
  delivery_status?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface CampaignRecipientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: number;
  campaignName: string;
  onRemoveRecipient?: (recipientId: number) => void;
}

const CampaignRecipientsModal: React.FC<CampaignRecipientsModalProps> = ({
  isOpen,
  onClose,
  campaignId,
  campaignName,
  onRemoveRecipient
}) => {
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Load recipients when modal opens
  useEffect(() => {
    if (isOpen) {
      loadRecipients();
    }
  }, [isOpen, campaignId]);

  const loadRecipients = async () => {
    setLoading(true);
    try {
      // This would be replaced with actual API call
      // const response = await fetch(`/api/campaigns/${campaignId}/recipients`);
      // const data = await response.json();
      // setRecipients(data);
      
      // Mock data for now
      setRecipients([
        {
          id: 1,
          campaign_id: campaignId,
          user_id: 1,
          customer_email: 'john@example.com',
          customer_phone: '+1234567890',
          status: 'sent',
          sent_at: '2024-12-21T10:30:00Z',
          delivery_status: 'delivered',
          error_message: null,
          created_at: '2024-12-21T10:00:00Z',
          updated_at: '2024-12-21T10:30:00Z'
        },
        {
          id: 2,
          campaign_id: campaignId,
          user_id: 2,
          customer_email: 'jane@example.com',
          customer_phone: '+1234567891',
          status: 'failed',
          sent_at: null,
          delivery_status: null,
          error_message: 'Invalid phone number format',
          created_at: '2024-12-21T10:00:00Z',
          updated_at: '2024-12-21T10:30:00Z'
        },
        {
          id: 3,
          campaign_id: campaignId,
          user_id: 3,
          customer_email: 'bob@example.com',
          customer_phone: '+1234567892',
          status: 'pending',
          sent_at: null,
          delivery_status: null,
          error_message: null,
          created_at: '2024-12-21T10:00:00Z',
          updated_at: '2024-12-21T10:00:00Z'
        }
      ]);
    } catch (error) {
      console.error('Error loading recipients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRecipient = async (recipientId: number) => {
    if (!onRemoveRecipient) return;
    
    if (window.confirm('Are you sure you want to remove this recipient?')) {
      try {
        onRemoveRecipient(recipientId);
        // Remove from local state
        setRecipients(prev => prev.filter(r => r.id !== recipientId));
      } catch (error) {
        console.error('Error removing recipient:', error);
      }
    }
  };

  const exportRecipients = () => {
    const csvContent = [
      ['Email', 'Phone', 'Status', 'Sent At', 'Error Message'].join(','),
      ...recipients.map(recipient => [
        recipient.customer_email || '',
        recipient.customer_phone || '',
        recipient.status,
        recipient.sent_at || '',
        recipient.error_message || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaignId}-recipients.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Filter recipients based on search and status
  const filteredRecipients = recipients.filter(recipient => {
    const matchesSearch = !searchTerm || 
      recipient.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipient.customer_phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || recipient.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'bounced':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'bounced':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatPhoneForDisplay = (phone: string) => {
    if (!phone) return '';
    if (phone.length <= 4) return phone;
    return phone.slice(0, 2) + '****' + phone.slice(-2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">
                Campaign Recipients
              </h3>
              <p className="text-sm text-gray-600 mt-1">{campaignName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{recipients.length}</div>
              <div className="text-sm text-gray-600">Total Recipients</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {recipients.filter(r => r.status === 'sent').length}
              </div>
              <div className="text-sm text-green-600">Sent</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">
                {recipients.filter(r => r.status === 'failed').length}
              </div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {recipients.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-sm text-yellow-600">Pending</div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search recipients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FunnelIcon className="h-4 w-4" />
                <span>Filter</span>
              </button>
              
              {showFilters && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                  <option value="bounced">Bounced</option>
                </select>
              )}
            </div>
            
            <button
              onClick={exportRecipients}
              className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Recipients Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading recipients...</span>
              </div>
            ) : filteredRecipients.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No recipients found matching your criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sent At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Error
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRecipients.map((recipient) => (
                      <tr key={recipient.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {recipient.customer_email}
                          </div>
                          {recipient.customer_phone && (
                            <div className="text-sm text-gray-500">
                              {formatPhoneForDisplay(recipient.customer_phone)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(recipient.status)}
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(recipient.status)}`}>
                              {recipient.status}
                            </span>
                          </div>
                          {recipient.delivery_status && (
                            <div className="text-xs text-gray-500 mt-1">
                              {recipient.delivery_status}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {recipient.sent_at ? formatDate(recipient.sent_at) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {recipient.error_message ? (
                            <div className="max-w-xs truncate" title={recipient.error_message}>
                              {recipient.error_message}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {recipient.status === 'pending' && onRemoveRecipient && (
                            <button
                              onClick={() => handleRemoveRecipient(recipient.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignRecipientsModal;
