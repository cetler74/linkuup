import React, { useState, useEffect } from 'react';
import { X, Save, Clock } from 'lucide-react';
import { managerAPI } from '../../utils/api';

interface OpeningHoursFormProps {
  salon: any;
  onClose: () => void;
  onSuccess: () => void;
}

const DAYS = [
  { id: 0, name: 'Monday' },
  { id: 1, name: 'Tuesday' },
  { id: 2, name: 'Wednesday' },
  { id: 3, name: 'Thursday' },
  { id: 4, name: 'Friday' },
  { id: 5, name: 'Saturday' },
  { id: 6, name: 'Sunday' }
];

const OpeningHoursForm: React.FC<OpeningHoursFormProps> = ({ salon, onClose, onSuccess }) => {
  const [openingHours, setOpeningHours] = useState<{[key: number]: {is_open: boolean, start_time: string, end_time: string}}>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formKey, setFormKey] = useState(0); // Force re-render

  useEffect(() => {
    if (salon) {
      loadOpeningHours();
    }
  }, [salon]);


  const loadOpeningHours = async () => {
    try {
      const response = await managerAPI.getOpeningHours(salon.id);
      setOpeningHours(response.opening_hours);
    } catch (error) {
      console.error('Failed to load opening hours:', error);
      // Initialize with default values
      const defaultHours: {[key: number]: {is_open: boolean, start_time: string, end_time: string}} = {};
      DAYS.forEach(day => {
        defaultHours[day.id] = {
          is_open: day.id < 5, // Monday to Friday open by default
          start_time: day.id < 5 ? '09:00' : day.id === 5 ? '10:00' : '09:00',
          end_time: day.id < 5 ? '18:00' : day.id === 5 ? '16:00' : '18:00'
        };
      });
      setOpeningHours(defaultHours);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await managerAPI.updateOpeningHours(salon.id, openingHours);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to save opening hours:', error);
      setError(error.response?.data?.error || 'Failed to update opening hours');
    } finally {
      setLoading(false);
    }
  };

  const handleDayChange = (dayId: number, field: string, value: any) => {
    setOpeningHours(prev => {
      const currentDay = prev[dayId] || { is_open: false, start_time: '09:00', end_time: '18:00' };
      return {
        ...prev,
        [dayId]: {
          ...currentDay,
          [field]: value
        }
      };
    });
  };

  const toggleDay = (dayId: number) => {
    const currentDay = openingHours[dayId] || { is_open: false, start_time: '09:00', end_time: '18:00' };
    const newIsOpen = !currentDay.is_open;
    
    if (newIsOpen) {
      // When opening a day, set default times if they don't exist
      const defaultStartTime = currentDay.start_time || '09:00';
      const defaultEndTime = currentDay.end_time || '18:00';
      
      setOpeningHours(prev => ({
        ...prev,
        [dayId]: {
          is_open: true,
          start_time: defaultStartTime,
          end_time: defaultEndTime
        }
      }));
    } else {
      // When closing a day, set times to null
      setOpeningHours(prev => ({
        ...prev,
        [dayId]: {
          is_open: false,
          start_time: null,
          end_time: null
        }
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div key={`opening-hours-form-${salon.id}-${formKey}`} className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Edit Opening Hours
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}


        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {DAYS.map(day => (
              <div key={day.id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                <div className="w-24">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={openingHours[day.id]?.is_open || false}
                      onChange={() => toggleDay(day.id)}
                      className="mr-2 h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">{day.name}</span>
                  </label>
                </div>

                {openingHours[day.id]?.is_open ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="time"
                      value={openingHours[day.id]?.start_time || '09:00'}
                      onChange={(e) => handleDayChange(day.id, 'start_time', e.target.value)}
                      className="px-3 py-1 w-32 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm text-gray-900"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={openingHours[day.id]?.end_time || '18:00'}
                      onChange={(e) => handleDayChange(day.id, 'end_time', e.target.value)}
                      className="px-3 py-1 w-32 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm text-gray-900"
                    />
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">Closed</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all duration-200 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Hours
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpeningHoursForm;
