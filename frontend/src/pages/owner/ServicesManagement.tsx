import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, PencilIcon, TrashIcon, UserGroupIcon, BuildingOfficeIcon, MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { ownerAPI } from '../../utils/api';

interface Service {
  id: number;
  business_id: number;
  name: string;
  description?: string | null;
  price?: number | null;
  duration?: number | null;
  is_bookable: boolean;
  is_active: boolean;
  assigned_employees?: string[];
  category?: string;
  is_bio_diamond?: boolean;
}

interface Place {
  id: number;
  name: string;
  location_type: 'fixed' | 'mobile';
  city?: string;
  service_areas?: string[];
}

const ServicesManagement: React.FC = () => {
  const { t } = useTranslation();
  const [places, setPlaces] = useState<Place[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    is_bookable: true
  });

  useEffect(() => {
    fetchPlaces();
    
    // Refresh places every 30 seconds to ensure we have the latest data
    const interval = setInterval(() => {
      console.log('🔄 Refreshing places data...');
      fetchPlaces();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedPlaceId) {
      fetchServices(selectedPlaceId);
      // Find and set the selected place object
      const place = places.find(p => p.id === selectedPlaceId);
      setSelectedPlace(place || null);
    }
  }, [selectedPlaceId, places]);

  useEffect(() => {
    console.log('🔍 Services state changed:', services, 'Length:', services.length);
  }, [services]);

  // Search functionality
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPlaces(places);
    } else {
      const filtered = places.filter(place =>
        place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        place.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPlaces(filtered);
    }
  }, [searchTerm, places]);

  const fetchPlaces = async () => {
    console.log('🔍 Fetching places for services management...');
    console.log('🔍 Current selectedPlaceId before fetch:', selectedPlaceId);
    
    try {
      const salonsData = await ownerAPI.getOwnerPlaces();
      console.log('📊 Salons data:', salonsData);
      console.log('📊 Salons data type:', typeof salonsData);
      console.log('📊 Salons data length:', Array.isArray(salonsData) ? salonsData.length : 'Not an array');
      
      // Ensure salonsData is an array
      if (!Array.isArray(salonsData)) {
        console.error('❌ Expected array but got:', typeof salonsData, salonsData);
        setPlaces([]);
        return;
      }
      
      const placesData = salonsData.map((salon: any) => ({
        id: salon.id,
        name: salon.nome || salon.name,
        location_type: (salon.location_type || 'fixed') as 'fixed' | 'mobile',
        city: salon.cidade || salon.city,
        service_areas: salon.service_areas || []
      }));
      
      console.log('🏢 Transformed places data:', placesData);
      console.log('🏢 Places data IDs:', placesData.map(p => p.id));
      setPlaces(placesData);
      setFilteredPlaces(placesData);
      
      if (placesData.length > 0 && !selectedPlaceId) {
        const firstPlaceId = placesData[0].id;
        setSelectedPlaceId(firstPlaceId);
        console.log('🎯 Auto-selected first place:', firstPlaceId);
        console.log('🎯 First place name:', placesData[0].name);
      } else if (placesData.length > 0 && selectedPlaceId) {
        // Check if the currently selected place is still owned by the user
        const isCurrentPlaceValid = placesData.some(place => place.id === selectedPlaceId);
        if (!isCurrentPlaceValid) {
          console.log('⚠️ Current selected place is no longer owned, switching to first available place');
          const firstPlaceId = placesData[0].id;
          setSelectedPlaceId(firstPlaceId);
          console.log('🎯 Switched to first place:', firstPlaceId);
        }
      } else {
        console.log('🎯 Not auto-selecting place. Length:', placesData.length, 'selectedPlaceId:', selectedPlaceId);
      }
    } catch (error) {
      console.error('❌ Error fetching places:', error);
      setPlaces([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async (placeId: number) => {
    console.log('🔍 Fetching services for place:', placeId);
    
    try {
      const servicesData = await ownerAPI.getPlaceServices(placeId);
      console.log('📊 Services data:', servicesData);
      console.log('📊 Services data type:', typeof servicesData);
      console.log('📊 Services data length:', servicesData?.length);
      console.log('📊 Services data is array:', Array.isArray(servicesData));
      
      // Transform PlaceService[] to Service[] if needed
      const transformedServices = Array.isArray(servicesData) ? servicesData.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        is_bookable: true, // Default value
        is_active: true, // Default value
        business_id: placeId, // Use the placeId parameter
        category: service.category,
        is_bio_diamond: service.is_bio_diamond
      })) : [];
      
      setServices(transformedServices);
      console.log('📊 Services state set to:', transformedServices);
    } catch (error) {
      console.error('❌ Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Form submitted!');
    console.log('🚀 selectedPlaceId:', selectedPlaceId);
    console.log('🚀 submitting:', submitting);
    console.log('🚀 places:', places);
    console.log('🚀 places IDs:', places.map(p => p.id));
    
    if (!selectedPlaceId || submitting) {
      console.log('❌ Form submission blocked - selectedPlaceId:', selectedPlaceId, 'submitting:', submitting);
      return;
    }
    
    // Validate that the selected place is still owned by the user
    const isPlaceValid = places.some(place => place.id === selectedPlaceId);
    if (!isPlaceValid) {
      console.error('❌ Selected place is not owned by user. Refreshing places...');
      await fetchPlaces();
      alert('The selected place is no longer available. Please select a valid place.');
      return;
    }
    
    setSubmitting(true);

    const serviceData = {
      name: formData.name,
      description: formData.description || null,
      price: formData.price ? parseFloat(formData.price) : null,
      duration: formData.duration ? parseInt(formData.duration) : null,
      is_bookable: formData.is_bookable
    };

    try {
      if (editingService) {
        // Update existing service
        console.log('📤 Calling updatePlaceService with:', selectedPlaceId, editingService.id, serviceData);
        const result = await ownerAPI.updatePlaceService(selectedPlaceId, editingService.id, serviceData);
        console.log('📤 UpdatePlaceService result:', result);
        console.log('🔄 Refreshing services list...');
        await fetchServices(selectedPlaceId);
      } else {
        // Create new service directly for this salon
        console.log('📤 Creating service for salon:', selectedPlaceId, 'with data:', serviceData);
        
        const requestBody = {
          name: serviceData.name,
          description: serviceData.description,
          price: serviceData.price,
          duration: serviceData.duration,
          is_bookable: serviceData.is_bookable
        };
        
        console.log('📤 Request body:', requestBody);
        
        console.log('📤 Calling addPlaceService with:', selectedPlaceId, requestBody);
        const result = await ownerAPI.addPlaceService(selectedPlaceId, requestBody);
        console.log('📤 AddPlaceService result:', result);
        console.log('🔄 Refreshing services list...');
        await fetchServices(selectedPlaceId);
      }
      
      setShowModal(false);
      setEditingService(null);
      resetForm();
    } catch (error: any) {
      console.error('Error saving service:', error);
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        alert('The selected place is no longer available. Please refresh the page and select a valid place.');
        await fetchPlaces(); // Refresh places data
      } else if (error.response?.status === 422) {
        alert('Invalid service data. Please check your input and try again.');
      } else if (error.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
        // Redirect to login or refresh token
        window.location.href = '/login';
      } else {
        alert('Failed to save service. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price?.toString() || '',
      duration: service.duration?.toString() || '',
      is_bookable: service.is_bookable
    });
    setShowModal(true);
  };

  const handleDelete = async (serviceId: number) => {
    if (window.confirm(t('owner.services.deleteServiceConfirm')) && selectedPlaceId) {
      try {
        await ownerAPI.deletePlaceService(selectedPlaceId, serviceId);
        await fetchServices(selectedPlaceId);
      } catch (error) {
        console.error('Error deleting service:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration: '',
      is_bookable: true
    });
  };

  const handleAddNewService = () => {
    console.log('🔘 Add New Service button clicked');
    console.log('🔘 selectedPlaceId:', selectedPlaceId);
    console.log('🔘 showModal before:', showModal);
    resetForm();
    setEditingService(null);
    setShowModal(true);
    console.log('🔘 showModal after setShowModal(true)');
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingService(null);
    resetForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1E90FF]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F5] overflow-hidden">
      {/* Header */}
      <div className="bg-transparent border-b border-medium-gray p-3 sm:p-4 lg:p-6 rounded-lg" style={{ borderRadius: '8px' }}>
        <div className="max-w-7xl">
          <div className="flex flex-wrap justify-start items-center gap-2 sm:gap-3 mb-4">
            <h1 className="text-charcoal text-xl sm:text-2xl lg:text-3xl font-bold leading-tight font-display">
              {t('owner.services.title')}
            </h1>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-charcoal/60" />
              </div>
              <input
                type="text"
                className="input-field pl-8 sm:pl-10 text-sm sm:text-base"
                placeholder={t('owner.places.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Place Selector - Horizontal Tabs */}
          <div className="bg-white rounded-lg shadow-form p-4" style={{ borderRadius: '8px' }}>
            <label className="block text-sm font-medium text-charcoal mb-3 font-body px-1" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>
              {t('owner.places.selectPlace')}
            </label>
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="flex gap-2 -mb-px border-b border-medium-gray">
              {filteredPlaces.map((place) => {
                const isSelected = selectedPlace?.id === place.id;
                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlace(place);
                      setSelectedPlaceId(place.id);
                    }}
                    className={`
                      flex items-center gap-2 px-3 py-2.5 max-[412px]:px-4 max-[412px]:py-3 max-[412px]:min-h-[48px] border-b-2 transition-all duration-200 font-body flex-shrink-0 rounded-lg max-[412px]:rounded-full
                      ${isSelected 
                        ? 'border-bright-blue text-bright-blue bg-bright-blue bg-opacity-10' 
                        : 'border-transparent text-charcoal opacity-70 hover:opacity-100 hover:border-medium-gray hover:bg-light-gray'
                      }
                    `}
                    style={{ 
                      fontFamily: 'Open Sans, sans-serif', 
                      fontWeight: isSelected ? 600 : 400,
                      fontSize: '14px'
                    }}
                  >
                    <div className={`flex items-center justify-center rounded-lg shrink-0 size-7 ${
                      isSelected ? 'bg-bright-blue' : 'bg-light-gray'
                    }`}>
                      {place.location_type === 'mobile' ? (
                        <MapPinIcon className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-bright-blue'}`} />
                      ) : (
                        <BuildingOfficeIcon className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-bright-blue'}`} />
                      )}
                    </div>
                    <span className="text-sm whitespace-nowrap">
                      {place.name} ({place.location_type === 'fixed' ? t('owner.places.fixed') : t('owner.places.mobile')})
                    </span>
                  </button>
                );
              })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto p-3 max-[412px]:p-2 sm:p-4 lg:p-6 bg-[#F5F5F5]">
        <div className="max-w-7xl">

          {/* Selected Place Services */}
          {selectedPlace ? (
            <div className="space-y-6">
              {/* Services List */}
              <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('owner.layout.services')}</h3>
                  <button
                    type="button"
                    onClick={handleAddNewService}
                    className="bg-[#1E90FF] text-white px-4 max-[412px]:px-4 py-2 max-[412px]:py-3 max-[412px]:min-h-[44px] max-[412px]:rounded-full rounded-lg font-medium hover:bg-[#1877D2] transition-colors"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  >
                    <PlusIcon className="h-4 w-4 mr-2 inline" />
                    {t('owner.services.addService')}
                  </button>
                </div>

                {services.length === 0 ? (
                  <div className="text-center py-12">
                    <UserGroupIcon className="mx-auto h-12 w-12 text-[#9E9E9E]" />
                    <h3 className="mt-2 text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('owner.services.noServices')}</h3>
                    <p className="mt-1 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                      {t('owner.services.getStartedDescription')}
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#E0E0E0]">
                    {services.map((service) => (
                      <li key={service.id}>
                        <div className="px-4 py-4 flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-[#F5F5F5] flex items-center justify-center">
                                <UserGroupIcon className="h-6 w-6 text-[#1E90FF]" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{service.name}</p>
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#A3D55D] bg-opacity-20 text-[#A3D55D]">
                                  {t('owner.services.availableAtPlace')}
                                </span>
                                {service.is_bio_diamond && (
                                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1E90FF] bg-opacity-20 text-[#1E90FF]">
                                    {t('owner.services.bioDiamond')}
                                  </span>
                                )}
                                {!service.is_bookable && (
                                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFD43B] bg-opacity-20 text-[#FFD43B]">
                                    {t('owner.services.notBookable')}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1">
                                {service.description && (
                                  <p className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{service.description}</p>
                                )}
                                {service.category && (
                                  <p className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('owner.services.category')}: {service.category}</p>
                                )}
                                <div className="flex items-center space-x-4 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                  <span>${service.price !== undefined ? service.price : '0.00'}</span>
                                  <span>{service.duration !== undefined ? service.duration : '0'} min</span>
                                  {service.assigned_employees && service.assigned_employees.length > 0 && (
                                    <span>{service.assigned_employees.length} {t('owner.services.employees')}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEdit(service)}
                              className="text-[#9E9E9E] hover:text-[#1E90FF]"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(service.id)}
                              className="text-[#FF5A5F] hover:text-[#FF5A5F] hover:bg-[#FF5A5F] hover:bg-opacity-10 rounded max-[412px]:rounded-full p-1 max-[412px]:px-3 max-[412px]:py-2 max-[412px]:min-h-[44px]"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-6">
              <div className="text-center py-12">
                <BuildingOfficeIcon className="mx-auto h-12 w-12 text-[#9E9E9E]" />
                <h3 className="mt-2 text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('owner.places.noPlaceSelected')}</h3>
                <p className="mt-1 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                  {t('owner.places.selectPlaceDescription')}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#333333] bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 max-[412px]:top-0 mx-auto p-5 max-[412px]:p-3 border border-[#E0E0E0] w-96 max-[412px]:w-full max-[412px]:h-full max-[412px]:rounded-none shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-[#333333] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {editingService ? t('owner.services.editService') : t('owner.services.addService')}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('owner.services.serviceName')} *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF]"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('owner.services.serviceDescription')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF]"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('owner.services.price')}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF]"
                      style={{ fontFamily: 'Open Sans, sans-serif' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{t('owner.services.duration')}</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF]"
                      style={{ fontFamily: 'Open Sans, sans-serif' }}
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_bookable}
                    onChange={(e) => setFormData({ ...formData, is_bookable: e.target.checked })}
                    className="h-4 w-4 text-[#1E90FF] focus:ring-[#1E90FF] border-[#E0E0E0] rounded"
                  />
                  <label className="ml-2 block text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                    {t('owner.services.allowOnlineBooking')}
                  </label>
                </div>

                <div className="flex justify-end space-x-3 max-[412px]:space-x-2 pt-4 max-[412px]:pt-3">
                  <button
                    type="button"
                    onClick={handleModalClose}
                    disabled={submitting}
                    className={`px-4 py-2 max-[412px]:px-4 max-[412px]:py-3 max-[412px]:min-h-[44px] max-[412px]:rounded-full border border-[#E0E0E0] text-[#333333] rounded-lg hover:bg-[#F5F5F5] transition-colors ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  >
                    {t('owner.common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`bg-[#1E90FF] text-white px-4 py-2 max-[412px]:px-4 max-[412px]:py-3 max-[412px]:min-h-[44px] max-[412px]:rounded-full rounded-lg font-medium hover:bg-[#1877D2] transition-colors ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  >
                    {submitting ? t('owner.services.creating') : (editingService ? t('owner.common.update') : t('owner.common.create'))}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ServicesManagement;
