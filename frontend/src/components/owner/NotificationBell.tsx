import React, { useState, useEffect, useRef } from 'react';
import { BellIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { ownerAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  booking_id: number | null;
  place_id: number | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

const NotificationBell: React.FC = () => {
  const { isAuthenticated, isBusinessOwner } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count and notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [countData, notificationsData] = await Promise.all([
        ownerAPI.getUnreadNotificationCount(),
        ownerAPI.getNotifications(20, 0, false)
      ]);
      setUnreadCount(countData.count);
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch notifications if user is authenticated and is a business owner
    if (isAuthenticated && isBusinessOwner) {
      fetchNotifications();
      
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isBusinessOwner]);
  
  // Also fetch notifications when authentication state changes (e.g., on login)
  useEffect(() => {
    if (isAuthenticated && isBusinessOwner) {
      fetchNotifications();
    }
  }, [isAuthenticated, isBusinessOwner]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await ownerAPI.markNotificationAsRead(notificationId);
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await ownerAPI.markAllNotificationsAsRead();
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDelete = async (notificationId: number) => {
    try {
      await ownerAPI.deleteNotification(notificationId);
      await fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_booking':
        return '📅';
      case 'cancellation':
        return '❌';
      case 'daily_reminder':
        return '⏰';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_booking':
        return 'bg-blue-100 text-blue-800';
      case 'cancellation':
        return 'bg-red-100 text-red-800';
      case 'daily_reminder':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#333333] hover:text-[#1E90FF] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] rounded-md transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-[#E0E0E0] z-50 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#E0E0E0] flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-[#1E90FF] hover:text-[#1877D2] font-medium"
                style={{ fontFamily: 'Open Sans, sans-serif' }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-[#E0E0E0]">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-[#F5F5F5] transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${notification.is_read ? 'text-[#333333]' : 'text-[#1E90FF]'}`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-[#9E9E9E] mt-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-[#9E9E9E] mt-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                              {formatDate(notification.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            {!notification.is_read && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="p-1 text-[#1E90FF] hover:text-[#1877D2] focus:outline-none"
                                aria-label="Mark as read"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="p-1 text-[#9E9E9E] hover:text-red-500 focus:outline-none"
                              aria-label="Delete"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

