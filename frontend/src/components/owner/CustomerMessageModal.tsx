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
      <div className="relative top-20 mx-auto p-6 border border-[#E0E0E0] w-full max-w-2xl shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Send Message to {customer.user_name}
          </h3>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-[#9E9E9E] hover:text-[#333333] disabled:opacity-50 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-[#F5F5F5] rounded-lg border border-[#E0E0E0]">
          <div className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            <p className="mb-2"><strong className="font-semibold">Email:</strong> {customer.user_email}</p>
            {customer.user_phone && (
              <p><strong className="font-semibold">Phone:</strong> {customer.user_phone}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>
              Message Type
            </label>
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF] transition-colors"
              style={{ fontFamily: 'Open Sans, sans-serif' }}
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
            <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter message subject"
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF] transition-colors"
              style={{ fontFamily: 'Open Sans, sans-serif' }}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>
              Message Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your message here..."
              rows={6}
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF] resize-none transition-colors"
              style={{ fontFamily: 'Open Sans, sans-serif' }}
              disabled={isLoading}
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-[#333333] bg-white border border-[#E0E0E0] rounded-lg hover:bg-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF] disabled:opacity-50 transition-colors"
              style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !subject.trim() || !content.trim()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#1E90FF] rounded-lg hover:bg-[#1877D2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E90FF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0px_2px_8px_rgba(0,0,0,0.1)]"
              style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
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
