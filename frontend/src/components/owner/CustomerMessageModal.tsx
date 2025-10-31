import React, { useState } from 'react';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface CustomerMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    user_id: number;
    user_name: string;
    user_email: string;
    user_phone?: string;
  };
  onSendMessage: (message: { subject: string; content: string; message_type: string }) => Promise<void>;
}

const CustomerMessageModal: React.FC<CustomerMessageModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSendMessage
}) => {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState('general');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !content.trim()) {
      alert('Please fill in both subject and message content');
      return;
    }

    setIsLoading(true);
    try {
      await onSendMessage({
        subject: subject.trim(),
        content: content.trim(),
        message_type: messageType
      });
      
      // Reset form
      setSubject('');
      setContent('');
      setMessageType('general');
      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSubject('');
      setContent('');
      setMessageType('general');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border border-gray-700 w-full max-w-2xl shadow-lg rounded-md bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">
            Send Message to {customer.user_name}
          </h3>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-200 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-700 rounded-lg">
          <div className="text-sm text-gray-300">
            <p><strong>Email:</strong> {customer.user_email}</p>
            {customer.user_phone && (
              <p><strong>Phone:</strong> {customer.user_phone}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Message Type
            </label>
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="general">General Message</option>
              <option value="promotion">Promotion/Offer</option>
              <option value="reminder">Appointment Reminder</option>
              <option value="follow_up">Follow-up</option>
              <option value="support">Customer Support</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter message subject"
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Message Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your message here..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={isLoading}
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !subject.trim() || !content.trim()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerMessageModal;
