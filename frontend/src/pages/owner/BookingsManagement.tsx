import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon, CalendarIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';
import { useOwnerApi } from '../../utils/ownerApi';
import { useQueryClient } from '@tanstack/react-query';
import EmployeeSelector from '../../components/owner/EmployeeSelector';
import FullCalendarComponent from '../../components/owner/FullCalendarComponent';
import RecurringBookingForm from '../../components/owner/RecurringBookingForm';
import moment from 'moment';
import { usePlaceContext } from '../../contexts/PlaceContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Booking {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    employeeId?: number;
    employeeName?: string;
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


interface Employee {
  id: number;
  name: string;
  role: string;
  is_active: boolean;
}

interface Service {
  id: number;
  name: string;
  duration?: number;
  price?: number;
  color_code?: string;
}

interface BookingService {
  service_id: number;
  service_name: string;
  service_price: number;
  service_duration: number;
}

interface BookingData {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  service_id: number;
  service_name?: string;
  services?: BookingService[];
  total_price?: number;
  total_duration?: number;
  employee_id?: number;
  employee_name?: string;
  booking_date: string;
  booking_time: string;
  duration?: number;
  status: string;
  color_code?: string;
  campaign_id?: number;
  campaign_name?: string;
  campaign_banner_message?: string;
  campaign_type?: string;
  campaign_discount_value?: number;
  campaign_discount_type?: string;
}

const BookingsManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { 
    usePlaceBookings, 
    usePlaceEmployees,
    usePlaceServices,
    useCreateBooking, 
    useUpdateBooking, 
    useCancelBooking,
    useAcceptBooking
  } = useOwnerApi();
  
  const { selectedPlaceId, selectedPlace } = usePlaceContext();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    service_ids: [] as number[],
    employee_id: '',
    booking_date: '',
    booking_time: '',
    duration: 60,
    status: 'confirmed',
    color_code: undefined
  });

  const { data: bookings = [], isLoading: bookingsLoading } = usePlaceBookings(selectedPlaceId || 0);
  const { data: employees = [] } = usePlaceEmployees(selectedPlaceId || 0);
  const { data: services = [] } = usePlaceServices(selectedPlaceId || 0);
  
  const createBookingMutation = useCreateBooking();
  const updateBookingMutation = useUpdateBooking();
  const cancelBookingMutation = useCancelBooking();
  const acceptBookingMutation = useAcceptBooking();



  // Convert bookings to calendar format
  const calendarBookings: Booking[] = bookings.map((booking: any) => {
    // Create ISO string for proper timezone handling
    const startDate = new Date(`${booking.booking_date}T${booking.booking_time}:00`);
    const duration = booking.total_duration || booking.duration || 60;
    const endDate = new Date(startDate.getTime() + duration * 60000);
    
    // Use booking color
    const color = booking.color_code || '#3B82F6';
    
    return {
      id: booking.id,
      title: booking.customer_name,
      start: startDate,
      end: endDate,
      resource: {
        employeeId: booking.employee_id,
        employeeName: booking.employee_name,
        serviceId: booking.service_id,
        serviceName: booking.service_name,
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        status: booking.status,
        color: color,
        // Campaign fields
        campaignId: booking.campaign_id,
        campaignName: booking.campaign_name,
        campaignBannerMessage: booking.campaign_banner_message,
        campaignType: booking.campaign_type,
        campaignDiscountValue: booking.campaign_discount_value,
        campaignDiscountType: booking.campaign_discount_type
      }
    };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlaceId) return;

    if (formData.service_ids.length === 0) {
      alert('Please select at least one service');
      return;
    }

    const bookingData = {
      business_id: selectedPlaceId, // Used for URL path, will be removed from body
      service_ids: formData.service_ids,
      employee_id: formData.employee_id ? parseInt(formData.employee_id) : undefined,
      customer_name: formData.customer_name,
      customer_email: formData.customer_email,
      customer_phone: formData.customer_phone || undefined,
      booking_date: new Date(`${formData.booking_date}T00:00:00`).toISOString(),
      booking_time: new Date(`${formData.booking_date}T${formData.booking_time}`).toISOString(),
      duration: calculateTotalDuration(),
      status: formData.status,
      is_recurring: false,
      recurrence_pattern: null,
      any_employee_selected: false,
    };

    try {
      await createBookingMutation.mutateAsync(bookingData);
      // Invalidate the specific place bookings query
      if (selectedPlaceId) {
        queryClient.invalidateQueries({ 
          queryKey: ['owner', 'places', selectedPlaceId, 'bookings'] 
        });
      }
      setShowBookingModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating booking:', error);
    }
  };

  const handleEventDrop = useCallback(async (event: Booking, start: Date, end: Date) => {
    try {
      await updateBookingMutation.mutateAsync({
        id: event.id,
        data: {
          booking_date: start.toISOString(), // Send full ISO string
          booking_time: start.toISOString(), // Send full ISO string
          duration: (end.getTime() - start.getTime()) / (1000 * 60) // Calculate duration in minutes
        }
      });
      // Invalidate the specific place bookings query
      if (selectedPlaceId) {
        queryClient.invalidateQueries({
          queryKey: ['owner', 'places', selectedPlaceId, 'bookings']
        });
      }
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  }, [updateBookingMutation, queryClient, selectedPlaceId]);

  const handleEventResize = useCallback(async (event: Booking, start: Date, end: Date) => {
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
    try {
      await updateBookingMutation.mutateAsync({
        id: event.id,
        data: { duration }
      });
      // Invalidate the specific place bookings query
      if (selectedPlaceId) {
        queryClient.invalidateQueries({ 
          queryKey: ['owner', 'places', selectedPlaceId, 'bookings'] 
        });
      }
    } catch (error) {
      console.error('Error updating booking duration:', error);
    }
  }, [updateBookingMutation, queryClient, selectedPlaceId]);

  const handleSelectEvent = (event: Booking) => {
    setSelectedBooking(event);
    setShowBookingDetailsModal(true);
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date; slots: Date[] }) => {
    const startDate = slotInfo.start;
    setFormData(prev => ({
      ...prev,
      booking_date: startDate.toISOString().split('T')[0],
      booking_time: startDate.toTimeString().slice(0, 5)
    }));
    setShowBookingModal(true);
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        await cancelBookingMutation.mutateAsync(bookingId);
        // Invalidate the specific place bookings query
        if (selectedPlaceId) {
          queryClient.invalidateQueries({ 
            queryKey: ['owner', 'places', selectedPlaceId, 'bookings'] 
          });
        }
      } catch (error) {
        console.error('Error canceling booking:', error);
      }
    }
  };

  const handleAcceptBooking = async (bookingId: number) => {
    if (window.confirm('Are you sure you want to accept this booking?')) {
      try {
        await acceptBookingMutation.mutateAsync(bookingId);
        // Invalidate the specific place bookings query
        if (selectedPlaceId) {
          queryClient.invalidateQueries({ 
            queryKey: ['owner', 'places', selectedPlaceId, 'bookings'] 
          });
        }
      } catch (error) {
        console.error('Error accepting booking:', error);
      }
    }
  };

  const handleDeclineBooking = async (bookingId: number) => {
    if (window.confirm('Are you sure you want to decline this booking?')) {
      try {
        await updateBookingMutation.mutateAsync({
          id: bookingId,
          data: { status: 'cancelled' }
        });
        // Invalidate the specific place bookings query
        if (selectedPlaceId) {
          queryClient.invalidateQueries({ 
            queryKey: ['owner', 'places', selectedPlaceId, 'bookings'] 
          });
        }
      } catch (error) {
        console.error('Error declining booking:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      service_ids: [],
      employee_id: '',
      booking_date: '',
      booking_time: '',
      duration: 60,
      status: 'confirmed',
      color_code: undefined
    });
  };

  const handleModalClose = () => {
    setShowBookingModal(false);
    setSelectedBooking(null);
    resetForm();
  };

  const handleBookingDetailsModalClose = () => {
    setShowBookingDetailsModal(false);
    setSelectedBooking(null);
  };

  const handleRecurringSubmit = async (data: any) => {
    try {
      await createBookingMutation.mutateAsync({
        ...data,
        business_id: selectedPlaceId,
        is_recurring: true
      });
      setShowRecurringModal(false);
    } catch (error) {
      console.error('Error creating recurring booking:', error);
    }
  };


  const handleBookingStatusChange = (bookingId: number, status: string) => {
    updateBookingMutation.mutate(
      {
        id: bookingId,
        data: { status }
      },
      {
        onSuccess: () => {
          // Close the Booking Details modal after status change
          handleBookingDetailsModalClose();
          // Invalidate the specific place bookings query to refresh calendar/list view
          if (selectedPlaceId) {
            queryClient.invalidateQueries({ 
              queryKey: ['owner', 'places', selectedPlaceId, 'bookings'] 
            });
          }
        },
        onError: (error) => {
          console.error('Error updating booking status:', error);
          // Close modal even on error
          handleBookingDetailsModalClose();
        }
      }
    );
  };

  const handleEditBooking = (booking: any) => {
    setEditingBooking(booking);
    setFormData({
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone || '',
      service_ids: booking.services ? booking.services.map((s: any) => s.service_id) : [booking.service_id],
      employee_id: booking.employee_id ? booking.employee_id.toString() : '',
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      duration: booking.total_duration || booking.duration || 60,
      status: booking.status,
      color_code: undefined
    });
    setShowEditModal(true);
  };

  const handleServiceToggle = (serviceId: number) => {
    setFormData(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId]
    }));
  };

  const calculateTotalPrice = () => {
    return formData.service_ids.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
  };

  const calculateTotalDuration = () => {
    return formData.service_ids.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.duration || 0);
    }, 0);
  };

  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingBooking) return;

    if (formData.service_ids.length === 0) {
      alert('Please select at least one service');
      return;
    }

    const bookingData = {
      customer_name: formData.customer_name,
      customer_email: formData.customer_email,
      customer_phone: formData.customer_phone || undefined,
      service_ids: formData.service_ids,
      employee_id: formData.employee_id ? parseInt(formData.employee_id) : undefined,
      booking_date: new Date(`${formData.booking_date}T00:00:00`).toISOString(),
      booking_time: new Date(`${formData.booking_date}T${formData.booking_time}`).toISOString(),
      duration: calculateTotalDuration(),
      status: formData.status
    };

    updateBookingMutation.mutate(
      {
        id: editingBooking.id,
        data: bookingData
      },
      {
        onSuccess: () => {
          // Close all modals and reset state
          setShowEditModal(false);
          handleBookingDetailsModalClose();
          setEditingBooking(null);
          resetForm();
          // Invalidate the specific place bookings query to refresh calendar/list view
          if (selectedPlaceId) {
            queryClient.invalidateQueries({ 
              queryKey: ['owner', 'places', selectedPlaceId, 'bookings'] 
            });
          }
        },
        onError: (error) => {
          console.error('Error updating booking:', error);
          // Close modals even on error
          setShowEditModal(false);
          handleBookingDetailsModalClose();
          setEditingBooking(null);
        }
      }
    );
  };

  if (bookingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-light-gray">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-bright-blue"></div>
      </div>
    );
  }

  return (
    <div className="w-full bg-light-gray">
      {/* Main Content */}
      <main className="w-full p-4 lg:p-6 bg-light-gray overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-charcoal text-2xl lg:text-3xl font-bold leading-tight font-display">
                Bookings Management
              </h1>
            </div>
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setShowRecurringModal(true)}
                disabled={!selectedPlaceId}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Recurring Booking
              </button>
              <button
                type="button"
                onClick={() => setShowBookingModal(true)}
                disabled={!selectedPlaceId}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Booking
              </button>
            </div>
          </div>

          {/* Selected Place Bookings */}
          {selectedPlace ? (
            <div className="space-y-6">
              {/* Place Info Card */}
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-charcoal font-display">
                      {selectedPlace.name}
                    </h2>
                    <p className="text-charcoal/60 font-body">
                      {selectedPlace.location_type === 'fixed' ? 'Fixed Location' : 'Mobile/Service Area'}
                      {selectedPlace.city && ` • ${selectedPlace.city}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setView('calendar')}
                        className={`px-3 py-2 text-sm rounded font-body ${
                          view === 'calendar' 
                            ? 'bg-bright-blue text-charcoal' 
                            : 'bg-light-gray text-charcoal hover:bg-medium-gray'
                        }`}
                      >
                        Calendar
                      </button>
                      <button
                        onClick={() => setView('list')}
                        className={`px-3 py-2 text-sm rounded font-body ${
                          view === 'list' 
                            ? 'bg-bright-blue text-charcoal' 
                            : 'bg-light-gray text-charcoal hover:bg-medium-gray'
                        }`}
                      >
                        List
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calendar or List View */}
              {view === 'calendar' ? (
                <FullCalendarComponent
                  bookings={calendarBookings}
                  onEventDrop={handleEventDrop}
                  onEventResize={handleEventResize}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  onBookingStatusChange={handleBookingStatusChange}
                  employees={employees}
                  services={services}
                  defaultView={calendarView}
                  height={700}
                />
              ) : (
                <div className="card">
                  <div className="px-4 py-3 bg-light-gray border-b border-medium-gray">
                    <h3 className="text-lg font-medium text-charcoal font-body font-display">All Bookings</h3>
                  </div>
                  <ul className="divide-y divide-medium-gray">
                    {bookings.map((booking) => (
                      <li key={booking.id}>
                        <div className="px-4 py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0">
                                <div 
                                  className="h-12 w-12 rounded-full flex items-center justify-center text-charcoal"
                                  style={{ 
                                    backgroundColor: booking.color_code || '#3B82F6' 
                                  }}
                                >
                                  <CalendarIcon className="h-6 w-6" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h4 className="text-lg font-medium text-charcoal font-body font-body">{booking.customer_name}</h4>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-body ${
                                    booking.status === 'confirmed' ? 'bg-lime-green text-charcoal' :
                                    booking.status === 'pending' ? 'bg-soft-yellow text-charcoal' :
                                    booking.status === 'cancelled' ? 'bg-coral-red text-charcoal' :
                                    'bg-medium-gray text-charcoal'
                                  }`}>
                                    {booking.status}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-charcoal/70 font-body">
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                      <UserIcon className="h-4 w-4" />
                                      <span className="font-medium">Customer:</span>
                                      <span>{booking.customer_name}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium">Email:</span>
                                      <span>{booking.customer_email}</span>
                                    </div>
                                    {booking.customer_phone && (
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium">Phone:</span>
                                        <span>{booking.customer_phone}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium">Services:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {booking.services && booking.services.length > 0 ? (
                                          booking.services.map((service: any, index: number) => (
                                            <span key={index} className="text-bright-blue text-sm bg-bright-blue bg-opacity-10 px-2 py-1 rounded">
                                              {service.service_name} (€{service.service_price})
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-bright-blue">{booking.service_name || 'N/A'}</span>
                                        )}
                                      </div>
                                    </div>
                                    {booking.total_price && (
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium">Total Price:</span>
                                        <span className="text-lime-green font-semibold">€{booking.total_price}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium">Employee:</span>
                                      {booking.employee_name ? (
                                        <div className="flex items-center space-x-2">
                                          {booking.employee_photo_url ? (
                                            <div 
                                              className="h-6 w-6 rounded-full overflow-hidden border border-bright-blue"
                                            >
                                              <img
                                                src={booking.employee_photo_url}
                                                alt={booking.employee_name}
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                          ) : (
                                            <div 
                                              className="h-6 w-6 rounded-full flex items-center justify-center bg-bright-blue"
                                            >
                                              <span className="text-charcoal text-xs font-semibold">
                                                {booking.employee_name.charAt(0).toUpperCase()}
                                              </span>
                                            </div>
                                          )}
                                          <span className="text-lime-green">{booking.employee_name}</span>
                                        </div>
                                      ) : (
                                        <span className="text-lime-green">Not assigned</span>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <ClockIcon className="h-4 w-4" />
                                      <span className="font-medium">Date & Time:</span>
                                      <span>{booking.booking_date} at {booking.booking_time}</span>
                                    </div>
                                    {(booking.total_duration || booking.duration) && (
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium">Duration:</span>
                                        <span>{booking.total_duration || booking.duration} minutes</span>
                                      </div>
                                    )}
                                    {booking.campaign_name && (
                                      <div className="mt-3 p-2 bg-lime-green bg-opacity-10 border border-lime-green rounded">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-lime-green font-medium">🎉 Campaign:</span>
                                          <span className="text-charcoal">{booking.campaign_name}</span>
                                        </div>
                                        {booking.campaign_banner_message && (
                                          <div className="text-xs text-charcoal/70 mt-1">
                                            {booking.campaign_banner_message}
                                          </div>
                                        )}
                                        {booking.campaign_discount_value && (
                                          <div className="text-xs text-charcoal/70 mt-1">
                                            Discount: {booking.campaign_discount_value}{booking.campaign_discount_type === 'percentage' ? '%' : '€'} off
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEditBooking(booking)}
                                className="inline-flex items-center px-3 py-1.5 border border-bright-blue text-xs font-medium rounded text-bright-blue bg-bright-blue bg-opacity-10 hover:bg-bright-blue hover:text-charcoal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bright-blue font-body"
                              >
                                <PencilIcon className="h-4 w-4 mr-1" />
                                Edit
                              </button>
                              {booking.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleAcceptBooking(booking.id)}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-charcoal bg-lime-green hover:bg-lime-green hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-green font-body"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleDeclineBooking(booking.id)}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-charcoal bg-coral-red hover:bg-coral-red hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coral-red font-body"
                                  >
                                    Decline
                                  </button>
                                </>
                              )}
                              {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                                <button
                                  onClick={() => handleCancelBooking(booking.id)}
                                  className="inline-flex items-center px-3 py-1.5 border border-medium-gray text-xs font-medium rounded text-charcoal bg-light-gray hover:bg-medium-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medium-gray font-body"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-12">
                <BuildingOfficeIcon className="mx-auto h-12 w-12 text-charcoal/40" />
                <h3 className="mt-2 text-sm font-medium text-charcoal font-body font-display">No place selected</h3>
                <p className="mt-1 text-sm text-charcoal/60 font-body">
                  Select a place from the sidebar to manage its bookings, or create a new booking.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-[#333333] bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-[#E0E0E0] w-full max-w-md shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-[#333333] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Create New Booking
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer_name" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Customer Name *</Label>
                    <Input
                      id="customer_name"
                      type="text"
                      required
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      placeholder="Enter customer name"
                      style={{ fontFamily: 'Open Sans, sans-serif' }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer_email" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Customer Email *</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      required
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      placeholder="Enter email address"
                      style={{ fontFamily: 'Open Sans, sans-serif' }}
                    />
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
                  <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Open Sans, sans-serif' }}>Services *</label>
                  <div className="max-h-48 overflow-y-auto border border-[#E0E0E0] rounded-lg p-2 bg-[#F5F5F5]">
                    {services.length === 0 ? (
                      <p className="text-[#9E9E9E] text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>No services available for this place</p>
                    ) : (
                      <div className="space-y-2">
                        {services.map((service: any) => (
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
                </div>

                <div>
                  <Label htmlFor="employee" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Employee</Label>
                  <EmployeeSelector
                    employees={employees}
                    selectedEmployeeId={formData.employee_id ? parseInt(formData.employee_id) : undefined}
                    onEmployeeChange={(id) => setFormData({ ...formData, employee_id: id?.toString() || '' })}
                    allowNone={true}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="booking_date" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Date *</Label>
                    <Input
                      id="booking_date"
                      type="date"
                      required
                      value={formData.booking_date}
                      onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                      style={{ fontFamily: 'Open Sans, sans-serif' }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="booking_time" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Time *</Label>
                    <Input
                      id="booking_time"
                      type="time"
                      required
                      value={formData.booking_time}
                      onChange={(e) => setFormData({ ...formData, booking_time: e.target.value })}
                      style={{ fontFamily: 'Open Sans, sans-serif' }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Duration (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="15"
                      step="15"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                      style={{ fontFamily: 'Open Sans, sans-serif' }}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="status" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="px-4 py-2 text-sm font-medium text-[#333333] bg-white border border-[#E0E0E0] rounded-lg shadow-sm hover:bg-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E90FF]"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createBookingMutation.isPending || formData.service_ids.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#1E90FF] border border-transparent rounded-lg shadow-sm hover:bg-[#1877D2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E90FF] disabled:opacity-50"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  >
                    Create Booking
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {showEditModal && editingBooking && (
        <div className="fixed inset-0 bg-charcoal bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-medium-gray w-full max-w-md shadow-elevated rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-charcoal font-display mb-4">
                Edit Booking
              </h3>
              <form onSubmit={handleUpdateBooking} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal font-body">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal font-body">Customer Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal font-body">Customer Phone</label>
                  <input
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal font-body mb-2">Services *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {services.map((service: any) => (
                      <div
                        key={service.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          formData.service_ids.includes(service.id)
                            ? 'border-bright-blue bg-bright-blue bg-opacity-10'
                            : 'border-medium-gray bg-light-gray hover:bg-medium-gray'
                        }`}
                        onClick={() => handleServiceToggle(service.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={formData.service_ids.includes(service.id)}
                            onChange={() => handleServiceToggle(service.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-charcoal font-medium">{service.name}</div>
                            <div className="text-sm text-charcoal/70">
                              €{service.price || 0} • {service.duration || 0} min
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {formData.service_ids.length > 0 && (
                    <div className="mt-3 p-3 bg-light-gray rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-charcoal font-medium">
                          {formData.service_ids.length} service{formData.service_ids.length > 1 ? 's' : ''} selected
                        </span>
                        <div className="text-right">
                          <div className="text-lime-green font-semibold">
                            Total: €{calculateTotalPrice().toFixed(2)}
                          </div>
                          <div className="text-sm text-charcoal/70">
                            {calculateTotalDuration()} minutes
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal font-body">Employee</label>
                  <EmployeeSelector
                    employees={employees}
                    selectedEmployeeId={formData.employee_id ? parseInt(formData.employee_id) : undefined}
                    onEmployeeChange={(id) => setFormData({ ...formData, employee_id: id?.toString() || '' })}
                    allowNone={true}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal font-body">Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.booking_date}
                      onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal font-body">Time *</label>
                    <input
                      type="time"
                      required
                      value={formData.booking_time}
                      onChange={(e) => setFormData({ ...formData, booking_time: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal font-body">Duration (min)</label>
                    <input
                      type="number"
                      min="15"
                      step="15"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal font-body">Status</label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="input-field">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingBooking(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-charcoal font-body/70 bg-light-gray border border-medium-gray rounded-md shadow-sm hover:bg-medium-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateBookingMutation.isPending || formData.service_ids.length === 0}
                    className="btn-primary disabled:opacity-50"
                  >
                    Update Booking
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


      {/* Recurring Booking Modal */}
      {showRecurringModal && (
        <RecurringBookingForm
          onSubmit={handleRecurringSubmit}
          onCancel={() => setShowRecurringModal(false)}
          initialData={{
            business_id: selectedPlaceId || 0,
            service_ids: services.length > 0 ? [services[0].id] : []
          }}
          services={services}
        />
      )}

      {/* Booking Details Modal */}
      {showBookingDetailsModal && selectedBooking && (
        <div 
          className="fixed inset-0 bg-charcoal bg-opacity-50 overflow-y-auto h-full w-full z-50"
          onClick={handleBookingDetailsModalClose}
        >
          <div 
            className="relative top-10 mx-auto p-5 border border-medium-gray w-full max-w-2xl shadow-elevated rounded-md bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-charcoal font-display">
                Booking Details
              </h3>
            </div>

            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-light-gray p-4 rounded-lg">
                <h4 className="text-lg font-medium text-charcoal font-display mb-3">Customer Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal font-body">Name</label>
                    <p className="text-charcoal font-body">{selectedBooking.resource?.customerName || selectedBooking.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal font-body">Email</label>
                    <p className="text-charcoal font-body">{selectedBooking.resource?.customerEmail || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Booking Information */}
              <div className="bg-light-gray p-4 rounded-lg">
                <h4 className="text-lg font-medium text-charcoal font-display mb-3">Booking Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal font-body">Date</label>
                    <p className="text-charcoal font-body">{selectedBooking.start.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal font-body">Time</label>
                    <p className="text-charcoal font-body">
                      {selectedBooking.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                      {selectedBooking.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal font-body">Duration</label>
                    <p className="text-charcoal font-body">
                      {Math.round((selectedBooking.end.getTime() - selectedBooking.start.getTime()) / (1000 * 60))} minutes
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal font-body">Status</label>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedBooking.resource?.status === 'confirmed' ? 'bg-lime-green bg-opacity-20 text-lime-green' :
                        selectedBooking.resource?.status === 'pending' ? 'bg-soft-yellow bg-opacity-20 text-soft-yellow' :
                        selectedBooking.resource?.status === 'cancelled' ? 'bg-coral-red bg-opacity-20 text-coral-red' :
                        selectedBooking.resource?.status === 'completed' ? 'bg-medium-gray bg-opacity-20 text-medium-gray' :
                        'bg-bright-blue bg-opacity-20 text-bright-blue'
                      }`}>
                        {selectedBooking.resource?.status?.charAt(0).toUpperCase() + selectedBooking.resource?.status?.slice(1) || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Information */}
              {selectedBooking.resource?.serviceName && (
                <div className="bg-light-gray p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-charcoal font-display mb-3">Service Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal font-body">Service</label>
                      <p className="text-charcoal font-body">{selectedBooking.resource.serviceName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal font-body">Employee</label>
                      <p className="text-charcoal font-body">{selectedBooking.resource.employeeName || 'Not assigned'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Campaign Information */}
              {selectedBooking.resource?.campaignName && (
                <div className="bg-light-gray p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-charcoal font-display mb-3">Campaign Information</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-charcoal font-body">Campaign</label>
                      <p className="text-charcoal font-body">{selectedBooking.resource.campaignName}</p>
                    </div>
                    {selectedBooking.resource.campaignBannerMessage && (
                      <div>
                        <label className="block text-sm font-medium text-charcoal font-body">Message</label>
                        <p className="text-charcoal font-body">{selectedBooking.resource.campaignBannerMessage}</p>
                      </div>
                    )}
                    {selectedBooking.resource.campaignDiscountValue && (
                      <div>
                        <label className="block text-sm font-medium text-charcoal font-body">Discount</label>
                        <p className="text-charcoal font-body">
                          {selectedBooking.resource.campaignDiscountValue}
                          {selectedBooking.resource.campaignDiscountType === 'percentage' ? '%' : '€'} off
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* All Action Buttons */}
              <div className="bg-light-gray p-4 rounded-lg">
                <h4 className="text-lg font-medium text-charcoal font-display mb-4">Actions</h4>
                <div className="flex flex-wrap gap-3">
                  {/* Edit Booking Button */}
                  <button
                    onClick={() => {
                      setEditingBooking(selectedBooking);
                      setFormData({
                        customer_name: selectedBooking.resource?.customerName || selectedBooking.title,
                        customer_email: selectedBooking.resource?.customerEmail || '',
                        customer_phone: '',
                        service_ids: selectedBooking.resource?.serviceId ? [selectedBooking.resource.serviceId] : [],
                        employee_id: selectedBooking.resource?.employeeId?.toString() || '',
                        booking_date: selectedBooking.start.toISOString().split('T')[0],
                        booking_time: selectedBooking.start.toTimeString().slice(0, 5),
                        duration: Math.round((selectedBooking.end.getTime() - selectedBooking.start.getTime()) / (1000 * 60)),
                        status: selectedBooking.resource?.status || 'pending',
                        color_code: undefined
                      });
                      setShowBookingDetailsModal(false);
                      setShowEditModal(true);
                    }}
                    className="px-4 py-2 bg-bright-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-body"
                  >
                    Edit Booking
                  </button>

                  {/* Status Change Buttons */}
                  {selectedBooking.resource?.status !== 'confirmed' && (
                    <button
                      onClick={() => handleBookingStatusChange(selectedBooking.id, 'confirmed')}
                      className="px-4 py-2 bg-lime-green text-white rounded-lg hover:bg-green-600 transition-colors font-body"
                    >
                      Confirm Booking
                    </button>
                  )}
                  {selectedBooking.resource?.status !== 'completed' && (
                    <button
                      onClick={() => handleBookingStatusChange(selectedBooking.id, 'completed')}
                      className="px-4 py-2 bg-medium-gray text-white rounded-lg hover:bg-gray-600 transition-colors font-body"
                    >
                      Mark Completed
                    </button>
                  )}
                  {selectedBooking.resource?.status !== 'cancelled' && (
                    <button
                      onClick={() => handleBookingStatusChange(selectedBooking.id, 'cancelled')}
                      className="px-4 py-2 bg-coral-red text-white rounded-lg hover:bg-red-600 transition-colors font-body"
                    >
                      Cancel Booking
                    </button>
                  )}

                  {/* Close Button */}
                  <button
                    onClick={handleBookingDetailsModalClose}
                    className="px-4 py-2 bg-medium-gray text-charcoal rounded-lg hover:bg-gray-400 transition-colors font-body"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsManagement;
