import React from 'react';
import { CalendarIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';
import moment from 'moment';

interface Booking {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    employeeId?: number;
    employeeName?: string;
    employeePhotoUrl?: string;
    employeeColorCode?: string;
    serviceId?: number;
    serviceName?: string;
    customerName: string;
    customerEmail: string;
    status: string;
    color?: string;
    campaignId?: number;
    campaignName?: string;
    campaignBannerMessage?: string;
    campaignType?: string;
    campaignDiscountValue?: number;
    campaignDiscountType?: string;
  };
}

interface AgendaTableProps {
  bookings: Booking[];
}

const AgendaTable: React.FC<AgendaTableProps> = ({ bookings }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#A3D55D'; // Lime Green
      case 'pending':
        return '#FFD43B'; // Soft Yellow
      case 'cancelled':
        return '#FF5A5F'; // Coral Red
      case 'completed':
        return '#9E9E9E'; // Medium Gray
      default:
        return '#1E90FF'; // Bright Blue
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-lime-green bg-opacity-20 text-lime-green';
      case 'pending':
        return 'bg-soft-yellow bg-opacity-20 text-soft-yellow';
      case 'cancelled':
        return 'bg-coral-red bg-opacity-20 text-coral-red';
      case 'completed':
        return 'bg-medium-gray bg-opacity-20 text-medium-gray';
      default:
        return 'bg-bright-blue bg-opacity-20 text-bright-blue';
    }
  };

  // Group bookings by date
  const groupedBookings = bookings.reduce((acc, booking) => {
    const dateKey = moment(booking.start).format('YYYY-MM-DD');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(booking);
    return acc;
  }, {} as Record<string, Booking[]>);

  // Sort dates
  const sortedDates = Object.keys(groupedBookings).sort();

  return (
    <div className="card">
      <div className="px-4 py-3 bg-light-gray border-b border-medium-gray">
        <h3 className="text-lg font-medium text-charcoal font-body font-display">Booking Agenda</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">
                Event
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedDates.map((dateKey) => {
              const dayBookings = groupedBookings[dateKey];
              return dayBookings.map((booking, index) => (
                <tr key={`${booking.id}-${index}`} className="hover:bg-gray-50">
                  {/* Date Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index === 0 && (
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="font-semibold">
                          {moment(booking.start).format('ddd MMM DD')}
                        </span>
                      </div>
                    )}
                  </td>
                  
                  {/* Time Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span>
                        {moment(booking.start).format('h:mm A')} – {moment(booking.end).format('h:mm A')}
                      </span>
                    </div>
                  </td>
                  
                  {/* Event Column */}
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center space-x-3">
                      {/* Status Indicator */}
                      <div className="flex-shrink-0">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: getStatusColor(booking.resource?.status || 'pending') }}
                        />
                      </div>
                      
                      {/* Customer Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {booking.resource?.customerName || booking.title}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(booking.resource?.status || 'pending')}`}>
                            {booking.resource?.status || 'pending'}
                          </span>
                        </div>
                        
                        {/* Service and Employee Info */}
                        <div className="mt-1 text-sm text-gray-500">
                          {booking.resource?.serviceName && (
                            <div className="flex items-center space-x-1">
                              <span>Service:</span>
                              <span className="font-medium text-bright-blue">{booking.resource.serviceName}</span>
                            </div>
                          )}
                          {booking.resource?.employeeName && (
                            <div className="flex items-center space-x-1">
                              <span>Employee:</span>
                              <span className="font-medium text-lime-green">{booking.resource.employeeName}</span>
                            </div>
                          )}
                          {booking.resource?.customerEmail && (
                            <div className="flex items-center space-x-1">
                              <span>Email:</span>
                              <span className="text-gray-600">{booking.resource.customerEmail}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Campaign Information */}
                        {booking.resource?.campaignName && (
                          <div className="mt-2 p-2 bg-orange-50 border-l-4 border-orange-400 rounded">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-orange-800">Campaign:</span>
                              <span className="text-sm font-semibold text-orange-900">{booking.resource.campaignName}</span>
                            </div>
                            {booking.resource.campaignBannerMessage && (
                              <div className="text-xs text-orange-700 mt-1">
                                {booking.resource.campaignBannerMessage}
                              </div>
                            )}
                            {booking.resource.campaignDiscountValue && (
                              <div className="text-xs text-orange-600 mt-1">
                                Discount: {booking.resource.campaignDiscountValue}{booking.resource.campaignDiscountType === 'percentage' ? '%' : '€'} off
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
        
        {bookings.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new booking.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgendaTable;
