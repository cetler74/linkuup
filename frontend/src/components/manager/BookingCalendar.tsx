import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, getDay } from 'date-fns';

interface Booking {
  id: number;
  customer_name: string;
  booking_date: string;
  booking_time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  service?: {
    name: string;
  };
}

interface BookingCalendarProps {
  bookings: Booking[];
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
}

type ViewMode = 'month' | 'week' | 'day';

const BookingCalendar: React.FC<BookingCalendarProps> = ({ 
  bookings, 
  onDateSelect, 
  selectedDate 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const grouped: { [key: string]: Booking[] } = {};
    bookings.forEach(booking => {
      const date = booking.booking_date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(booking);
    });
    return grouped;
  }, [bookings]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Helper function to calculate end time
  const getTimeRange = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    return `${startTime} - ${endTime}`;
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayBookings = bookingsByDate[dateStr] || [];
        
        days.push(
          <div
            key={day.toString()}
            className={`min-h-[120px] border border-gray-200 p-2 ${
              !isSameMonth(day, monthStart) ? 'bg-gray-50 text-gray-400' : 'bg-white'
            } ${isToday(day) ? 'bg-gray-50' : ''} ${
              selectedDate && isSameDay(day, selectedDate) ? 'ring-2 ring-gray-900' : ''
            }`}
            onClick={() => onDateSelect?.(day)}
          >
            <div className="flex justify-between items-center mb-1">
              <span className={`text-sm font-medium ${
                isToday(day) ? 'text-gray-900' : ''
              }`}>
                {format(day, 'd')}
              </span>
              {dayBookings.length > 0 && (
                <span className="text-xs bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded-full">
                  {dayBookings.length}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {dayBookings.slice(0, 3).map((booking) => (
                <div
                  key={booking.id}
                  className={`text-xs p-1 rounded border ${getStatusColor(booking.status)}`}
                  title={`${booking.customer_name} - ${getTimeRange(booking.booking_time, booking.duration)} - ${booking.status}`}
                >
                  <div className="font-medium truncate">{booking.customer_name}</div>
                  <div className="text-xs opacity-75">{getTimeRange(booking.booking_time, booking.duration)}</div>
                </div>
              ))}
              {dayBookings.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{dayBookings.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="space-y-1">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        {rows}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const days = [];
    let day = weekStart;

    while (day <= weekEnd) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayBookings = bookingsByDate[dateStr] || [];
      
      days.push(
        <div
          key={day.toString()}
          className={`flex-1 border border-gray-200 p-3 ${
            isToday(day) ? 'bg-gray-50' : 'bg-white'
          } ${selectedDate && isSameDay(day, selectedDate) ? 'ring-2 ring-gray-900' : ''}`}
          onClick={() => onDateSelect?.(day)}
        >
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className={`text-sm font-medium ${
                isToday(day) ? 'text-gray-900' : ''
              }`}>
                {format(day, 'EEE, MMM d')}
              </div>
            </div>
            {dayBookings.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {dayBookings.map((booking) => (
              <div
                key={booking.id}
                className={`p-2 rounded border ${getStatusColor(booking.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3" />
                    <span className="text-sm font-medium">{getTimeRange(booking.booking_time, booking.duration)}</span>
                  </div>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-white bg-opacity-50">
                    {booking.status}
                  </span>
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  <User className="h-3 w-3" />
                  <span className="text-sm">{booking.customer_name}</span>
                </div>
                {booking.service && (
                  <div className="text-xs text-gray-600 mt-1">
                    {booking.service.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }

    return (
      <div className="flex space-x-1">
        {days}
      </div>
    );
  };

  const renderDayView = () => {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const dayBookings = bookingsByDate[dateStr] || [];

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {format(currentDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          {dayBookings.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''} scheduled
            </p>
          )}
        </div>
        
        {dayBookings.length > 0 ? (
          <div className="space-y-3">
            {dayBookings
              .sort((a, b) => a.booking_time.localeCompare(b.booking_time))
              .map((booking) => (
                <div
                  key={booking.id}
                  className={`p-4 rounded-lg border ${getStatusColor(booking.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{getTimeRange(booking.booking_time, booking.duration)}</span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50 font-medium">
                      {booking.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{booking.customer_name}</span>
                  </div>
                  {booking.service && (
                    <div className="text-sm text-gray-600 mt-1">
                      Service: {booking.service.name}
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No bookings scheduled for this day</p>
          </div>
        )}
      </div>
    );
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(direction === 'prev' ? addDays(currentDate, -7) : addDays(currentDate, 7));
    } else {
      setCurrentDate(direction === 'prev' ? addDays(currentDate, -1) : addDays(currentDate, 1));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">Booking Calendar</h2>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="mt-2">
          <h3 className="text-xl font-bold text-gray-900">
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
            {viewMode === 'week' && `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`}
            {viewMode === 'day' && format(currentDate, 'MMMM d, yyyy')}
          </h3>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="p-4">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </div>
    </div>
  );
};

export default BookingCalendar;
