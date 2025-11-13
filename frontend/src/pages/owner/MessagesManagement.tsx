import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, ExclamationTriangleIcon, UserIcon, BuildingOfficeIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useOwnerApi } from '../../utils/ownerApi';

interface Message {
  id: number;
  business_id: number;
  customer_id?: number;
  customer_name?: string;
  customer_email?: string;
  sender_id?: number;
  sender_type: 'customer' | 'business' | 'system';
  message_type: 'inquiry' | 'booking' | 'complaint' | 'system' | 'reply';
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
  const [filter, setFilter] = useState<'all' | 'unread' | 'inquiry' | 'booking' | 'complaint' | 'system' | 'reply'>('all');

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
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-bright-blue" />;
      case 'booking':
        return <UserIcon className="h-5 w-5 text-lime-green" />;
      case 'complaint':
        return <ExclamationTriangleIcon className="h-5 w-5 text-coral-red" />;
      case 'system':
        return <ExclamationTriangleIcon className="h-5 w-5 text-soft-yellow" />;
      default:
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-charcoal" />;
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'inquiry':
        return 'bg-bright-blue bg-opacity-20 text-bright-blue';
      case 'booking':
        return 'bg-lime-green bg-opacity-20 text-lime-green';
      case 'complaint':
        return 'bg-coral-red bg-opacity-20 text-coral-red';
      case 'system':
        return 'bg-soft-yellow bg-opacity-20 text-soft-yellow';
      default:
        return 'bg-light-gray text-charcoal';
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-bright-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Messages Management</h1>
          <p className="mt-2 text-sm text-charcoal font-body" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 400 }}>
            Manage customer messages and system notifications
          </p>
        </div>
      </div>

      {/* Place Selector - Horizontal Tabs */}
      <div className="bg-white rounded-lg shadow-form p-4" style={{ borderRadius: '8px' }}>
        <label className="block text-sm font-medium text-charcoal mb-3 font-body px-1" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>
          Select Place
        </label>
        <div className="overflow-x-auto">
          <div className="flex gap-2 -mb-px border-b border-medium-gray">
          {places.map((place) => {
            const isSelected = selectedPlaceId === place.id;
            return (
              <button
                key={place.id}
                type="button"
                onClick={() => setSelectedPlaceId(place.id)}
                className={`
                  flex items-center gap-2 px-3 py-2.5 max-[412px]:px-4 max-[412px]:py-3 max-[412px]:min-h-[48px] border-b-2 transition-all duration-200 font-body flex-shrink-0 rounded-lg max-[412px]:rounded-full
                  ${isSelected 
                    ? 'border-bright-blue text-bright-blue bg-bright-blue bg-opacity-10' 
                    : 'border-transparent text-charcoal opacity-70 hover:opacity-100 hover:border-medium-gray hover:bg-light-gray'
                  }
                `}
                style={{ 
                  fontFamily: 'Open Sans, sans-serif', 
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: '14px'
                }}
              >
                <div className={`flex items-center justify-center rounded-lg shrink-0 size-7 ${
                  isSelected ? 'bg-bright-blue' : 'bg-light-gray'
                }`}>
                  {place.location_type === 'mobile' ? (
                    <MapPinIcon className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-bright-blue'}`} />
                  ) : (
                    <BuildingOfficeIcon className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-bright-blue'}`} />
                  )}
                </div>
                <span className="text-sm whitespace-nowrap">
                  {place.name} ({place.location_type === 'fixed' ? 'Fixed' : 'Mobile'})
                </span>
              </button>
            );
          })}
          </div>
        </div>
      </div>

      {selectedPlaceId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages List */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-form rounded-lg" style={{ borderRadius: '8px' }}>
              <div className="p-4 border-b border-medium-gray">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Messages</h3>
                  <div className="flex space-x-2">
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as any)}
                      className="text-sm border-medium-gray rounded-lg focus:ring-2 focus:ring-bright-blue focus:border-bright-blue bg-light-gray text-charcoal font-body"
                      style={{ 
                        fontFamily: 'Open Sans, sans-serif', 
                        fontWeight: 400,
                        fontSize: '14px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #E0E0E0'
                      }}
                    >
                      <option value="all">All</option>
                      <option value="unread">Unread</option>
                      <option value="inquiry">Inquiries</option>
                      <option value="booking">Bookings</option>
                      <option value="complaint">Complaints</option>
                      <option value="reply">Replies</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <ChatBubbleLeftRightIcon className="mx-auto h-8 w-8 text-charcoal opacity-40" />
                    <p className="mt-2 text-sm text-charcoal opacity-60 font-body" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 400 }}>No messages found</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-medium-gray">
                    {filteredMessages.map((message) => (
                      <li key={message.id}>
                        <button
                          onClick={() => handleMessageSelect(message)}
                          className={`w-full px-4 py-3 text-left hover:bg-light-gray transition-colors ${
                            selectedMessage?.id === message.id ? 'bg-bright-blue bg-opacity-10' : ''
                          }`}
                          style={{ fontFamily: 'Open Sans, sans-serif' }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              {getMessageIcon(message.message_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className={`text-sm font-medium ${
                                  !message.is_read ? 'text-charcoal' : 'text-charcoal opacity-70'
                                }`} style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>
                                  {message.customer_name || 'System'}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getMessageTypeColor(message.message_type)}`} style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>
                                    {message.message_type}
                                  </span>
                                  {!message.is_read && (
                                    <div className="w-2 h-2 bg-bright-blue rounded-full"></div>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-charcoal opacity-60 truncate font-body" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 400 }}>
                                {message.subject || message.content}
                              </p>
                              <p className="text-xs text-charcoal opacity-40 font-body" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 400 }}>
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
              <div className="bg-white shadow-form rounded-lg" style={{ borderRadius: '8px' }}>
                <div className="p-4 border-b border-medium-gray">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                        {selectedMessage.subject || 'Message'}
                      </h3>
                      <p className="text-sm text-charcoal opacity-60 font-body" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 400 }}>
                        From: {selectedMessage.customer_name || 'System'} ({selectedMessage.customer_email})
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getMessageTypeColor(selectedMessage.message_type)}`} style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>
                        {selectedMessage.message_type}
                      </span>
                      {selectedMessage.is_read ? (
                        <span className="text-xs text-charcoal opacity-60 font-body" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 400 }}>Read</span>
                      ) : (
                        <span className="text-xs text-bright-blue font-body" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>Unread</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="prose max-w-none">
                    <p className="text-sm text-charcoal whitespace-pre-wrap font-body" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 400 }}>
                      {selectedMessage.content}
                    </p>
                  </div>
                  
                  {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-charcoal mb-2 font-body" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>Attachments</h4>
                      <div className="space-y-1">
                        {selectedMessage.attachments.map((attachment, index) => (
                          <a
                            key={index}
                            href={attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-bright-blue hover:text-bright-blue hover:opacity-80 font-body transition-colors"
                            style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 400 }}
                          >
                            {attachment.split('/').pop()}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reply Section */}
                <div className="p-4 border-t border-medium-gray">
                  <form onSubmit={handleReply} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>
                        Reply
                      </label>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                        placeholder="Type your reply here..."
                        className="block w-full border-medium-gray rounded-lg shadow-sm focus:ring-2 focus:ring-bright-blue focus:border-bright-blue sm:text-sm bg-light-gray text-charcoal placeholder:text-charcoal placeholder:opacity-60 font-body"
                        style={{ 
                          fontFamily: 'Open Sans, sans-serif', 
                          fontWeight: 400,
                          fontSize: '14px',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #E0E0E0'
                        }}
                        onFocus={(e) => {
                          e.target.style.boxShadow = '0 0 4px rgba(30, 144, 255, 0.4)';
                        }}
                        onBlur={(e) => {
                          e.target.style.boxShadow = 'none';
                        }}
                        required
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isReplying || !replyText.trim()}
                        className="inline-flex items-center px-4 max-[412px]:px-4 py-2 max-[412px]:py-3 max-[412px]:min-h-[44px] max-[412px]:rounded-full border border-transparent text-sm leading-4 font-medium rounded-lg text-white bg-bright-blue hover:bg-[#1877D2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bright-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-body"
                        style={{ 
                          fontFamily: 'Open Sans, sans-serif', 
                          fontWeight: 600,
                          borderRadius: '8px'
                        }}
                      >
                        <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                        {isReplying ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow-form rounded-lg p-8 text-center" style={{ borderRadius: '8px' }}>
                <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-charcoal opacity-40" />
                <h3 className="mt-2 text-sm font-medium text-charcoal font-display" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>No message selected</h3>
                <p className="mt-1 text-sm text-charcoal opacity-60 font-body" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 400 }}>
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
