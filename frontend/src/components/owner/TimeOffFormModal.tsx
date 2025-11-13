import React, { useState, useEffect } from 'react';
import { XMarkIcon, CalendarIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';
import type { EmployeeTimeOff, TimeOffCreate, TimeOffUpdate } from '../../types/timeOff';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeOffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TimeOffCreate | TimeOffUpdate) => void;
  employees: Array<{ id: number; name: string; email: string }>;
  editingTimeOff?: EmployeeTimeOff | null;
  selectedDate?: Date;
  selectedEmployeeId?: number;
}

const TimeOffFormModal: React.FC<TimeOffFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  employees,
  editingTimeOff,
  selectedDate,
  selectedEmployeeId
}) => {
  const [formData, setFormData] = useState({
    employee_id: selectedEmployeeId || (editingTimeOff?.employee_id || 0),
    business_id: editingTimeOff?.business_id || 0,
    time_off_type: editingTimeOff?.time_off_type || 'holiday',
    start_date: editingTimeOff?.start_date || (selectedDate?.toISOString().split('T')[0] || ''),
    end_date: editingTimeOff?.end_date || (selectedDate?.toISOString().split('T')[0] || ''),
    is_full_day: editingTimeOff?.is_full_day ?? true,
    half_day_period: editingTimeOff?.half_day_period || 'AM',
    is_recurring: editingTimeOff?.is_recurring || false,
    recurrence_pattern: editingTimeOff?.recurrence_pattern || null,
    notes: editingTimeOff?.notes || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedEmployeeLabel = React.useMemo(() => {
    const found = employees.find(e => e.id === formData.employee_id);
    return found ? found.name : 'Select an employee';
  }, [employees, formData.employee_id]);

  useEffect(() => {
    if (editingTimeOff) {
      setFormData({
        employee_id: editingTimeOff.employee_id,
        business_id: editingTimeOff.business_id,
        time_off_type: editingTimeOff.time_off_type,
        start_date: editingTimeOff.start_date,
        end_date: editingTimeOff.end_date,
        is_full_day: editingTimeOff.is_full_day,
        half_day_period: editingTimeOff.half_day_period || 'AM',
        is_recurring: editingTimeOff.is_recurring,
        recurrence_pattern: editingTimeOff.recurrence_pattern,
        notes: editingTimeOff.notes || ''
      });
    } else if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        start_date: dateStr,
        end_date: dateStr
      }));
    }
  }, [editingTimeOff, selectedDate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_id) {
      newErrors.employee_id = 'Please select an employee';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = 'End date must be after start date';
    }

    if (!formData.is_full_day && !formData.half_day_period) {
      newErrors.half_day_period = 'Please select AM or PM for half-day time-off';
    }

    if (formData.is_recurring && !formData.recurrence_pattern) {
      newErrors.recurrence_pattern = 'Recurrence pattern is required for recurring time-off';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = editingTimeOff 
      ? { ...formData } as TimeOffUpdate
      : { ...formData } as TimeOffCreate;

    onSubmit(submitData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const timeOffTypes = [
    { value: 'holiday', label: 'Holiday', color: 'bg-green-600' },
    { value: 'sick_leave', label: 'Sick Leave', color: 'bg-red-600' },
    { value: 'personal_day', label: 'Personal Day', color: 'bg-blue-600' },
    { value: 'vacation', label: 'Vacation', color: 'bg-purple-600' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-medium-gray shadow-form">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-charcoal font-display">
              {editingTimeOff ? 'Edit Time-off' : 'Add Time-off'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-charcoal/60 hover:text-charcoal transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Selection */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2 font-body">
                <UserIcon className="h-4 w-4 inline mr-2" />
                Employee
              </label>
              <Select
                value={formData.employee_id?.toString() || '0'}
                onValueChange={(value) => handleInputChange('employee_id', parseInt(value))}
                disabled={!!editingTimeOff}
              >
                <SelectTrigger className={`input-field text-sm whitespace-nowrap min-w-max max-w-full ${errors.employee_id ? 'border-coral-red' : ''}`}>
                  <span className="truncate">{selectedEmployeeLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">
                    Select an employee
                  </SelectItem>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.employee_id && (
                <p className="mt-1 text-sm text-coral-red">{errors.employee_id}</p>
              )}
            </div>

            {/* Time-off Type */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-3 font-body">
                Time-off Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {timeOffTypes.map(type => (
                  <label
                    key={type.value}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors bg-white ${
                      formData.time_off_type === type.value
                        ? 'border-bright-blue'
                        : 'border-medium-gray hover:bg-light-gray'
                    }`}
                  >
                    <input
                      type="radio"
                      name="time_off_type"
                      value={type.value}
                      checked={formData.time_off_type === type.value}
                      onChange={(e) => handleInputChange('time_off_type', e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-3 h-3 rounded-full ${type.color} mr-3`}></div>
                    <span className="text-charcoal text-sm font-medium font-body">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2 font-body">
                  <CalendarIcon className="h-4 w-4 inline mr-2" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className={`input-field w-full ${errors.start_date ? 'border-coral-red' : ''}`}
                />
                {errors.start_date && (
                  <p className="mt-1 text-sm text-coral-red">{errors.start_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-2 font-body">
                  <CalendarIcon className="h-4 w-4 inline mr-2" />
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className={`input-field w-full ${errors.end_date ? 'border-coral-red' : ''}`}
                />
                {errors.end_date && (
                  <p className="mt-1 text-sm text-coral-red">{errors.end_date}</p>
                )}
              </div>
            </div>

            {/* Full Day / Half Day */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-3 font-body">
                <ClockIcon className="h-4 w-4 inline mr-2" />
                Duration
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="duration"
                    checked={formData.is_full_day}
                    onChange={() => handleInputChange('is_full_day', true)}
                    className="mr-3"
                  />
                  <span className="text-charcoal">Full Day</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="duration"
                    checked={!formData.is_full_day}
                    onChange={() => handleInputChange('is_full_day', false)}
                    className="mr-3"
                  />
                  <span className="text-charcoal">Half Day</span>
                </label>

                {!formData.is_full_day && (
                  <div className="ml-6">
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="half_day_period"
                          value="AM"
                          checked={formData.half_day_period === 'AM'}
                          onChange={(e) => handleInputChange('half_day_period', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-charcoal">Morning (AM)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="half_day_period"
                          value="PM"
                          checked={formData.half_day_period === 'PM'}
                          onChange={(e) => handleInputChange('half_day_period', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-charcoal">Afternoon (PM)</span>
                      </label>
                    </div>
                    {errors.half_day_period && (
                      <p className="mt-1 text-sm text-coral-red">{errors.half_day_period}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Recurring */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) => handleInputChange('is_recurring', e.target.checked)}
                  className="mr-3"
                />
                <span className="text-charcoal">Recurring (Yearly)</span>
              </label>
              
              {formData.is_recurring && (
                <div className="mt-3 ml-6 p-4 bg-light-gray rounded-lg border border-medium-gray">
                  <p className="text-sm text-charcoal mb-3">
                    This time-off will repeat every year on the same date.
                  </p>
                  <div className="text-xs text-charcoal/60">
                    Example: Christmas Day will automatically be added every December 25th.
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2 font-body">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="input-field w-full"
                placeholder="Add any additional notes about this time-off..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-medium-gray">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-medium-gray text-charcoal rounded-lg hover:bg-light-gray transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                {editingTimeOff ? 'Update Time-off' : 'Add Time-off'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TimeOffFormModal;
