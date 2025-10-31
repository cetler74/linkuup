import React, { useState, useCallback } from 'react';
import { Calendar, momentLocalizer, Views, type View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'; // Import drag and drop styles
import { UserIcon, ClockIcon, CalendarIcon } from '@heroicons/react/24/outline';

const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop<Booking, object>(Calendar); // Specify Booking type

// Custom Event Component for status display
const CustomEventComponent = ({ event, onSelectEvent }: any) => {
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

  const handleClick = (e: React.MouseEvent) => {
    // Do not stop propagation here to allow react-big-calendar's drag functionality to work
    console.log('Custom event component clicked:', event.title, 'Event:', e);
    if (onSelectEvent) {
      onSelectEvent(event);
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseDown={handleClick}
      style={{
        height: '100%',
        width: '100%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '2px 4px',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1
      }}
      data-booking-id={event.id}
    >
      {/* Status Ball */}
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(event.resource?.status || 'pending'),
          flexShrink: 0,
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}
        title={`Status: ${event.resource?.status || 'pending'}`}
      />
      {/* Event Title */}
      <span style={{
        fontSize: '12px',
        fontWeight: '500',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1
      }}>
        {event.title}
      </span>
    </div>
  );
};

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
    // Campaign fields
    campaignId?: number;
    campaignName?: string;
    campaignBannerMessage?: string;
    campaignType?: string;
    campaignDiscountValue?: number;
    campaignDiscountType?: string;
  };
}

interface DraggableCalendarProps {
  bookings: Booking[];
  onEventDrop?: (event: Booking, start: Date, end: Date) => void;
  onEventResize?: (event: Booking, start: Date, end: Date) => void;
  onSelectEvent?: (event: Booking) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date; slots: Date[] }) => void;
  onBookingStatusChange?: (bookingId: number, status: string) => void;
  employees?: Array<{ id: number; name: string }>;
  services?: Array<{ id: number; name: string }>;
  defaultView?: View; // Use View type here
  height?: number;
}

const DraggableCalendar: React.FC<DraggableCalendarProps> = ({
  bookings,
  onEventDrop,
  onEventResize,
  onSelectEvent,
  onSelectSlot,
  onBookingStatusChange,
  employees = [],
  services = [],
  defaultView = Views.MONTH,
  height = 600
}) => {
  // Use employees and services for future enhancements
  const [view, setView] = useState<View>(defaultView as View);
  const [date, setDate] = useState(new Date());
  const [hoveredEvent, setHoveredEvent] = useState<Booking | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  // Add global mouse move listener for tooltip positioning
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (hoveredEvent) {
        setTooltipPosition({
          x: e.clientX + 15,
          y: e.clientY - 10
        });
      }
    };

    if (hoveredEvent) {
      document.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [hoveredEvent]);

  // Add event delegation for hover detection
  React.useEffect(() => {
    const handleMouseOver = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      const target = mouseEvent.target as HTMLElement;

      console.log('Mouse over detected on:', target.className, target.tagName);

      // Look for booking elements with data-booking-id attribute
      const bookingElement = target.closest('[data-booking-id]') as HTMLElement;

      if (bookingElement) {
        console.log('Found booking element:', bookingElement);
        const bookingId = parseInt(bookingElement.getAttribute('data-booking-id') || '0');
        const booking = bookings.find(b => b.id === bookingId);

        if (booking) {
          console.log('Hovering over booking:', booking.title);
          // Clear any existing timeout
          if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            setHoverTimeout(null);
          }
          setHoveredEvent(booking);
          setTooltipPosition({
            x: mouseEvent.clientX + 15,
            y: mouseEvent.clientY - 10
          });
        }
      }
    };

    const handleMouseOut = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      const target = mouseEvent.target as HTMLElement;
      const bookingElement = target.closest('[data-booking-id]') as HTMLElement;

      if (bookingElement) {
        // Check if we're moving to another booking element or the tooltip
        const relatedTarget = mouseEvent.relatedTarget as HTMLElement;
        const isMovingToAnotherBooking = relatedTarget?.closest('[data-booking-id]');
        const isMovingToTooltip = relatedTarget?.closest('.booking-tooltip');

        if (!isMovingToAnotherBooking && !isMovingToTooltip) {
          // Add a small delay before hiding the tooltip
          const timeout = setTimeout(() => {
            setHoveredEvent(null);
          }, 300);
          setHoverTimeout(timeout);
        }
      }
    };

    // Use document-level event delegation for better coverage
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    // Add a global mouse leave handler for the calendar area
    const handleGlobalMouseLeave = () => {
      console.log('Global mouse leave - hiding tooltip');
      const timeout = setTimeout(() => {
        setHoveredEvent(null);
      }, 200);
      setHoverTimeout(timeout);
    };

    const calendarContainer = document.querySelector('.rbc-calendar');
    if (calendarContainer) {
      calendarContainer.addEventListener('mouseleave', handleGlobalMouseLeave);
    }

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      if (calendarContainer) {
        calendarContainer.removeEventListener('mouseleave', handleGlobalMouseLeave);
      }
    };
  }, [bookings, hoverTimeout]);

  const handleEventDrop = useCallback(({ event, start, end }: { event: Booking; start: string | Date; end: string | Date }) => {
    if (onEventDrop) {
      onEventDrop(event, new Date(start), new Date(end));
    }
  }, [onEventDrop]);

  const handleEventResize = useCallback(({ event, start, end }: { event: Booking; start: string | Date; end: string | Date }) => {
    if (onEventResize) {
      onEventResize(event, new Date(start), new Date(end));
    }
  }, [onEventResize]);

  const eventStyleGetter = (event: Booking) => {
    const color = event.resource?.color || '#1E90FF';
    const backgroundColor = color;
    const borderColor = color;

    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white',
        borderRadius: '6px',
        opacity: 0.9,
        border: 'none',
        display: 'flex',
        cursor: 'pointer',
        transition: 'opacity 0.2s ease',
        minHeight: '20px',
        padding: '2px 4px',
        position: 'relative',
        zIndex: 1,
        width: '100%',
        height: '100%'
      }
    };
  };


  const getEventTitle = (event: Booking) => {
    const parts = [event.title];
    if (event.resource?.employeeName) {
      parts.push(`(${event.resource.employeeName})`);
    }
    return parts.join(' ');
  };

  const eventPropGetter = (event: Booking) => {
    return {
      title: getEventTitle(event),
      ...eventStyleGetter(event),
      'data-booking-id': event.id,
      draggable: true // Enable dragging for all events
    };
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  const handleBookingSelect = (event: Booking) => {
    console.log('Booking selected via calendar onSelectEvent:', event.title, event.id);
    setSelectedBooking(event);
    if (onSelectEvent) {
      onSelectEvent(event);
    }
  };

  const handleStatusChange = (status: string) => {
    if (selectedBooking && onBookingStatusChange) {
      onBookingStatusChange(selectedBooking.id, status);
      setSelectedBooking(null);
    }
  };

  const closeStatusModal = () => {
    setSelectedBooking(null);
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  // Debug selected booking changes
  React.useEffect(() => {
    if (selectedBooking) {
      console.log('Selected booking changed:', selectedBooking.title, selectedBooking.id);
    }
  }, [selectedBooking]);

  return (
    <div className="card">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-charcoal font-body font-display">Booking Calendar</h3>
          {/* Status Legend */}
          <div className="flex items-center space-x-4 mt-2 text-xs font-body">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-lime-green"></div>
              <span className="text-charcoal/70">Confirmed</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-soft-yellow"></div>
              <span className="text-charcoal/70">Pending</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-coral-red"></div>
              <span className="text-charcoal/70">Cancelled</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-medium-gray"></div>
              <span className="text-charcoal/70">Completed</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setView(Views.MONTH)}
            className={`px-3 py-1 text-sm rounded font-body ${
              view === Views.MONTH
                ? 'bg-bright-blue text-charcoal'
                : 'bg-light-gray text-charcoal hover:bg-medium-gray'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView(Views.WEEK)}
            className={`px-3 py-1 text-sm rounded font-body ${
              view === Views.WEEK
                ? 'bg-bright-blue text-charcoal'
                : 'bg-light-gray text-charcoal hover:bg-medium-gray'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView(Views.DAY)}
            className={`px-3 py-1 text-sm rounded font-body ${
              view === Views.DAY
                ? 'bg-bright-blue text-charcoal'
                : 'bg-light-gray text-charcoal hover:bg-medium-gray'
            }`}
          >
            Day
          </button>
        </div>
      </div>

      <div style={{ height: `${height}px` }} className="modern-calendar relative">
        <DragAndDropCalendar
          localizer={localizer}
          events={bookings as any[]} // Cast to any[] for now to satisfy types
          startAccessor={(event: Booking) => event.start} // Explicitly type accessor
          endAccessor={(event: Booking) => event.end} // Explicitly type accessor
          view={view}
          date={date}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          onSelectEvent={handleBookingSelect}
          onSelectSlot={onSelectSlot}
          eventPropGetter={eventPropGetter as any} // Cast to any for now
          components={{
            event: (props: any) => (
              <CustomEventComponent
                {...props}
                onSelectEvent={handleBookingSelect}
              />
            )
          }}
          selectable
          resizable
          draggableAccessor={() => true} // Removed unused 'event' parameter
          style={{ height: '100%' }}
          popup
          showMultiDayTimes
          step={15}
          timeslots={4}
          min={new Date(2024, 0, 1, 8, 0)} // 8 AM
          max={new Date(2024, 0, 1, 20, 0)} // 8 PM
          views={[Views.MONTH, Views.WEEK, Views.DAY]} // Only show Month, Week, and Day views
        />

        {/* Booking Details Tooltip */}
        {hoveredEvent && (
          <div
            className="fixed z-50 bg-white border border-medium-gray rounded-lg shadow-elevated p-4 max-w-sm booking-tooltip"
            style={{
              left: Math.min(tooltipPosition.x, window.innerWidth - 320),
              top: Math.max(tooltipPosition.y, 10),
              maxWidth: '300px'
            }}
            onMouseEnter={() => {
              // Keep tooltip visible when hovering over it
              if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                setHoverTimeout(null);
              }
            }}
            onMouseLeave={() => {
              // Hide tooltip when leaving it
              const timeout = setTimeout(() => {
                setHoveredEvent(null);
              }, 100);
              setHoverTimeout(timeout);
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: hoveredEvent.resource?.color || '#1E90FF' }}
                />
                <h4 className="text-charcoal font-medium font-body">{hoveredEvent.resource?.customerName}</h4>
                <span className={`px-2 py-1 text-xs rounded-full font-body ${
                  hoveredEvent.resource?.status === 'confirmed' ? 'bg-lime-green text-charcoal' :
                  hoveredEvent.resource?.status === 'pending' ? 'bg-soft-yellow text-charcoal' :
                  hoveredEvent.resource?.status === 'cancelled' ? 'bg-coral-red text-charcoal' :
                  'bg-medium-gray text-charcoal'
                }`}>
                  {hoveredEvent.resource?.status}
                </span>
              </div>

              <div className="space-y-1 text-sm text-charcoal/70 font-body">
                <div className="flex items-center space-x-2">
                  <UserIcon className="h-4 w-4" />
                  <span>{hoveredEvent.resource?.customerEmail}</span>
                </div>

                {hoveredEvent.resource?.serviceName && (
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Service:</span>
                    <span className="text-bright-blue">{hoveredEvent.resource.serviceName}</span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <span className="font-medium">Employee:</span>
                  {hoveredEvent.resource?.employeeName ? (
                    <div className="flex items-center space-x-2">
                      {hoveredEvent.resource.employeePhotoUrl ? (
                        <div 
                          className="h-6 w-6 rounded-full overflow-hidden border border-bright-blue"
                        >
                          <img
                            src={hoveredEvent.resource.employeePhotoUrl}
                            alt={hoveredEvent.resource.employeeName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div 
                          className="h-6 w-6 rounded-full flex items-center justify-center bg-bright-blue"
                        >
                          <span className="text-charcoal text-xs font-semibold">
                            {hoveredEvent.resource.employeeName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-lime-green">{hoveredEvent.resource.employeeName}</span>
                    </div>
                  ) : (
                    <span className="text-lime-green">Not assigned</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-4 w-4" />
                  <span>{moment(hoveredEvent.start).format('MMM DD, YYYY [at] h:mm A')}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Duration: {Math.round((hoveredEvent.end.getTime() - hoveredEvent.start.getTime()) / 60000)} min</span>
                </div>

                {/* Campaign Information */}
                {hoveredEvent.resource?.campaignName && (
                  <div className="mt-3 pt-3 border-t border-medium-gray">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium text-lime-green">Campaign:</span>
                      <span className="text-lime-green font-semibold">{hoveredEvent.resource.campaignName}</span>
                    </div>
                    {hoveredEvent.resource.campaignBannerMessage && (
                      <div className="text-sm text-charcoal/70 mb-1">
                        {hoveredEvent.resource.campaignBannerMessage}
                      </div>
                    )}
                    {hoveredEvent.resource.campaignDiscountValue && (
                      <div className="text-sm text-lime-green">
                        Discount: {hoveredEvent.resource.campaignDiscountValue}{hoveredEvent.resource.campaignDiscountType === 'percentage' ? '%' : '€'} off
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Booking Status Change Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-charcoal bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border border-medium-gray w-full max-w-lg shadow-elevated rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-charcoal font-body font-display">
                    Change Booking Status
                  </h3>
                  <button
                    onClick={closeStatusModal}
                    className="text-charcoal/60 hover:text-charcoal"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-6">
                  {/* Booking Summary */}
                  <div className="bg-light-gray rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: selectedBooking.resource?.color || '#3B82F6' }}
                      />
                      <h4 className="text-charcoal font-semibold text-xl">{selectedBooking.resource?.customerName}</h4>
                      <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                        selectedBooking.resource?.status === 'confirmed' ? 'bg-lime-green text-white' :
                        selectedBooking.resource?.status === 'pending' ? 'bg-soft-yellow text-charcoal' :
                        selectedBooking.resource?.status === 'cancelled' ? 'bg-coral-red text-white' :
                        'bg-gray-900 text-charcoal/70'
                      }`}>
                        {selectedBooking.resource?.status?.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <UserIcon className="h-4 w-4 text-charcoal/60" />
                          <span>{selectedBooking.resource?.customerEmail}</span>
                        </div>

                        {selectedBooking.resource?.serviceName && (
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">Service:</span>
                            <span className="text-bright-blue">{selectedBooking.resource.serviceName}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Employee:</span>
                          {selectedBooking.resource?.employeeName ? (
                            <div className="flex items-center space-x-2">
                              {selectedBooking.resource.employeePhotoUrl ? (
                                <div 
                                  className="h-6 w-6 rounded-full overflow-hidden border"
                                  style={{ borderColor: selectedBooking.resource.employeeColorCode || '#3B82F6' }}
                                >
                                  <img
                                    src={selectedBooking.resource.employeePhotoUrl}
                                    alt={selectedBooking.resource.employeeName}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div 
                                  className="h-6 w-6 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: selectedBooking.resource.employeeColorCode || '#3B82F6' }}
                                >
                                  <span className="text-charcoal text-xs font-semibold">
                                    {selectedBooking.resource.employeeName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span className="text-lime-green">{selectedBooking.resource.employeeName}</span>
                            </div>
                          ) : (
                            <span className="text-lime-green">Not assigned</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4" />
                          <span>
                            {moment(selectedBooking.start).format('MMM DD, YYYY [at] h:mm A')}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Employee:</span>
                          {selectedBooking.resource?.employeeName ? (
                            <div className="flex items-center space-x-2">
                              {selectedBooking.resource.employeePhotoUrl ? (
                                <div 
                                  className="h-6 w-6 rounded-full overflow-hidden border"
                                  style={{ borderColor: selectedBooking.resource.employeeColorCode || '#3B82F6' }}
                                >
                                  <img
                                    src={selectedBooking.resource.employeePhotoUrl}
                                    alt={selectedBooking.resource.employeeName}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div 
                                  className="h-6 w-6 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: selectedBooking.resource.employeeColorCode || '#3B82F6' }}
                                >
                                  <span className="text-charcoal text-xs font-semibold">
                                    {selectedBooking.resource.employeeName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span>{selectedBooking.resource.employeeName}</span>
                            </div>
                          ) : (
                            <span>Not assigned</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="h-4 w-4" />
                          <span>Duration: {Math.round((selectedBooking.end.getTime() - selectedBooking.start.getTime()) / 60000)} minutes</span>
                        </div>
                      </div>
                    </div>

                    {/* Campaign Information */}
                    {selectedBooking.resource?.campaignName && (
                      <div className="mt-3 pt-3 border-t border-medium-gray">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-orange-300">Campaign:</span>
                          <span className="text-orange-300 font-semibold">{selectedBooking.resource.campaignName}</span>
                        </div>
                        {selectedBooking.resource.campaignBannerMessage && (
                          <div className="text-sm text-charcoal/70 mb-1">
                            {selectedBooking.resource.campaignBannerMessage}
                          </div>
                        )}
                        {selectedBooking.resource.campaignDiscountValue && (
                          <div className="text-sm text-lime-green">
                            Discount: {selectedBooking.resource.campaignDiscountValue}{selectedBooking.resource.campaignDiscountType === 'percentage' ? '%' : '€'} off
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-medium-gray pt-4">
                  <h5 className="text-charcoal font-medium mb-3">Select new status:</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedBooking.resource?.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChange('confirmed')}
                          className="px-4 py-2 text-sm font-medium text-charcoal font-body bg-lime-green border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleStatusChange('cancelled')}
                          className="px-4 py-2 text-sm font-medium text-charcoal font-body bg-coral-red border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {selectedBooking.resource?.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusChange('cancelled')}
                        className="px-4 py-2 text-sm font-medium text-charcoal font-body bg-coral-red border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Cancel
                      </button>
                    )}
                    {selectedBooking.resource?.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusChange('completed')}
                        className="px-4 py-2 text-sm font-medium text-charcoal font-body bg-bright-blue border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeStatusModal}
                    className="px-4 py-2 text-sm font-medium text-charcoal font-body/70 bg-light-gray border border-medium-gray rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DraggableCalendar;
