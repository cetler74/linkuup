import React, { useState } from 'react';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

interface RecurringBookingFormProps {
  onSubmit: (data: RecurringBookingData) => void;
  onCancel: () => void;
  initialData?: Partial<RecurringBookingData>;
}

interface RecurringBookingData {
  business_id: number;
  service_id: number;
  employee_id?: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  booking_date: string;
  booking_time: string;
  duration?: number;
  recurrence_pattern: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    daysOfWeek?: number[];
    endDate?: string;
  };
  recurrence_end_date?: string;
}

const RecurringBookingForm: React.FC<RecurringBookingFormProps> = ({
  onSubmit,
  onCancel,
  initialData = {}
}) => {
  const [formData, setFormData] = useState<RecurringBookingData>({
    business_id: initialData.business_id || 0,
    service_id: initialData.service_id || 0,
    employee_id: initialData.employee_id,
    customer_name: initialData.customer_name || '',
    customer_email: initialData.customer_email || '',
    customer_phone: initialData.customer_phone || '',
    booking_date: initialData.booking_date || '',
    booking_time: initialData.booking_time || '',
    duration: initialData.duration || 60,
    recurrence_pattern: initialData.recurrence_pattern || {
      frequency: 'weekly',
      interval: 1,
      daysOfWeek: [],
      endDate: ''
    },
    recurrence_end_date: initialData.recurrence_end_date || ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'Customer name is required';
    }
    if (!formData.customer_email.trim()) {
      newErrors.customer_email = 'Customer email is required';
    }
    if (!formData.booking_date) {
      newErrors.booking_date = 'Booking date is required';
    }
    if (!formData.booking_time) {
      newErrors.booking_time = 'Booking time is required';
    }
    if (formData.recurrence_pattern.frequency === 'weekly' && formData.recurrence_pattern.daysOfWeek?.length === 0) {
      newErrors.daysOfWeek = 'Please select at least one day for weekly recurrence';
    }
    if (!formData.recurrence_end_date) {
      newErrors.recurrence_end_date = 'End date is required for recurring bookings';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const handleRecurrenceChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      recurrence_pattern: {
        ...formData.recurrence_pattern,
        [field]: value
      }
    });
  };

  const handleDayToggle = (day: number) => {
    const currentDays = formData.recurrence_pattern.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    
    handleRecurrenceChange('daysOfWeek', newDays);
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border border-gray-700 w-full max-w-2xl shadow-lg rounded-md bg-gray-800">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-white mb-4">
            Create Recurring Booking
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white">Customer Name *</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className={`mt-1 block w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white ${
                    errors.customer_name ? 'border-red-300' : ''
                  }`}
                />
                {errors.customer_name && (
                  <p className="mt-1 text-sm text-red-400">{errors.customer_name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white">Customer Email *</label>
                <input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  className={`mt-1 block w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white ${
                    errors.customer_email ? 'border-red-300' : ''
                  }`}
                />
                {errors.customer_email && (
                  <p className="mt-1 text-sm text-red-400">{errors.customer_email}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white">Customer Phone</label>
              <input
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                className="mt-1 block w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white">Start Date *</label>
                <input
                  type="date"
                  value={formData.booking_date}
                  onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                  className={`mt-1 block w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white ${
                    errors.booking_date ? 'border-red-300' : ''
                  }`}
                />
                {errors.booking_date && (
                  <p className="mt-1 text-sm text-red-400">{errors.booking_date}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white">Time *</label>
                <input
                  type="time"
                  value={formData.booking_time}
                  onChange={(e) => setFormData({ ...formData, booking_time: e.target.value })}
                  className={`mt-1 block w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white ${
                    errors.booking_time ? 'border-red-300' : ''
                  }`}
                />
                {errors.booking_time && (
                  <p className="mt-1 text-sm text-red-400">{errors.booking_time}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white">Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                  className="mt-1 block w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white"
                />
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-md font-medium text-white mb-3">Recurrence Pattern</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white">Frequency</label>
                  <select
                    value={formData.recurrence_pattern.frequency}
                    onChange={(e) => handleRecurrenceChange('frequency', e.target.value)}
                    className="mt-1 block w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white">Repeat Every</label>
                  <div className="flex items-center mt-1">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={formData.recurrence_pattern.interval}
                      onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value) || 1)}
                      className="block w-20 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white"
                    />
                    <span className="ml-2 text-sm text-gray-300">
                      {formData.recurrence_pattern.frequency === 'daily' ? 'day(s)' :
                       formData.recurrence_pattern.frequency === 'weekly' ? 'week(s)' : 'month(s)'}
                    </span>
                  </div>
                </div>
              </div>

              {formData.recurrence_pattern.frequency === 'weekly' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-white mb-2">Days of Week</label>
                  <div className="grid grid-cols-7 gap-2">
                    {dayNames.map((day, index) => (
                      <label key={index} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.recurrence_pattern.daysOfWeek?.includes(index) || false}
                          onChange={() => handleDayToggle(index)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                        />
                        <span className="ml-2 text-sm text-white">{day.slice(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                  {errors.daysOfWeek && (
                    <p className="mt-1 text-sm text-red-400">{errors.daysOfWeek}</p>
                  )}
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium text-white">End Date *</label>
                <input
                  type="date"
                  value={formData.recurrence_end_date}
                  onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                  className={`mt-1 block w-full border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white ${
                    errors.recurrence_end_date ? 'border-red-300' : ''
                  }`}
                />
                {errors.recurrence_end_date && (
                  <p className="mt-1 text-sm text-red-400">{errors.recurrence_end_date}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Recurring Booking
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecurringBookingForm;
