import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { managerAPI } from '../../utils/api';

interface OpeningHoursDisplayProps {
  salon: any;
  onEdit: () => void;
  refreshTrigger?: number; // Add this to trigger refresh
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

const OpeningHoursDisplay: React.FC<OpeningHoursDisplayProps> = ({ salon, onEdit, refreshTrigger }) => {
  const [openingHours, setOpeningHours] = useState<{[key: number]: {is_open: boolean, start_time: string, end_time: string}}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (salon) {
      loadOpeningHours();
    }
  }, [salon, refreshTrigger]);

  const loadOpeningHours = async () => {
    try {
      setLoading(true);
      const response = await managerAPI.getOpeningHours(salon.id);
      setOpeningHours(response.opening_hours);
    } catch (error) {
      console.error('Failed to load opening hours:', error);
      setError('Failed to load opening hours');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    return timeStr;
  };

  const getDayHours = (dayId: number) => {
    const dayHours = openingHours[dayId];
    if (!dayHours || !dayHours.is_open) {
      return 'Closed';
    }
    return `${formatTime(dayHours.start_time)} - ${formatTime(dayHours.end_time)}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Opening Hours</h2>
            <button
              onClick={onEdit}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Clock className="h-4 w-4 mr-2" />
              Edit Hours
            </button>
          </div>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Opening Hours</h2>
            <button
              onClick={onEdit}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Clock className="h-4 w-4 mr-2" />
              Edit Hours
            </button>
          </div>
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={loadOpeningHours}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Opening Hours</h2>
          <button
            onClick={onEdit}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Clock className="h-4 w-4 mr-2" />
            Edit Hours
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="text-sm text-gray-300 mb-4">
            Configure your salon's opening hours for each day of the week. These hours will determine when customers can book appointments.
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DAYS.map(day => (
              <div key={day.id} className="flex items-center justify-between p-3 border border-gray-600 rounded-lg bg-gray-700">
                <span className="font-medium text-white">{day.name}</span>
                <span className={`text-sm ${openingHours[day.id]?.is_open ? 'text-white' : 'text-gray-400'}`}>
                  {getDayHours(day.id)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpeningHoursDisplay;
