import React, { useState } from 'react';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Service {
  id: number;
  name: string;
  price?: number;
  duration?: number;
}

interface RecurringBookingFormProps {
  onSubmit: (data: RecurringBookingData) => void;
  onCancel: () => void;
  initialData?: Partial<RecurringBookingData>;
  services?: Service[];
}

interface RecurringBookingData {
  business_id: number;
  service_ids: number[];
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
  initialData = {},
  services = []
}) => {
  const [formData, setFormData] = useState<RecurringBookingData>({
    business_id: initialData.business_id || 0,
    service_ids: initialData.service_ids || (initialData.service_id ? [initialData.service_id] : []),
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

  const handleServiceToggle = (serviceId: number) => {
    setFormData(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId]
    }));
  };

  const calculateTotalDuration = () => {
    return formData.service_ids.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.duration || 0);
    }, 0);
  };

  const calculateTotalPrice = () => {
    return formData.service_ids.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'Customer name is required';
    }
    if (!formData.customer_email.trim()) {
      newErrors.customer_email = 'Customer email is required';
    }
    if (formData.service_ids.length === 0) {
      newErrors.service_ids = 'Please select at least one service';
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

    // Calculate duration from selected services if not manually set
    const finalData = {
      ...formData,
      duration: calculateTotalDuration() || formData.duration || 60
    };

    onSubmit(finalData);
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
    <div className="fixed inset-0 bg-[#333333] bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border border-[#E0E0E0] w-full max-w-2xl shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-[#333333] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Create Recurring Booking
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Customer Name *</Label>
                <Input
                  id="customer_name"
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Enter customer name"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                  className={errors.customer_name ? 'border-red-300' : ''}
                />
                {errors.customer_name && (
                  <p className="mt-1 text-sm text-red-500" style={{ fontFamily: 'Open Sans, sans-serif' }}>{errors.customer_name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="customer_email" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Customer Email *</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  placeholder="Enter email address"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                  className={errors.customer_email ? 'border-red-300' : ''}
                />
                {errors.customer_email && (
                  <p className="mt-1 text-sm text-red-500" style={{ fontFamily: 'Open Sans, sans-serif' }}>{errors.customer_email}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="customer_phone" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Customer Phone</Label>
              <Input
                id="customer_phone"
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                placeholder="Enter phone number"
                style={{ fontFamily: 'Open Sans, sans-serif' }}
              />
            </div>

            <div>
              <Label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Open Sans, sans-serif' }}>Services *</Label>
              <div className="max-h-48 overflow-y-auto border border-[#E0E0E0] rounded-lg p-2 bg-[#F5F5F5]">
                {services.length === 0 ? (
                  <p className="text-[#9E9E9E] text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>No services available for this place</p>
                ) : (
                  <div className="space-y-2">
                    {services.map((service: Service) => (
                      <label key={service.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.service_ids.includes(service.id)}
                          onChange={() => handleServiceToggle(service.id)}
                          className="rounded border-[#E0E0E0] text-[#1E90FF] focus:ring-[#1E90FF] focus:ring-2"
                        />
                        <span className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          {service.name} - €{service.price || 0} ({service.duration || 0}min)
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {formData.service_ids.length > 0 && (
                <div className="mt-3 p-3 bg-[#F5F5F5] rounded-lg border border-[#E0E0E0]">
                  <div className="flex justify-between items-center">
                    <span className="text-[#333333] font-medium" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                      {formData.service_ids.length} service{formData.service_ids.length > 1 ? 's' : ''} selected
                    </span>
                    <div className="text-right">
                      <div className="text-[#A3D55D] font-semibold" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                        Total: €{calculateTotalPrice().toFixed(2)}
                      </div>
                      <div className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                        {calculateTotalDuration()} minutes
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {errors.service_ids && (
                <p className="mt-1 text-sm text-red-500" style={{ fontFamily: 'Open Sans, sans-serif' }}>{errors.service_ids}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="booking_date" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Start Date *</Label>
                <Input
                  id="booking_date"
                  type="date"
                  value={formData.booking_date}
                  onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                  className={errors.booking_date ? 'border-red-300' : ''}
                />
                {errors.booking_date && (
                  <p className="mt-1 text-sm text-red-500" style={{ fontFamily: 'Open Sans, sans-serif' }}>{errors.booking_date}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="booking_time" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Time *</Label>
                <Input
                  id="booking_time"
                  type="time"
                  value={formData.booking_time}
                  onChange={(e) => setFormData({ ...formData, booking_time: e.target.value })}
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                  className={`w-full sm:w-32 ${errors.booking_time ? 'border-red-300' : ''}`}
                />
                {errors.booking_time && (
                  <p className="mt-1 text-sm text-red-500" style={{ fontFamily: 'Open Sans, sans-serif' }}>{errors.booking_time}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="duration" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                />
              </div>
            </div>

            <div className="border-t border-[#E0E0E0] pt-4">
              <h4 className="text-md font-medium text-[#333333] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Recurrence Pattern</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Frequency</Label>
                  <Select
                    value={formData.recurrence_pattern.frequency}
                    onValueChange={(value) => handleRecurrenceChange('frequency', value)}
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="interval" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Repeat Every</Label>
                  <div className="flex items-center mt-1">
                    <Input
                      id="interval"
                      type="number"
                      min="1"
                      max="12"
                      value={formData.recurrence_pattern.interval}
                      onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value) || 1)}
                      className="block w-20"
                      style={{ fontFamily: 'Open Sans, sans-serif' }}
                    />
                    <span className="ml-2 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                      {formData.recurrence_pattern.frequency === 'daily' ? 'day(s)' :
                       formData.recurrence_pattern.frequency === 'weekly' ? 'week(s)' : 'month(s)'}
                    </span>
                  </div>
                </div>
              </div>

              {formData.recurrence_pattern.frequency === 'weekly' && (
                <div className="mt-4">
                  <Label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Open Sans, sans-serif' }}>Days of Week</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {dayNames.map((day, index) => (
                      <label key={index} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.recurrence_pattern.daysOfWeek?.includes(index) || false}
                          onChange={() => handleDayToggle(index)}
                          className="h-4 w-4 rounded border-[#E0E0E0] text-[#1E90FF] focus:ring-[#1E90FF] focus:ring-2"
                        />
                        <span className="ml-2 text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{day.slice(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                  {errors.daysOfWeek && (
                    <p className="mt-1 text-sm text-red-500" style={{ fontFamily: 'Open Sans, sans-serif' }}>{errors.daysOfWeek}</p>
                  )}
                </div>
              )}

              <div className="mt-4">
                <Label htmlFor="recurrence_end_date" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>End Date *</Label>
                <Input
                  id="recurrence_end_date"
                  type="date"
                  value={formData.recurrence_end_date}
                  onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                  className={errors.recurrence_end_date ? 'border-red-300' : ''}
                />
                {errors.recurrence_end_date && (
                  <p className="mt-1 text-sm text-red-500" style={{ fontFamily: 'Open Sans, sans-serif' }}>{errors.recurrence_end_date}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-[#333333] bg-white border border-[#E0E0E0] rounded-lg shadow-sm hover:bg-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E90FF]"
                style={{ fontFamily: 'Open Sans, sans-serif' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-[#1E90FF] border border-transparent rounded-lg shadow-sm hover:bg-[#1877D2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E90FF]"
                style={{ fontFamily: 'Open Sans, sans-serif' }}
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
