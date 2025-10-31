import React, { useRef, useEffect, useState } from 'react';
import { Calendar, momentLocalizer, Views, type View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop<Booking, object>(Calendar);

interface Booking {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: {
    employeeId?: number;
    employeeName?: string;
    serviceId?: number;
    serviceName?: string;
    customerName: string;
    customerEmail?: string;
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

interface FullCalendarComponentProps {
  bookings: Booking[];
  onEventDrop?: (event: Booking, start: Date, end: Date) => void;
  onEventResize?: (event: Booking, start: Date, end: Date) => void;
  onSelectEvent?: (event: Booking) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date; slots: Date[] }) => void;
  onBookingStatusChange?: (bookingId: number, status: string) => void;
  employees?: Array<{ id: number; name: string }>;
  services?: Array<{ id: number; name: string }>;
  defaultView?: 'month' | 'week' | 'day';
  height?: number;
}

const FullCalendarComponent: React.FC<FullCalendarComponentProps> = ({
  bookings,
  onEventDrop,
  onEventResize,
  onSelectEvent,
  onSelectSlot,
  onBookingStatusChange,
  employees = [],
  services = [],
  defaultView = 'month',
  height = 600
}) => {
  const [view, setView] = useState<View>(defaultView as View);
  const [date, setDate] = useState(new Date());

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  const handleEventDrop = (event: Booking, start: Date, end: Date) => {
    if (onEventDrop) {
      onEventDrop(event, start, end);
    }
  };

  const handleEventResize = (event: Booking, start: Date, end: Date) => {
    if (onEventResize) {
      onEventResize(event, start, end);
    }
  };

  const handleSelectEvent = (event: Booking) => {
    if (onSelectEvent) {
      onSelectEvent(event);
    }
  };

  const handleDoubleClickEvent = (event: Booking) => {
    if (onSelectEvent) {
      onSelectEvent(event);
    }
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date; slots: Date[] }) => {
    if (onSelectSlot) {
      onSelectSlot(slotInfo);
    }
  };

  const eventPropGetter = (event: Booking) => {
    const status = event.resource?.status || 'pending';
    let backgroundColor = '#1E90FF'; // Default blue
    
    switch (status) {
      case 'confirmed':
        backgroundColor = '#A3D55D'; // Lime Green
        break;
      case 'pending':
        backgroundColor = '#FFD43B'; // Soft Yellow
        break;
      case 'cancelled':
        backgroundColor = '#FF5A5F'; // Coral Red
        break;
      case 'completed':
        backgroundColor = '#9E9E9E'; // Medium Gray
        break;
    }

    return {
      style: {
        backgroundColor,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }
    };
  };

  // Custom event component with double-click support
  const CustomEventComponent = ({ event }: { event: Booking }) => {
    const handleDoubleClick = () => {
      handleDoubleClickEvent(event);
    };

    return (
      <div
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: 'pointer',
          padding: '2px 4px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '500',
          color: 'white',
          backgroundColor: eventPropGetter(event).style.backgroundColor,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: 'none',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start'
        }}
        title="Double-click to view details and edit"
      >
        <div style={{ fontWeight: '600', fontSize: '11px' }}>
          {event.resource?.customerName || event.title}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.9 }}>
          {event.resource?.serviceName || ''}
        </div>
      </div>
    );
  };

  return (
    <div className="modern-calendar relative" style={{ height: `${height}px` }}>
      <DragAndDropCalendar
        localizer={localizer}
        events={bookings as any[]}
        startAccessor={(event: Booking) => event.start}
        endAccessor={(event: Booking) => event.end}
        view={view}
        date={date}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        eventPropGetter={eventPropGetter as any}
        components={{
          event: CustomEventComponent
        }}
        selectable
        resizable
        draggableAccessor={() => true}
        style={{ height: '100%' }}
        popup
        showMultiDayTimes
        step={15}
        timeslots={4}
        min={new Date(2024, 0, 1, 8, 0)} // 8 AM
        max={new Date(2024, 0, 1, 20, 0)} // 8 PM
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
        timeZone="local"
      />
    </div>
  );
};

export default FullCalendarComponent;
