import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, User, Phone, Mail, Check, AlertCircle } from 'lucide-react';
import { placeAPI, bookingAPI, campaignAPI, getImageUrl } from '../utils/api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import SalonImageGallery from '../components/salon/SalonImageGallery';
// Inline types to avoid import issues
interface CampaignInfo {
  campaign_id: number;
  name: string;
  banner_message: string;
  campaign_type: string;
  discount_type?: string;
  discount_value?: number;
  rewards_multiplier?: number;
  rewards_bonus_points?: number;
}

interface BookingRequest {
  salon_id: number;
  service_ids: number[]; // Changed to array for multiple services
  employee_id: number; // Made required
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  booking_date: string;
  booking_time: string;
  any_employee_selected?: boolean;
  
  // Campaign fields
  campaign_id?: number;
  campaign_name?: string;
  campaign_type?: string;
  campaign_discount_type?: string;
  campaign_discount_value?: number;
  campaign_banner_message?: string;
}

const BookingPage: React.FC = () => {
  const { placeId } = useParams<{ placeId: string }>();
  const salonIdNum = parseInt(placeId || '0');
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<number[]>([]); // Changed to array for multiple services
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingError, setBookingError] = useState<string>('');
  
  // Filtered data based on selections
  const [filteredEmployees, setFilteredEmployees] = useState<PlaceEmployee[]>([]);
  const [filteredServices, setFilteredServices] = useState<PlaceService[]>([]);
  const [isFilteringEmployees, setIsFilteringEmployees] = useState(false);
  const [isFilteringServices, setIsFilteringServices] = useState(false);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [salonIdNum]);

  // Pre-fill customer information from authenticated user
  useEffect(() => {
    if (user) {
      setCustomerInfo({
        name: user.name || '',
        email: user.email || '',
        phone: '' // Phone is not stored in user context, so leave empty
      });
    }
  }, [user]);

  const { data: place, isLoading } = useQuery({
    queryKey: ['place', salonIdNum],
    queryFn: () => placeAPI.getPlace(salonIdNum),
    enabled: salonIdNum > 0
  });

  // Filter employees based on selected services
  useEffect(() => {
    const filterEmployeesByServices = async () => {
      if (selectedServices.length === 0) {
        // If no services selected, show all employees
        setFilteredEmployees(place?.employees || []);
        return;
      }

      setIsFilteringEmployees(true);
      try {
        // Get employees for the first selected service (for now, we'll use the first service)
        // In a more complex implementation, we could find employees who can do ALL selected services
        const serviceId = selectedServices[0];
        const employees = await placeAPI.getEmployeesByService(salonIdNum, serviceId);
        setFilteredEmployees(employees);
      } catch (error) {
        console.error('Error filtering employees by service:', error);
        // Fallback to showing all employees
        setFilteredEmployees(place?.employees || []);
      } finally {
        setIsFilteringEmployees(false);
      }
    };

    if (place?.employees && salonIdNum > 0) {
      filterEmployeesByServices();
    }
  }, [selectedServices, place?.employees, salonIdNum]);

  // Filter services based on selected employee
  useEffect(() => {
    const filterServicesByEmployee = async () => {
      if (!selectedEmployee) {
        // If no employee selected, show all services
        setFilteredServices(place?.services || []);
        return;
      }

      setIsFilteringServices(true);
      try {
        const services = await placeAPI.getServicesByEmployee(salonIdNum, selectedEmployee);
        setFilteredServices(services);
      } catch (error) {
        console.error('Error filtering services by employee:', error);
        // Fallback to showing all services
        setFilteredServices(place?.services || []);
      } finally {
        setIsFilteringServices(false);
      }
    };

    if (place?.services && salonIdNum > 0) {
      filterServicesByEmployee();
    }
  }, [selectedEmployee, place?.services, salonIdNum]);

  // Debug logging
  console.log('Place data:', place);
  console.log('Services:', place?.services);
  console.log('Employees:', place?.employees);

  // Fetch available time slots based on selected date, services, and employee
  const { data: availabilityData, isLoading: availabilityLoading } = useQuery({
    queryKey: ['availability', salonIdNum, selectedDate, selectedServices, selectedEmployee],
    queryFn: () => placeAPI.getAvailability(salonIdNum, selectedDate, selectedServices.length > 0 ? selectedServices[0] : undefined, selectedEmployee || undefined),
    enabled: !!selectedDate && salonIdNum > 0 && selectedServices.length > 0
  });

  // Fetch active campaigns for this place
  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns', salonIdNum],
    queryFn: () => campaignAPI.getActiveCampaigns(salonIdNum),
    enabled: salonIdNum > 0
  });

  const timeSlots = availabilityData?.time_slots || [];
  const availableSlots = availabilityData?.available_slots || [];
  const activeCampaigns = campaignsData || [];
  
  // Debug logging for availability data
  console.log('Availability data:', availabilityData);
  console.log('Active campaigns:', activeCampaigns);
  console.log('Campaign structure:', activeCampaigns[0]);
  if (activeCampaigns[0]) {
    console.log('Campaign config:', activeCampaigns[0].config);
    console.log('Campaign start_datetime:', activeCampaigns[0].start_datetime);
    console.log('Campaign end_datetime:', activeCampaigns[0].end_datetime);
  }

  // Function to check if a campaign applies to a specific time slot
  const getCampaignsForSlot = (slot: string) => {
    if (!activeCampaigns || !selectedDate) return [];
    
    const slotDateTime = new Date(`${selectedDate}T${slot}:00Z`);
    const applicableCampaigns = [];
    
    for (const campaign of activeCampaigns) {
      // Check if campaign is active at this time
      // Handle both string and Date formats for start/end times
      let startTime, endTime;
      
      if (typeof campaign.start_datetime === 'string') {
        startTime = new Date(campaign.start_datetime);
      } else {
        startTime = campaign.start_datetime;
      }
      
      if (typeof campaign.end_datetime === 'string') {
        endTime = new Date(campaign.end_datetime);
      } else {
        endTime = campaign.end_datetime;
      }
      
      // Debug logging for this campaign
      if (slot === '09:00') {
        console.log('Debug campaign time comparison:', {
          campaign: campaign.name,
          slotDateTime,
          startTime,
          endTime,
          startTimeString: campaign.start_datetime,
          endTimeString: campaign.end_datetime,
          isActive: slotDateTime >= startTime && slotDateTime <= endTime
        });
      }
      
      if (slotDateTime >= startTime && slotDateTime <= endTime) {
        applicableCampaigns.push({
          campaign_id: campaign.id,
          name: campaign.name,
          banner_message: campaign.banner_message,
          campaign_type: campaign.campaign_type,
          discount_type: campaign.discount_type,
          discount_value: campaign.discount_value,
          rewards_multiplier: campaign.rewards_multiplier,
          rewards_bonus_points: campaign.rewards_bonus_points
        });
      }
    }
    
    return applicableCampaigns;
  };

  // Function to handle service selection (toggle)
  const handleServiceToggle = (serviceId: number) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  // Function to handle employee selection
  const handleEmployeeSelect = (employeeId: number | null) => {
    setSelectedEmployee(employeeId);
    // Clear selected services when employee changes to avoid conflicts
    if (employeeId !== null) {
      setSelectedServices([]);
    }
  };

  // Function to calculate total price for selected services
  const calculateTotalPrice = () => {
    if (!place?.services || selectedServices.length === 0) return 0;
    return selectedServices.reduce((total, serviceId) => {
      const service = place.services.find(s => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
  };

  // Function to calculate total duration for selected services
  const calculateTotalDuration = () => {
    if (!place?.services || selectedServices.length === 0) return 0;
    return selectedServices.reduce((total, serviceId) => {
      const service = place.services.find(s => s.id === serviceId);
      return total + (service?.duration || 0);
    }, 0);
  };

  // Function to check if a slot should be highlighted based on selected time and service duration
  const isSlotHighlighted = (slotTime: string) => {
    if (!selectedTime || selectedServices.length === 0) return false;
    
    const totalDuration = calculateTotalDuration();
    const selectedTimeMinutes = timeToMinutes(selectedTime);
    const slotTimeMinutes = timeToMinutes(slotTime);
    
    // Check if this slot is within the total service duration from the selected start time
    return slotTimeMinutes >= selectedTimeMinutes && 
           slotTimeMinutes < selectedTimeMinutes + totalDuration;
  };

  // Function to check if a slot should be blocked due to service duration
  const isSlotBlockedByDuration = (slotTime: string) => {
    if (!selectedTime || selectedServices.length === 0) return false;
    
    const totalDuration = calculateTotalDuration();
    const selectedTimeMinutes = timeToMinutes(selectedTime);
    const slotTimeMinutes = timeToMinutes(slotTime);
    
    // Block slots that are after the selected time but within the service duration
    return slotTimeMinutes > selectedTimeMinutes && 
           slotTimeMinutes < selectedTimeMinutes + totalDuration;
  };

  // Function to check if a slot is actually available (not booked and not blocked by duration)
  const isSlotActuallyAvailable = (slotTime: string) => {
    const isAvailable = availableSlots.includes(slotTime);
    const isBlockedByDuration = isSlotBlockedByDuration(slotTime);
    return isAvailable && !isBlockedByDuration;
  };

  // Helper function to convert time string to minutes
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const createBookingMutation = useMutation({
    mutationFn: (bookingData: BookingRequest) => bookingAPI.createBooking(bookingData),
    onSuccess: () => {
      setShowConfirmation(true);
      setBookingError('');
      // Invalidate availability query to refresh available slots
      queryClient.invalidateQueries({ queryKey: ['availability', salonIdNum, selectedDate] });
    },
    onError: (error: any) => {
      setBookingError(error.response?.data?.error || t('booking.error'));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure employee_id is also present and at least one service is selected
    if (selectedDate && selectedTime && selectedServices.length > 0 && customerInfo.name && customerInfo.email && customerInfo.phone) {
      let employeeIdToUse: number;
      let anyEmployeeSelectedFlag: boolean = false;

      if (selectedEmployee === null) {
        // "Any Available Employee" selected
        // Set employee_id to 0 to signal the backend to find any available employee
        employeeIdToUse = 0; 
        anyEmployeeSelectedFlag = true;
      } else {
        employeeIdToUse = selectedEmployee;
      }

      // Check if selected time has active campaigns
      const slotCampaigns = getCampaignsForSlot(selectedTime);
      const activeCampaign = slotCampaigns.length > 0 ? slotCampaigns[0] : null;

      const bookingData: BookingRequest = {
        salon_id: salonIdNum,
        service_ids: selectedServices, // Changed to array
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        booking_date: selectedDate,
        booking_time: selectedTime,
        employee_id: employeeIdToUse,
        any_employee_selected: anyEmployeeSelectedFlag,
        // Include campaign data if available
        campaign_id: activeCampaign?.campaign_id,
        campaign_name: activeCampaign?.name,
        campaign_type: activeCampaign?.campaign_type,
        campaign_discount_type: activeCampaign?.discount_type,
        campaign_discount_value: activeCampaign?.discount_value,
        campaign_banner_message: activeCampaign?.banner_message,
      };
      
      createBookingMutation.mutate(bookingData);
    } else {
      setBookingError(t('booking.allFieldsRequired')); // New error message for missing fields
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Fractal%20Glass%20-%204.jpg-8QPt1A02QgjJIeTqwEYV5thwZXXEGT.jpeg')`,
          }}
        />
        <div className="bg-black/30 absolute inset-0" />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="text-white mt-4 text-center">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="h-screen relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Fractal%20Glass%20-%204.jpg-8QPt1A02QgjJIeTqwEYV5thwZXXEGT.jpeg')`,
          }}
        />
        <div className="bg-black/30 absolute inset-0" />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">{t('place.notFound')}</h2>
            <Link to="/search" className="bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/40 text-white transition-all duration-700 ease-out hover:scale-[1.02] px-6 py-3 rounded-xl font-medium">
              {t('place.backToSearch')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formatAddress = () => {
    const parts: string[] = [];
    if (place?.rua) parts.push(place.rua);
    if (place?.porta) parts.push(place.porta);
    if (place?.cod_postal) parts.push(place.cod_postal);
    if (place?.cidade) parts.push(place.cidade);
    return parts.join(', ');
  };

  if (showConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{backgroundColor: '#2a2a2e'}}>
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t('booking.bookingConfirmed')}</h2>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">
            {t('booking.appointmentBooked')}
          </p>
          <div className="space-y-3">
            <Link to="/" className="btn-primary w-full block text-sm sm:text-base">
              {t('booking.backToHome')}
            </Link>
            <Link to={`/place/${place.id}`} className="btn-secondary w-full block text-sm sm:text-base">
              {t('booking.viewPlaceDetails')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-gray">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-form p-6 mb-6">
          <h1 className="text-3xl font-bold text-charcoal mb-2 font-display">{t('booking.bookAppointment')}</h1>
          <h2 className="text-xl text-charcoal/80 font-body">{place.nome}</h2>
          {formatAddress() && (
            <p className="text-charcoal/60 font-body">{formatAddress()}</p>
          )}
        </div>

        {/* Place Image Gallery */}
        {place.images && place.images.length > 0 && (
          <div className="mb-6">
            <SalonImageGallery 
              images={place.images} 
              salonName={place.nome}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Booking Form */}
          <div className="bg-white rounded-lg shadow-form p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-charcoal mb-6 font-display">{t('booking.selectYourAppointment')}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {bookingError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">{t('booking.bookingError')}</h3>
                    <p className="text-sm text-red-700 mt-1">{bookingError}</p>
                  </div>
                </div>
              )}
              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2 font-body">
                  {t('booking.selectServices')} {selectedServices.length > 0 && `(${selectedServices.length} selected)`}
                  {selectedEmployee && (
                    <span className="text-xs text-bright-blue ml-2">
                      (Filtered for selected employee)
                    </span>
                  )}
                </label>
                <div className="space-y-2">
                  {isFilteringServices ? (
                    <div className="p-3 border border-medium-gray rounded-lg bg-light-gray">
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-bright-blue mr-2"></div>
                        <p className="text-sm text-charcoal/60 font-body">Filtering services...</p>
                      </div>
                    </div>
                  ) : filteredServices && filteredServices.length > 0 ? (
                    filteredServices.map((service) => {
                      const isSelected = selectedServices.includes(service.id);
                      return (
                        <label 
                          key={service.id} 
                          className={`flex items-center p-3 border rounded-lg hover:bg-light-gray cursor-pointer transition-all duration-200 ${
                            isSelected 
                              ? 'border-bright-blue border-2 bg-light-gray' 
                              : 'border-medium-gray hover:border-bright-blue'
                          }`}
                        >
                          <input
                            type="checkbox"
                            name="services"
                            value={service.id}
                            checked={isSelected}
                            onChange={() => handleServiceToggle(service.id)}
                            className="h-4 w-4 text-bright-blue focus:ring-bright-blue border-medium-gray"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-charcoal font-body">{service.name}</p>
                                <p className="text-sm text-charcoal/60 font-body">{service.description}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-charcoal font-body">€{service.price}</p>
                                <p className="text-xs text-charcoal/60 font-body">{service.duration} min</p>
                              </div>
                            </div>
                            {service.is_bio_diamond && (
                              <span className="inline-block mt-1 bg-soft-yellow text-charcoal text-xs px-2 py-1 rounded-full font-body">
                                BIO Diamond
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <div className="p-3 border border-medium-gray rounded-lg bg-light-gray">
                      <p className="text-sm text-charcoal/60 font-body">
                        {selectedEmployee 
                          ? 'No services available for the selected employee' 
                          : place?.services 
                            ? 'Nenhum serviço disponível' 
                            : 'Carregando serviços...'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Employee Selection */}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2 font-body">
                  {t('booking.selectEmployee')}
                  {selectedServices.length > 0 && (
                    <span className="text-xs text-bright-blue ml-2">
                      (Filtered for selected services)
                    </span>
                  )}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border border-medium-gray rounded-lg hover:bg-light-gray cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="employee"
                      value="any"
                      checked={selectedEmployee === null}
                      onChange={() => handleEmployeeSelect(null)}
                      className="h-4 w-4 text-bright-blue focus:ring-bright-blue border-medium-gray"
                    />
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-charcoal font-body">{t('booking.anyAvailableEmployee')}</p>
                      <p className="text-sm text-charcoal/60 font-body">{t('booking.anyAvailableEmployeeDesc')}</p>
                    </div>
                  </label>
                  {isFilteringEmployees ? (
                    <div className="p-3 border border-medium-gray rounded-lg bg-light-gray">
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-bright-blue mr-2"></div>
                        <p className="text-sm text-charcoal/60 font-body">Filtering employees...</p>
                      </div>
                    </div>
                  ) : filteredEmployees && filteredEmployees.length > 0 ? (
                    filteredEmployees.map((employee) => (
                      <label key={employee.id} className="flex items-center p-3 border border-medium-gray rounded-lg hover:bg-light-gray cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="employee"
                          value={employee.id}
                          checked={selectedEmployee === employee.id}
                          onChange={(e) => handleEmployeeSelect(parseInt(e.target.value))}
                          className="h-4 w-4 text-bright-blue focus:ring-bright-blue border-medium-gray"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center space-x-3">
                            {/* Employee Photo */}
                            <div className="flex-shrink-0">
                              {employee.photo_url ? (
                                <div 
                                  className="h-10 w-10 rounded-full overflow-hidden shadow-sm border-2"
                                  style={{ borderColor: employee.color_code || '#1E90FF' }}
                                >
                                  <img
                                    src={`${getImageUrl(employee.photo_url)}?t=${encodeURIComponent((employee as any).updated_at || '')}`}
                                    alt={employee.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.warn('Employee photo failed to load:', employee.photo_url);
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div 
                                  className="h-10 w-10 rounded-full flex items-center justify-center shadow-sm"
                                  style={{ backgroundColor: employee.color_code || '#3B82F6' }}
                                >
                                  <span className="text-white font-semibold text-sm">
                                    {employee.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Employee Info */}
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium text-charcoal font-body">{employee.name}</p>
                                  {employee.specialty && (
                                    <p className="text-sm text-charcoal/60 font-body">{employee.specialty}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-charcoal/60 font-body">{employee.email}</p>
                                  <p className="text-xs text-charcoal/60 font-body">{employee.phone}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="p-3 border border-medium-gray rounded-lg bg-light-gray">
                      <p className="text-sm text-charcoal/60 font-body">
                        {selectedServices.length > 0 
                          ? 'No employees available for the selected services' 
                          : place?.employees 
                            ? 'Nenhum funcionário disponível' 
                            : 'Carregando funcionários...'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2 font-body">
                  {t('booking.selectDate')}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime(''); // Clear selected time when date changes
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-field"
                  required
                />
              </div>

              {/* Time Selection */}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2 font-body">
                  {t('booking.selectTime')}
                </label>
                
                {/* Time-off Notice */}
                {availabilityData?.reason && availabilityData.reason.includes('time-off') && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-800">
                          <strong>Limited availability:</strong> Some employees are on time-off. Available slots may be reduced.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {!selectedDate ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-charcoal/60 font-body">{t('booking.pleaseSelectDateFirst')}</p>
                  </div>
                ) : availabilityLoading ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-bright-blue"></div>
                    <p className="text-sm text-charcoal/60 font-body mt-2">{t('booking.loadingAvailableTimes')}</p>
                  </div>
                ) : timeSlots.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {timeSlots.map((slot, index) => {
                      // Check if this slot is available
                      const isAvailable = availableSlots.includes(slot);
                      const isBlockedByDuration = isSlotBlockedByDuration(slot);
                      const isActuallyAvailable = isSlotActuallyAvailable(slot);
                      
                      // Check if slot has active campaigns
                      const slotCampaigns = getCampaignsForSlot(slot);
                      const hasCampaign = slotCampaigns.length > 0;
                      
                      // Debug logging for this slot
                      if (slot === '09:00') {
                        console.log('Debug 09:00 slot:', {
                          slot,
                          slotCampaigns,
                          hasCampaign,
                          selectedServices,
                          activeCampaigns
                        });
                      }
                      
                      // Determine campaign border color
                      let campaignBorderClass = '';
                      let campaignBadge = null;
                      if (hasCampaign && isActuallyAvailable) {
                        // Use orange color to match campaign banner
                        campaignBorderClass = 'border-orange-500 border-2';
                        campaignBadge = <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] px-1 rounded-full font-bold">●</span>;
                      }
                      
                      // Build tooltip text
                      let tooltipText = '';
                      if (!isAvailable) {
                        tooltipText = t('booking.thisTimeSlotBooked');
                      } else if (isBlockedByDuration) {
                        tooltipText = t('booking.blockedByServiceDuration');
                      } else if (hasCampaign && isActuallyAvailable) {
                        const campaign = slotCampaigns[0];
                        tooltipText = `${campaign.banner_message}`;
                        if (campaign.discount_value) {
                          tooltipText += ` - ${campaign.discount_value}${campaign.discount_type === 'percentage' ? '%' : '€'} off`;
                        }
                      }
                      
                      return (
                        <div key={`${slot}-${index}`} className="relative">
                          <button
                            type="button"
                            onClick={() => isActuallyAvailable && setSelectedTime(slot)}
                            disabled={!isActuallyAvailable}
                            className={`w-full py-3 px-2 text-sm font-medium rounded-lg border transition-colors min-h-[48px] font-body ${
                              !isAvailable
                                ? 'bg-light-gray text-charcoal/40 border-medium-gray cursor-not-allowed'
                                : isBlockedByDuration
                                ? 'bg-light-gray text-charcoal/40 border-medium-gray cursor-not-allowed'
                                : isSlotHighlighted(slot)
                                ? 'bg-bright-blue text-white border-bright-blue'
                                : hasCampaign
                                ? `bg-white text-charcoal hover:bg-light-gray active:bg-light-gray ${campaignBorderClass}`
                                : 'bg-white text-charcoal border-medium-gray hover:bg-light-gray active:bg-light-gray hover:border-bright-blue'
                            }`}
                            title={tooltipText}
                          >
                            <div className="flex flex-col items-center justify-center h-full">
                              <span>{slot}</span>
                              <span className="text-xs mt-1 text-charcoal/40 h-4">
                                {!isAvailable ? t('booking.reserved') : isBlockedByDuration ? t('booking.blocked') : ''}
                              </span>
                            </div>
                          </button>
                          {campaignBadge}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-charcoal/60 font-body">{t('booking.noAvailableTimeSlots')}</p>
                    <p className="text-xs text-charcoal/40 font-body mt-1">{t('booking.pleaseSelectDifferentDate')}</p>
                  </div>
                )}
              </div>

              {/* Customer Information */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-charcoal font-display">{t('booking.yourInformation')}</h4>
                
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2 font-body">
                    {t('booking.fullName')}
                  </label>
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2 font-body">
                    {t('booking.email')}
                  </label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2 font-body">
                    {t('booking.phoneNumber')}
                  </label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedDate || !selectedTime || selectedServices.length === 0 || !customerInfo.name || !customerInfo.email || !customerInfo.phone || createBookingMutation.isPending}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createBookingMutation.isPending ? t('booking.creatingBooking') : t('booking.confirmBooking')}
              </button>
            </form>
          </div>

          {/* Booking Summary */}
          <div className="space-y-6">
            {/* Salon Info */}
            <div className="bg-white rounded-lg shadow-form p-6">
              <h3 className="text-lg font-semibold text-charcoal mb-4 font-display">{t('booking.salonInformation')}</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-charcoal/60 mr-3" />
                  <span className="text-charcoal/80 font-body">{place.nome}</span>
                </div>
                {formatAddress() && (
                  <div className="flex items-center">
                    <span className="text-charcoal/80 font-body">{formatAddress()}</span>
                  </div>
                )}
                {place.telefone && (
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-charcoal/60 mr-3" />
                    <a href={`tel:${place.telefone}`} className="text-charcoal/80 hover:text-charcoal font-body transition-colors">
                      {place.telefone}
                    </a>
                  </div>
                )}
                {place.email && (
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-charcoal/60 mr-3" />
                    <a href={`mailto:${place.email}`} className="text-charcoal/80 hover:text-charcoal font-body transition-colors">
                      {place.email}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Summary */}
            {(selectedDate || selectedTime || selectedServices.length > 0) && (
              <div className="bg-white rounded-lg shadow-form p-6">
                <h3 className="text-lg font-semibold text-charcoal mb-4 font-display">{t('booking.bookingSummary')}</h3>
                <div className="space-y-3">
                  {selectedServices.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-charcoal font-body">{t('booking.selectedServices')}</h4>
                      {selectedServices.map(serviceId => {
                        const service = place.services?.find(s => s.id === serviceId);
                        return service ? (
                          <div key={serviceId} className="flex justify-between text-sm">
                            <span className="text-charcoal/80 font-body">{service.name}</span>
                            <span className="font-semibold text-charcoal font-body">€{service.price}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                  {selectedDate && (
                    <div className="flex justify-between">
                      <span className="text-charcoal/80 font-body">{t('booking.date')}</span>
                      <span className="font-semibold text-charcoal font-body">{selectedDate}</span>
                    </div>
                  )}
                  {selectedTime && (
                    <div className="flex justify-between">
                      <span className="text-charcoal/80 font-body">{t('booking.time')}</span>
                      <span className="font-semibold text-charcoal font-body">{selectedTime}</span>
                    </div>
                  )}
                  {selectedServices.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-charcoal/80 font-body">{t('booking.totalDuration')}</span>
                      <span className="font-semibold text-charcoal font-body">
                        {calculateTotalDuration()} min
                      </span>
                    </div>
                  )}
                  <hr className="my-3 border-medium-gray" />
                  {selectedServices.length > 0 && (
                    <div className="flex justify-between text-lg font-bold text-charcoal font-display">
                      <span>{t('booking.total')}</span>
                      <span>€{calculateTotalPrice()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;