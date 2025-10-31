import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, ExclamationTriangleIcon, UserIcon } from '@heroicons/react/24/outline';
import { useOwnerApi } from '../../utils/ownerApi';
import PlaceSelector from '../../components/owner/PlaceSelector';

interface Message {
  id: number;
  business_id: number;
  customer_id?: number;
  customer_name?: string;
  customer_email?: string;
  sender_id?: number;
  sender_type: 'customer' | 'system';
  message_type: 'inquiry' | 'booking' | 'complaint' | 'system';
  subject?: string;
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  parent_message_id?: number;
  attachments?: string[];
}

interface Place {
  id: number;
  name: string;
  location_type: 'fixed' | 'mobile';
  city?: string;
  service_areas?: string[];
}

const MessagesManagement: React.FC = () => {
  const { usePlaces, usePlaceMessages, useCreateMessage, useUpdateMessage } = useOwnerApi();
  
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'inquiry' | 'booking' | 'complaint' | 'system'>('all');

  const { data: places = [] } = usePlaces();
  const { data: messages = [], isLoading } = usePlaceMessages(selectedPlaceId || 0);
  const createMessageMutation = useCreateMessage();
  const updateMessageMutation = useUpdateMessage();

  useEffect(() => {
    if (places.length > 0 && !selectedPlaceId) {
      setSelectedPlaceId(places[0].id);
    }
  }, [places, selectedPlaceId]);

  const filteredMessages = messages.filter(message => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !message.is_read;
    return message.message_type === filter;
  });

  const handleMessageSelect = async (message: Message) => {
    setSelectedMessage(message);
    
    // Mark as read if not already read
    if (!message.is_read) {
      try {
        await updateMessageMutation.mutateAsync({
          id: message.id,
          data: { is_read: true, read_at: new Date().toISOString() }
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !replyText.trim() || !selectedPlaceId) return;

    setIsReplying(true);
    try {
      await createMessageMutation.mutateAsync({
        placeId: selectedPlaceId,
        data: {
          customer_id: selectedMessage.customer_id,
          customer_name: selectedMessage.customer_name,
          customer_email: selectedMessage.customer_email,
          sender_type: 'business',
          message_type: 'reply',
          subject: `Re: ${selectedMessage.subject || 'Message'}`,
          content: replyText,
          parent_message_id: selectedMessage.id
        }
      });
      
      setReplyText('');
      setIsReplying(false);
      alert('Reply sent successfully!');
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Error sending reply. Please try again.');
    } finally {
      setIsReplying(false);
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'inquiry':
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />;
      case 'booking':
        return <UserIcon className="h-5 w-5 text-green-600" />;
      case 'complaint':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      case 'system':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      default:
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'inquiry':
        return 'bg-blue-100 text-blue-800';
      case 'booking':
        return 'bg-green-100 text-green-800';
      case 'complaint':
        return 'bg-red-100 text-red-800';
      case 'system':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Messages Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage customer messages and system notifications
          </p>
        </div>
      </div>

      {/* Place Selector */}
      <div className="bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Place
        </label>
        <PlaceSelector
          places={places}
          selectedPlaceId={selectedPlaceId || undefined}
          onPlaceChange={setSelectedPlaceId}
          placeholder="Choose a place to manage messages"
        />
      </div>

      {selectedPlaceId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages List */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Messages</h3>
                  <div className="flex space-x-2">
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as any)}
                      className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All</option>
                      <option value="unread">Unread</option>
                      <option value="inquiry">Inquiries</option>
                      <option value="booking">Bookings</option>
                      <option value="complaint">Complaints</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <ChatBubbleLeftRightIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No messages found</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {filteredMessages.map((message) => (
                      <li key={message.id}>
                        <button
                          onClick={() => handleMessageSelect(message)}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                            selectedMessage?.id === message.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              {getMessageIcon(message.message_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className={`text-sm font-medium ${
                                  !message.is_read ? 'text-gray-900' : 'text-gray-700'
                                }`}>
                                  {message.customer_name || 'System'}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getMessageTypeColor(message.message_type)}`}>
                                    {message.message_type}
                                  </span>
                                  {!message.is_read && (
                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-500 truncate">
                                {message.subject || message.content}
                              </p>
                              <p className="text-xs text-gray-400">
                                {formatDate(message.created_at)}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Message Detail */}
          <div className="lg:col-span-2">
            {selectedMessage ? (
              <div className="bg-white shadow rounded-lg">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {selectedMessage.subject || 'Message'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        From: {selectedMessage.customer_name || 'System'} ({selectedMessage.customer_email})
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getMessageTypeColor(selectedMessage.message_type)}`}>
                        {selectedMessage.message_type}
                      </span>
                      {selectedMessage.is_read ? (
                        <span className="text-xs text-gray-500">Read</span>
                      ) : (
                        <span className="text-xs text-blue-600">Unread</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="prose max-w-none">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedMessage.content}
                    </p>
                  </div>
                  
                  {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Attachments</h4>
                      <div className="space-y-1">
                        {selectedMessage.attachments.map((attachment, index) => (
                          <a
                            key={index}
                            href={attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {attachment.split('/').pop()}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reply Section */}
                <div className="p-4 border-t border-gray-200">
                  <form onSubmit={handleReply} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reply
                      </label>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                        placeholder="Type your reply here..."
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isReplying || !replyText.trim()}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                        {isReplying ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-8 text-center">
                <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No message selected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a message from the list to view details and reply.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesManagement;
