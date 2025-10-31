import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Mail, Plus, Eye, LogOut, Settings, Trash2, Edit, Building, Camera } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { managerAPI, serviceAPI, salonAPI, placeAPI } from '../utils/api';
import SalonForm from '../components/manager/SalonForm';
import ServiceForm from '../components/manager/ServiceForm';
import OpeningHoursForm from '../components/manager/OpeningHoursForm';
import OpeningHoursDisplay from '../components/manager/OpeningHoursDisplay';
import BookingCalendar from '../components/manager/BookingCalendar';
import SalonImageManager from '../components/manager/SalonImageManager';
import LeafletSalonMap from '../components/common/LeafletSalonMap';

const ManagerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'salon' | 'salons' | 'salon-info' | 'opening-hours' | 'images'>('salons');
  const [selectedSalon, setSelectedSalon] = useState<any>(null);
  const [salons, setSalons] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSalonForm, setShowSalonForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showOpeningHoursForm, setShowOpeningHoursForm] = useState(false);
  const [openingHoursRefreshTrigger, setOpeningHoursRefreshTrigger] = useState(0);
  const [salonRefreshTrigger, setSalonRefreshTrigger] = useState(0);
  const [isEditingSalon, setIsEditingSalon] = useState(false);
  const [editingFormData, setEditingFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    website: '',
    instagram: '',
    regiao: '',
    cidade: '',
    rua: '',
    porta: '',
    cod_postal: '',
    about: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });
  const [editingLoading, setEditingLoading] = useState(false);
  const [editingError, setEditingError] = useState('');
  const [bookingForm, setBookingForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    service_id: '',
    booking_date: '',
    booking_time: ''
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [bookingViewMode, setBookingViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);
  
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadSalons();
  }, []);

  useEffect(() => {
    if (selectedSalon) {
      loadBookings(selectedSalon.id);
      loadServices(selectedSalon.id);
    }
  }, [selectedSalon]);

  // Refresh salon data when trigger changes
  useEffect(() => {
    if (salonRefreshTrigger > 0) {
      loadSalons();
    }
  }, [salonRefreshTrigger]);

  // Update selectedSalon when salons data changes - DISABLED to prevent form resets
  // useEffect(() => {
  //   if (salons.length > 0 && selectedSalon) {
  //     const updatedSalon = salons.find(salon => salon.id === selectedSalon.id);
  //     if (updatedSalon) {
  //       setSelectedSalon(updatedSalon);
  //     }
  //   }
  // }, [salons]);

  // Fetch available time slots for booking form
  const { data: availabilityData, isLoading: availabilityLoading } = useQuery({
    queryKey: ['availability', selectedSalon?.id, bookingForm.booking_date, bookingForm.service_id],
    queryFn: () => placeAPI.getAvailability(selectedSalon?.id || 0, bookingForm.booking_date, parseInt(bookingForm.service_id) || undefined),
    enabled: !!bookingForm.booking_date && !!selectedSalon?.id && !!bookingForm.service_id
  });

  const timeSlots = availabilityData?.time_slots || [];
  const availableSlots = availabilityData?.available_slots || [];

  // Function to check if a slot should be highlighted based on selected time and service duration
  const isSlotHighlighted = (slotTime: string) => {
    if (!selectedTimeSlot || !bookingForm.service_id) return false;
    
    const selectedServiceData = services.find(s => s.service_id === parseInt(bookingForm.service_id));
    if (!selectedServiceData) return false;
    
    const duration = selectedServiceData.duration;
    const selectedTimeMinutes = timeToMinutes(selectedTimeSlot);
    const slotTimeMinutes = timeToMinutes(slotTime);
    
    // Check if this slot is within the service duration from the selected start time
    return slotTimeMinutes >= selectedTimeMinutes && 
           slotTimeMinutes < selectedTimeMinutes + duration;
  };

  // Helper function to convert time string to minutes
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Reset selected time slot when date or service changes
  const handleDateChange = (date: string) => {
    setBookingForm({...bookingForm, booking_date: date});
    setSelectedTimeSlot('');
  };

  const handleServiceChange = (serviceId: string) => {
    setBookingForm({...bookingForm, service_id: serviceId});
    setSelectedTimeSlot('');
  };

  const loadSalons = async () => {
    try {
      setLoading(true);
      const data = await managerAPI.getManagerSalons();
      setSalons(data);
      if (data.length > 0 && !selectedSalon) {
        setSelectedSalon(data[0]);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load salons';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async (salonId: number) => {
    try {
      const data = await managerAPI.getSalonBookings(salonId);
      setBookings(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load bookings';
      setError(errorMessage);
    }
  };

  const loadServices = async (salonId: number) => {
    try {
      const data = await managerAPI.getSalonServices(salonId);
      setServices(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load services';
      setError(errorMessage);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: number, status: string) => {
    try {
      await managerAPI.updateBookingStatus(bookingId, status);
      if (selectedSalon) {
        loadBookings(selectedSalon.id);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update booking status';
      setError(errorMessage);
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    if (!selectedSalon) return;
    
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await managerAPI.deleteSalonService(selectedSalon.id, serviceId);
        loadServices(selectedSalon.id);
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to delete service';
        setError(errorMessage);
      }
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon || !selectedTimeSlot) return;

    try {
      const bookingData = {
        salon_id: selectedSalon.id,
        service_id: parseInt(bookingForm.service_id),
        customer_name: bookingForm.customer_name,
        customer_email: bookingForm.customer_email,
        customer_phone: bookingForm.customer_phone,
        booking_date: bookingForm.booking_date,
        booking_time: selectedTimeSlot
      };

      await managerAPI.createBooking(bookingData);
      setShowBookingForm(false);
      setBookingForm({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        service_id: '',
        booking_date: '',
        booking_time: ''
      });
      setSelectedTimeSlot('');
      loadBookings(selectedSalon.id);
      // Invalidate availability queries for all salons to refresh available slots
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    } catch (error: any) {
      console.error('Error creating booking:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create booking';
      setError(errorMessage);
    }
  };

  const handleDeleteBooking = async (bookingId: number) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
      await managerAPI.deleteBooking(bookingId);
      loadBookings(selectedSalon.id);
      // Invalidate availability queries for all salons to refresh available slots
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      } catch (error: any) {
        console.error('Error deleting booking:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Failed to delete booking';
        setError(errorMessage);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Inline editing functions
  const startEditingSalon = () => {
    if (selectedSalon) {
      setEditingFormData({
        nome: selectedSalon.nome || '',
        telefone: selectedSalon.telefone || '',
        email: selectedSalon.email || '',
        website: selectedSalon.website || '',
        instagram: selectedSalon.instagram || '',
        regiao: selectedSalon.regiao || '',
        cidade: selectedSalon.cidade || '',
        rua: selectedSalon.rua || '',
        porta: selectedSalon.porta || '',
        cod_postal: selectedSalon.cod_postal || '',
        about: selectedSalon.about || '',
        latitude: selectedSalon.latitude || undefined,
        longitude: selectedSalon.longitude || undefined,
      });
      setIsEditingSalon(true);
      setEditingError('');
    }
  };

  const cancelEditingSalon = () => {
    setIsEditingSalon(false);
    // Reset form data to original salon data
    if (selectedSalon) {
      setEditingFormData({
        nome: selectedSalon.nome || '',
        telefone: selectedSalon.telefone || '',
        email: selectedSalon.email || '',
        website: selectedSalon.website || '',
        instagram: selectedSalon.instagram || '',
        regiao: selectedSalon.regiao || '',
        cidade: selectedSalon.cidade || '',
        rua: selectedSalon.rua || '',
        porta: selectedSalon.porta || '',
        cod_postal: selectedSalon.cod_postal || '',
        about: selectedSalon.about || '',
        latitude: selectedSalon.latitude || undefined,
        longitude: selectedSalon.longitude || undefined,
      });
    }
    setEditingError('');
  };

  const saveEditingSalon = async () => {
    if (!selectedSalon) return;
    
    setEditingLoading(true);
    setEditingError('');

    try {
      await managerAPI.updateSalon(selectedSalon.id, editingFormData);
      
      // Update local state - only update the specific salon being edited
      const updatedSalon = { ...selectedSalon, ...editingFormData };
      setSelectedSalon(updatedSalon);
      setSalons(salons.map(salon => 
        salon.id === selectedSalon.id ? updatedSalon : salon
      ));
      
      setIsEditingSalon(false);
      setSalonRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('Failed to save salon:', error);
      setEditingError(error.response?.data?.error || 'Failed to update salon');
    } finally {
      setEditingLoading(false);
    }
  };

  const handleEditingFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditingFormData({
      ...editingFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleMapLocationChange = (latitude: number, longitude: number) => {
    setEditingFormData({
      ...editingFormData,
      latitude,
      longitude
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('manager.dashboard')}</h1>
              <p className="text-gray-600">{t('manager.welcome')} {user?.name}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('manager.logout')}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Salon Selection */}
        {salons.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t('manager.selectSalon')}</h2>
              <button
                onClick={() => setShowSalonForm(true)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('manager.addNewSalon')}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {salons.map((salon) => (
                <div
                  key={salon.id}
                  onClick={() => setSelectedSalon(salon)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedSalon?.id === salon.id
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{salon.nome}</h3>
                      <p className="text-sm text-gray-600">{salon.cidade}, {salon.regiao}</p>
                      <p className="text-sm text-gray-500">{salon.telefone}</p>
                    </div>
                    <div className="ml-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        salon.booking_enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {salon.booking_enabled ? t('manager.bookingEnabled') : t('manager.bookingDisabled')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        {selectedSalon && (
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="border-b border-gray-200">
              {/* Mobile: Scrollable horizontal tabs */}
              <nav className="-mb-px flex space-x-4 sm:space-x-8 px-4 sm:px-6 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-sm whitespace-nowrap min-h-[48px] flex items-center ${
                    activeTab === 'bookings'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Calendar className="h-5 w-5 inline mr-2" />
                  {t('manager.bookings')}
                </button>
                <button
                  onClick={() => setActiveTab('salon')}
                  className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-sm whitespace-nowrap min-h-[48px] flex items-center ${
                    activeTab === 'salon'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Settings className="h-5 w-5 inline mr-2" />
                  {t('manager.servicesInfo')}
                </button>
                <button
                  onClick={() => setActiveTab('salon-info')}
                  className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-sm whitespace-nowrap min-h-[48px] flex items-center ${
                    activeTab === 'salon-info'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Building className="h-5 w-5 inline mr-2" />
                  {t('manager.salonInfo')}
                </button>
                <button
                  onClick={() => setActiveTab('opening-hours')}
                  className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-sm whitespace-nowrap min-h-[48px] flex items-center ${
                    activeTab === 'opening-hours'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Clock className="h-5 w-5 inline mr-2" />
                  {t('manager.openingHours')}
                </button>
                <button
                  onClick={() => setActiveTab('images')}
                  className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-sm whitespace-nowrap min-h-[48px] flex items-center ${
                    activeTab === 'images'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Camera className="h-5 w-5 inline mr-2" />
                  {t('manager.images')}
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Content */}
        {activeTab === 'bookings' && selectedSalon && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-gray-900" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{t('manager.totalBookings')}</p>
                    <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{t('manager.confirmed')}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {bookings.filter(b => b.status === 'confirmed').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <User className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{t('manager.pending')}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {bookings.filter(b => b.status === 'pending').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Clock className="h-6 w-6 text-gray-900" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{t('manager.completed')}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {bookings.filter(b => b.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Status Alert */}
            {!selectedSalon.booking_enabled && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      {t('manager.bookingDisabledAlert')}
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>{t('manager.enableBookingMessage')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bookings View Toggle */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {bookingViewMode === 'list' ? t('manager.recentBookings') : t('manager.bookingCalendar')}
                  </h2>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setBookingViewMode('list')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        bookingViewMode === 'list'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {t('manager.listView')}
                    </button>
                    <button
                      onClick={() => setBookingViewMode('calendar')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        bookingViewMode === 'calendar'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {t('manager.calendarView')}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (selectedSalon?.booking_enabled) {
                      setShowBookingForm(true);
                    } else {
                      setError('Booking is not enabled for this salon. Please enable booking in salon settings first.');
                    }
                  }}
                  disabled={!selectedSalon?.booking_enabled}
                  className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    selectedSalon?.booking_enabled
                      ? 'text-gray-900 bg-white border-gray-300 hover:bg-gray-50 hover:shadow-2xl hover:border-gray-500 hover:ring-2 hover:ring-gray-300 focus:ring-gray-900 transition-all duration-200'
                      : 'text-gray-400 bg-gray-300 border-gray-300 cursor-not-allowed'
                  }`}
                  title={!selectedSalon?.booking_enabled ? 'Booking is not enabled for this salon' : ''}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('manager.createBooking')}
                </button>
              </div>
              
              {bookingViewMode === 'list' ? (
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('manager.customer')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('manager.service')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('manager.dateTime')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('manager.duration')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('manager.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('manager.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          {t('manager.noBookingsFound')}
                        </td>
                      </tr>
                    ) : (
                      bookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {booking.customer_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {booking.customer_phone}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {services.find(service => service.service_id === booking.service_id)?.name || `Service ID: ${booking.service_id}`}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{booking.booking_date}</div>
                            <div className="text-sm text-gray-500">{booking.booking_time}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {booking.duration} min
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <select
                              value={booking.status}
                              onChange={(e) => handleUpdateBookingStatus(booking.id, e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleDeleteBooking(booking.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete booking"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              ) : (
                <div className="p-6">
                  <BookingCalendar
                    bookings={bookings.map(booking => ({
                      ...booking,
                      service: services.find(service => service.service_id === booking.service_id)
                    }))}
                    onDateSelect={setSelectedCalendarDate}
                    selectedDate={selectedCalendarDate}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'salon' && selectedSalon && (
          <div className="space-y-6">
            {/* Salon Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Salon Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Salon Name</label>
                      <p className="text-gray-900">{selectedSalon.nome}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <p className="text-gray-900">
                        {selectedSalon.rua && selectedSalon.porta && `${selectedSalon.rua}, ${selectedSalon.porta}`}
                        {selectedSalon.cod_postal && `, ${selectedSalon.cod_postal}`}
                        {selectedSalon.cidade && `, ${selectedSalon.cidade}`}
                        {selectedSalon.regiao && `, ${selectedSalon.regiao}`}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-gray-900">{selectedSalon.telefone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-gray-900">{selectedSalon.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Website</label>
                      <p className="text-gray-900">{selectedSalon.website || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedSalon.estado === 'Ativo' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedSalon.estado}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created</span>
                      <span className="text-gray-900">
                        {new Date(selectedSalon.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Services</h2>
                <button 
                  onClick={() => {
                    setEditingService(null);
                    setShowServiceForm(true);
                  }}
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </button>
              </div>
              
              {services.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No services added yet</p>
                  <p className="text-sm">Add your first service to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((service) => (
                    <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{service.name}</h4>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => {
                              setEditingService(service);
                              setShowServiceForm(true);
                            }}
                            className="text-gray-900 hover:text-gray-800"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">€{service.price}</span>
                        <span className="text-sm text-gray-500">{service.duration} min</span>
                      </div>
                      {service.is_bio_diamond && (
                        <div className="mt-2">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500 text-white">
                            BIO Diamond
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Salons Message */}
        {salons.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Building className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No salons yet</h3>
            <p className="text-gray-600 mb-6">Create your first salon to start managing bookings and services</p>
            <button
              onClick={() => setShowSalonForm(true)}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Salon
            </button>
          </div>
        )}

        {/* Forms */}
        {showSalonForm && (
          <SalonForm
            onClose={() => setShowSalonForm(false)}
            onSuccess={() => {
              loadSalons();
              setShowSalonForm(false);
            }}
          />
        )}

        {showServiceForm && selectedSalon && (
          <ServiceForm
            salonId={selectedSalon.id}
            onClose={() => {
              setShowServiceForm(false);
              setEditingService(null);
            }}
            onSuccess={() => {
              loadServices(selectedSalon.id);
              setShowServiceForm(false);
              setEditingService(null);
            }}
            editingService={editingService}
          />
        )}

        {/* Booking Form Modal */}
        {showBookingForm && selectedSalon && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Create New Booking</h3>
                  <button
                    onClick={() => {
                      setShowBookingForm(false);
                      setSelectedTimeSlot('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleCreateBooking} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                    <input
                      type="text"
                      value={bookingForm.customer_name}
                      onChange={(e) => setBookingForm({...bookingForm, customer_name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Email</label>
                    <input
                      type="email"
                      value={bookingForm.customer_email}
                      onChange={(e) => setBookingForm({...bookingForm, customer_email: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Phone</label>
                    <input
                      type="tel"
                      value={bookingForm.customer_phone}
                      onChange={(e) => setBookingForm({...bookingForm, customer_phone: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Service</label>
                    <select
                      value={bookingForm.service_id}
                      onChange={(e) => handleServiceChange(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    >
                      <option value="">Select a service</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.service_id}>
                          {service.name} - €{service.price}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                      type="date"
                      value={bookingForm.booking_date}
                      onChange={(e) => handleDateChange(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Time
                    </label>
                    {!bookingForm.booking_date ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">Please select a date first</p>
                      </div>
                    ) : availabilityLoading ? (
                      <div className="text-center py-4">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                        <p className="text-sm text-gray-500 mt-2">Loading available times...</p>
                      </div>
                    ) : timeSlots.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {timeSlots.map((slot) => (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => slot.available && setSelectedTimeSlot(slot.time)}
                            disabled={!slot.available}
                            className={`py-3 px-2 text-sm font-medium rounded-lg border transition-colors min-h-[48px] ${
                              !slot.available
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : isSlotHighlighted(slot.time)
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 active:bg-gray-100'
                            }`}
                            title={!slot.available ? 'This time slot is already booked' : ''}
                          >
                            <div className="flex flex-col items-center justify-center h-full">
                              <span>{slot.time}</span>
                              <span className="text-xs text-gray-400 mt-1 h-4">
                                {!slot.available ? 'Reserved' : ''}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">No time slots available for this date</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBookingForm(false);
                        setSelectedTimeSlot('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-800"
                    >
                      Create Booking
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Salon Information Tab */}
        {activeTab === 'salon-info' && selectedSalon && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{color: '#2a2a2e'}}>Salon Information</h2>
                {!isEditingSalon ? (
                  <button
                    onClick={startEditingSalon}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white hover:opacity-90 transition-all duration-200"
                    style={{backgroundColor: '#2a2a2e'}}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Information
                  </button>
                ) : (
                  <div className="flex space-x-3">
                    <button
                      onClick={cancelEditingSalon}
                      className="inline-flex items-center px-6 py-3 text-sm font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditingSalon}
                      disabled={editingLoading}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white hover:opacity-90 transition-all duration-200 disabled:opacity-50"
                      style={{backgroundColor: '#2a2a2e'}}
                    >
                      {editingLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : null}
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              {editingError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {editingError}
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-bold mb-4" style={{color: '#2a2a2e'}}>Basic Information</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>Salon Name *</label>
                          {isEditingSalon ? (
                            <input
                              type="text"
                              name="nome"
                              value={editingFormData.nome}
                              onChange={handleEditingFieldChange}
                              required
                              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                            />
                          ) : (
                            <p style={{color: '#2a2a2e'}}>{selectedSalon.nome}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>Phone</label>
                          {isEditingSalon ? (
                            <input
                              type="tel"
                              name="telefone"
                              value={editingFormData.telefone}
                              onChange={handleEditingFieldChange}
                              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                            />
                          ) : (
                            <p style={{color: '#2a2a2e'}}>{selectedSalon.telefone || 'Not provided'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>Email</label>
                          {isEditingSalon ? (
                            <input
                              type="email"
                              name="email"
                              value={editingFormData.email}
                              onChange={handleEditingFieldChange}
                              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                            />
                          ) : (
                            <p style={{color: '#2a2a2e'}}>{selectedSalon.email || 'Not provided'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>Website</label>
                          {isEditingSalon ? (
                            <input
                              type="text"
                              name="website"
                              value={editingFormData.website}
                              onChange={handleEditingFieldChange}
                              placeholder="Enter website URL (e.g., www.biobeauty.pt)"
                              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                            />
                          ) : (
                            <p style={{color: '#2a2a2e'}}>{selectedSalon.website || 'Not provided'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>Instagram</label>
                          {isEditingSalon ? (
                            <input
                              type="text"
                              name="instagram"
                              value={editingFormData.instagram}
                              onChange={handleEditingFieldChange}
                              placeholder="Enter Instagram URL (e.g., instagram.com/yourusername)"
                              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                            />
                          ) : (
                            selectedSalon.instagram ? (
                              <a 
                                href={selectedSalon.instagram} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:opacity-75 underline transition-opacity"
                                style={{color: '#2a2a2e'}}
                              >
                                {selectedSalon.instagram}
                              </a>
                            ) : (
                              <p style={{color: '#2a2a2e'}}>Not provided</p>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold mb-4" style={{color: '#2a2a2e'}}>Address</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>Region</label>
                          {isEditingSalon ? (
                            <input
                              type="text"
                              name="regiao"
                              value={editingFormData.regiao}
                              onChange={handleEditingFieldChange}
                              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                            />
                          ) : (
                            <p style={{color: '#2a2a2e'}}>{selectedSalon.regiao || 'Not provided'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>City</label>
                          {isEditingSalon ? (
                            <input
                              type="text"
                              name="cidade"
                              value={editingFormData.cidade}
                              onChange={handleEditingFieldChange}
                              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                            />
                          ) : (
                            <p style={{color: '#2a2a2e'}}>{selectedSalon.cidade || 'Not provided'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>Street</label>
                          {isEditingSalon ? (
                            <input
                              type="text"
                              name="rua"
                              value={editingFormData.rua}
                              onChange={handleEditingFieldChange}
                              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                            />
                          ) : (
                            <p style={{color: '#2a2a2e'}}>{selectedSalon.rua || 'Not provided'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>Door Number</label>
                          {isEditingSalon ? (
                            <input
                              type="text"
                              name="porta"
                              value={editingFormData.porta}
                              onChange={handleEditingFieldChange}
                              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                            />
                          ) : (
                            <p style={{color: '#2a2a2e'}}>{selectedSalon.porta || 'Not provided'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>Postal Code</label>
                          {isEditingSalon ? (
                            <input
                              type="text"
                              name="cod_postal"
                              value={editingFormData.cod_postal}
                              onChange={handleEditingFieldChange}
                              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                            />
                          ) : (
                            <p style={{color: '#2a2a2e'}}>{selectedSalon.cod_postal || 'Not provided'}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="lg:col-span-1">
                  <h3 className="text-lg font-bold mb-4" style={{color: '#2a2a2e'}}>Location</h3>
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <LeafletSalonMap
                      key={`salon-map-${selectedSalon.id}-${isEditingSalon ? 'edit' : 'view'}`}
                      latitude={isEditingSalon ? editingFormData.latitude : selectedSalon.latitude}
                      longitude={isEditingSalon ? editingFormData.longitude : selectedSalon.longitude}
                      salonName={isEditingSalon ? editingFormData.nome : selectedSalon.nome}
                      address={`${isEditingSalon ? editingFormData.rua : selectedSalon.rua || ''} ${isEditingSalon ? editingFormData.porta : selectedSalon.porta || ''}, ${isEditingSalon ? editingFormData.cod_postal : selectedSalon.cod_postal || ''}, ${isEditingSalon ? editingFormData.cidade : selectedSalon.cidade || 'Porto'}, ${isEditingSalon ? editingFormData.regiao : selectedSalon.regiao || ''}, Portugal`}
                      height="300px"
                      isEditable={isEditingSalon}
                      onLocationChange={handleMapLocationChange}
                    />
                  </div>
                  {(isEditingSalon ? editingFormData.latitude : selectedSalon.latitude) && (isEditingSalon ? editingFormData.longitude : selectedSalon.longitude) && (
                    <p className="text-xs text-gray-500 mt-2">
                      Coordinates: {(isEditingSalon ? editingFormData.latitude : selectedSalon.latitude)?.toFixed(6)}, {(isEditingSalon ? editingFormData.longitude : selectedSalon.longitude)?.toFixed(6)}
                    </p>
                  )}
                  {isEditingSalon && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium" style={{color: '#2a2a2e'}}>
                        💡 The map will automatically center on your address. Click and drag the marker to set the exact location.
                      </p>
                      <p className="text-xs text-gray-500">
                        Make sure the marker is precisely positioned at your salon's entrance.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* About Section */}
              <div className="mt-6">
                <h3 className="text-lg font-bold mb-4" style={{color: '#2a2a2e'}}>About</h3>
                {isEditingSalon ? (
                  <div>
                    <textarea
                      name="about"
                      value={editingFormData.about}
                      onChange={handleEditingFieldChange}
                      rows={4}
                      placeholder="Welcome to our salon! We specialize in professional nail care, beauty treatments, and exceptional customer service. Our experienced team is dedicated to providing you with the highest quality services in a relaxing and comfortable environment. We use only premium products and the latest techniques to ensure you leave feeling beautiful and refreshed. Book your appointment today and experience the difference!"
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This text will be displayed on your salon's public page
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    {selectedSalon.about ? (
                      <p className="leading-relaxed whitespace-pre-wrap" style={{color: '#2a2a2e'}}>{selectedSalon.about}</p>
                    ) : (
                      <p className="text-gray-500 italic">No about information provided yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Opening Hours Tab */}
        {activeTab === 'opening-hours' && selectedSalon && (
          <OpeningHoursDisplay 
            key={`opening-hours-${selectedSalon.id}`}
            salon={selectedSalon}
            onEdit={() => setShowOpeningHoursForm(true)}
            refreshTrigger={openingHoursRefreshTrigger}
          />
        )}

        {/* Images Tab */}
        {activeTab === 'images' && selectedSalon && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <SalonImageManager
              salonId={selectedSalon.id}
              salonName={selectedSalon.nome}
              images={selectedSalon.images || []}
              onImagesChange={(images) => {
                // Update local state immediately for better UX
                setSelectedSalon({ ...selectedSalon, images });
                setSalons(salons.map(salon => 
                  salon.id === selectedSalon.id 
                    ? { ...salon, images } 
                    : salon
                ));
                
                // Refresh salon data from server to ensure consistency
                loadSalons();
              }}
            />
          </div>
        )}

        {/* Modals */}
        {showOpeningHoursForm && selectedSalon && (
          <OpeningHoursForm
            salon={selectedSalon}
            onClose={() => setShowOpeningHoursForm(false)}
            onSuccess={() => {
              setShowOpeningHoursForm(false);
              // Trigger refresh of opening hours display
              setOpeningHoursRefreshTrigger(prev => prev + 1);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;