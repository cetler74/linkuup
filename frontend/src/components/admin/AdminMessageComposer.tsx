import React, { useState, useEffect } from 'react';
import { XMarkIcon, PaperAirplaneIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { adminAPI } from '../../utils/api';

interface Owner {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  place_count: number;
  total_bookings: number;
  created_at: string;
}

interface AdminMessageComposerProps {
  onMessageSent: (message: any) => void;
  onCancel: () => void;
  isOpen: boolean;
  selectedOwners?: Owner[];
}

const AdminMessageComposer: React.FC<AdminMessageComposerProps> = ({
  onMessageSent,
  onCancel,
  isOpen,
  selectedOwners = []
}) => {
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    recipient_owner_ids: [] as number[],
    is_urgent: false,
    scheduled_at: ''
  });
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load owners when component mounts
  useEffect(() => {
    if (isOpen) {
      loadOwners();
    }
  }, [isOpen]);

  // Set initial recipients if provided
  useEffect(() => {
    if (selectedOwners.length > 0) {
      setFormData(prev => ({
        ...prev,
        recipient_owner_ids: selectedOwners.map(owner => owner.id)
      }));
    }
  }, [selectedOwners]);

  const loadOwners = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getOwners(1, 100);
      setOwners(response.items);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load owners');
      setOwners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOwnerToggle = (ownerId: number) => {
    setFormData(prev => ({
      ...prev,
      recipient_owner_ids: prev.recipient_owner_ids.includes(ownerId)
        ? prev.recipient_owner_ids.filter(id => id !== ownerId)
        : [...prev.recipient_owner_ids, ownerId]
    }));
  };

  const handleSelectAll = () => {
    const allOwnerIds = filteredOwners.map(owner => owner.id);
    setFormData(prev => ({
      ...prev,
      recipient_owner_ids: allOwnerIds
    }));
  };

  const handleSelectNone = () => {
    setFormData(prev => ({
      ...prev,
      recipient_owner_ids: []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim()) {
      setError('Subject is required');
      return;
    }

    if (!formData.content.trim()) {
      setError('Message content is required');
      return;
    }

    if (formData.recipient_owner_ids.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const messageData = {
        ...formData,
        scheduled_at: formData.scheduled_at || undefined
      };

      const response = await adminAPI.sendAdminMessage(messageData);
      onMessageSent(response);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const filteredOwners = owners.filter(owner =>
    owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOwnersList = owners.filter(owner => 
    formData.recipient_owner_ids.includes(owner.id)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <PaperAirplaneIcon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Compose Admin Message
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <input
                type="text"
                id="subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter message subject"
                required
              />
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Recipients *
              </label>
              
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search owners..."
                />
              </div>

              {/* Selection Controls */}
              <div className="flex items-center space-x-3 mb-4">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleSelectNone}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Select None
                </button>
                <span className="text-sm text-gray-500">
                  {formData.recipient_owner_ids.length} selected
                </span>
              </div>

              {/* Selected Recipients */}
              {selectedOwnersList.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-md">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Selected Recipients:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedOwnersList.map(owner => (
                      <span
                        key={owner.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {owner.name}
                        <button
                          type="button"
                          onClick={() => handleOwnerToggle(owner.id)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Owner List */}
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                    <span className="ml-2 text-sm">Loading owners...</span>
                  </div>
                ) : filteredOwners.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {searchTerm ? 'No owners found matching your search' : 'No owners available'}
                  </div>
                ) : (
                  filteredOwners.map(owner => (
                    <label
                      key={owner.id}
                      className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                        formData.recipient_owner_ids.includes(owner.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.recipient_owner_ids.includes(owner.id)}
                        onChange={() => handleOwnerToggle(owner.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{owner.name}</div>
                            <div className="text-sm text-gray-500">{owner.email}</div>
                            <div className="text-xs text-gray-400">
                              {owner.place_count} places • {owner.total_bookings} bookings
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {!owner.is_active && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Message Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Message Content *
              </label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your message..."
                required
              />
            </div>

            {/* Urgent Flag */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_urgent"
                checked={formData.is_urgent}
                onChange={(e) => handleInputChange('is_urgent', e.target.checked)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="is_urgent" className="ml-2 block text-sm text-gray-900">
                <ExclamationTriangleIcon className="h-4 w-4 inline mr-1 text-red-500" />
                Mark as urgent
              </label>
            </div>

            {/* Schedule */}
            <div>
              <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-700 mb-2">
                <ClockIcon className="h-4 w-4 inline mr-1" />
                Schedule (Optional)
              </label>
              <input
                type="datetime-local"
                id="scheduled_at"
                value={formData.scheduled_at}
                onChange={(e) => handleInputChange('scheduled_at', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to send immediately
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminMessageComposer;
