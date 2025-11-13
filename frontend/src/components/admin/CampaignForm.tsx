import React, { useState } from 'react';
import { XMarkIcon, CalendarIcon, UsersIcon, MegaphoneIcon } from '@heroicons/react/24/outline';
import { adminAPI } from '../../utils/api';

interface CampaignFormProps {
  campaign?: {
    id: number;
    name: string;
    description?: string;
    target_audience: 'existing_owners' | 'new_owners' | 'both';
    channels: string[];
    content: string;
    scheduled_at?: string;
    is_active: boolean;
  };
  onSave: (campaign: any) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const CampaignForm: React.FC<CampaignFormProps> = ({
  campaign,
  onSave,
  onCancel,
  isOpen
}) => {
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    description: campaign?.description || '',
    target_audience: campaign?.target_audience || 'existing_owners' as 'existing_owners' | 'new_owners' | 'both',
    channels: campaign?.channels || [] as string[],
    content: campaign?.content || '',
    scheduled_at: campaign?.scheduled_at || '',
    is_active: campaign?.is_active ?? true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelOptions = [
    { id: 'email', label: 'Email', icon: '📧' },
    { id: 'sms', label: 'SMS', icon: '📱' },
    { id: 'instagram', label: 'Instagram', icon: '📷' },
    { id: 'facebook', label: 'Facebook', icon: '👥' },
    { id: 'twitter', label: 'Twitter', icon: '🐦' },
    { id: 'linkedin', label: 'LinkedIn', icon: '💼' }
  ];

  const targetAudienceOptions = [
    {
      id: 'existing_owners',
      label: 'Existing Owners',
      description: 'Target current business owners on the platform',
      icon: '👥'
    },
    {
      id: 'new_owners',
      label: 'New Owners',
      description: 'Target potential new business owners',
      icon: '🆕'
    },
    {
      id: 'both',
      label: 'Both',
      description: 'Target both existing and potential owners',
      icon: '🌐'
    }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleChannelToggle = (channelId: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channelId)
        ? prev.channels.filter(id => id !== channelId)
        : [...prev.channels, channelId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Campaign name is required');
      return;
    }

    if (formData.channels.length === 0) {
      setError('Please select at least one channel');
      return;
    }

    if (!formData.content.trim()) {
      setError('Campaign content is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const campaignData = {
        ...formData,
        scheduled_at: formData.scheduled_at || undefined
      };

      if (campaign) {
        // Update existing campaign
        const response = await adminAPI.updateCampaign(campaign.id, campaignData);
        onSave(response);
      } else {
        // Create new campaign
        const response = await adminAPI.createCampaign(campaignData);
        onSave(response);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={onCancel} />
        
        <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-purple-900 flex items-center justify-center">
                <MegaphoneIcon className="h-5 w-5 text-purple-300" />
              </div>
              <h3 className="text-lg font-medium text-white">
                {campaign ? 'Edit Campaign' : 'Create New Campaign'}
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-900 border border-red-700 rounded-md p-4">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Campaign Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                Campaign Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white placeholder-gray-400"
                placeholder="Enter campaign name"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white placeholder-gray-400"
                placeholder="Enter campaign description (optional)"
              />
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                Target Audience *
              </label>
              <div className="space-y-3">
                {targetAudienceOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.target_audience === option.id
                        ? 'border-purple-500 bg-purple-900'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="target_audience"
                      value={option.id}
                      checked={formData.target_audience === option.id}
                      onChange={(e) => handleInputChange('target_audience', e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{option.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-white">{option.label}</div>
                        <div className="text-sm text-gray-300">{option.description}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Channels */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                Channels *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {channelOptions.map((channel) => (
                  <label
                    key={channel.id}
                    className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.channels.includes(channel.id)
                        ? 'border-purple-500 bg-purple-900'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.channels.includes(channel.id)}
                      onChange={() => handleChannelToggle(channel.id)}
                      className="sr-only"
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{channel.icon}</span>
                      <span className="text-sm font-medium text-white">{channel.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-white mb-2">
                Campaign Content *
              </label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white placeholder-gray-400"
                placeholder="Enter your campaign message..."
                required
              />
            </div>

            {/* Schedule */}
            <div>
              <label htmlFor="scheduled_at" className="block text-sm font-medium text-white mb-2">
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                Schedule (Optional)
              </label>
              <input
                type="datetime-local"
                id="scheduled_at"
                value={formData.scheduled_at}
                onChange={(e) => handleInputChange('scheduled_at', e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white"
              />
              <p className="text-xs text-gray-300 mt-1">
                Leave empty to send immediately
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-500 rounded bg-gray-700"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-white">
                Campaign is active
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (campaign ? 'Update Campaign' : 'Create Campaign')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CampaignForm;
