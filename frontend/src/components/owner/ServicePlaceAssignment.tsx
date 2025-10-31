import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Service {
  id: number;
  name: string;
  description?: string;
  price?: number;
  duration?: number;
  is_bookable: boolean;
  salon_name?: string;
  salon_id?: number;
}

interface Place {
  id: number;
  name: string;
  location_type: 'fixed' | 'mobile';
  city?: string;
}

interface ServicePlaceAssignmentProps {
  placeId: number;
  placeName: string;
  onClose: () => void;
}

const ServicePlaceAssignment: React.FC<ServicePlaceAssignmentProps> = ({
  placeId,
  placeName,
  onClose
}) => {
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [assignedServices, setAssignedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAllServices();
    fetchAssignedServices();
  }, [placeId]);

  const fetchAllServices = async () => {
    try {
      // Since there's no global services API, we'll fetch services from all salons
      // and aggregate them to show what's available
      const response = await fetch('/api/v1/owner/places', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const salons = await response.json();
        const allServices: Service[] = [];
        
        // Fetch services from each salon
        for (const salon of salons) {
          try {
            const servicesResponse = await fetch(`/api/v1/owner/services/places/${salon.id}/services`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              }
            });
            
            if (servicesResponse.ok) {
              const services = await servicesResponse.json();
              // Add salon context to services
              const servicesWithContext = services.map((service: Service) => ({
                ...service,
                salon_name: salon.nome || salon.name,
                salon_id: salon.id
              }));
              allServices.push(...servicesWithContext);
            }
          } catch (error) {
            console.error(`Error fetching services for salon ${salon.id}:`, error);
          }
        }
        
        setAllServices(allServices);
      }
    } catch (error) {
      console.error('Error fetching all services:', error);
    }
  };

  const fetchAssignedServices = async () => {
    try {
      const response = await fetch(`/api/v1/owner/services/places/${placeId}/services`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const services = await response.json();
        setAssignedServices(services);
      }
    } catch (error) {
      console.error('Error fetching assigned services:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignService = async (service: Service) => {
    setSaving(true);
    try {
      console.log('📤 Creating service copy for place:', service);
      // Since we can't assign existing services, we create a copy
      const response = await fetch(`/api/v1/owner/services/places/${placeId}/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          nome: service.name,
          descricao: service.description,
          preco: service.price,
          duracao: service.duration,
          is_bookable: service.is_bookable
        })
      });

      console.log('📡 Create service copy response:', response.status);

      if (response.ok) {
        await fetchAssignedServices();
        await fetchAllServices(); // Refresh the available services list
      } else {
        let errorMessage = 'Unknown error';
        try {
          const errorData = await response.json();
          console.error('❌ Create service copy error (JSON):', errorData);
          errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
        } catch (jsonError) {
          console.error('❌ Create service copy error (non-JSON):', response.status, response.statusText);
          const responseText = await response.text();
          console.error('❌ Response text:', responseText);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        alert('Failed to create service: ' + errorMessage);
      }
    } catch (error) {
      console.error('Error creating service:', error);
      alert('Failed to create service');
    } finally {
      setSaving(false);
    }
  };

  const unassignService = async (serviceId: number) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/owner/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        await fetchAssignedServices();
      } else {
        const errorData = await response.json();
        alert('Failed to unassign service: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error unassigning service:', error);
      alert('Failed to unassign service');
    } finally {
      setSaving(false);
    }
  };

  const isServiceAssigned = (serviceId: number) => {
    return assignedServices.some(service => service.id === serviceId);
  };

  const availableServices = allServices.filter(service => 
    !isServiceAssigned(service.id)
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border border-gray-700 w-4/5 max-w-4xl shadow-lg rounded-md bg-gray-800">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border border-gray-700 w-4/5 max-w-4xl shadow-lg rounded-md bg-gray-800">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-white">
              Manage Services for {placeName}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Services */}
            <div className="card">
              <h4 className="text-md font-medium text-white mb-4">Services from Other Places</h4>
              <p className="text-xs text-gray-400 mb-4">Create copies of services from your other places</p>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {availableServices.length === 0 ? (
                  <p className="text-gray-300 text-sm">No services found from other places.</p>
                ) : (
                  availableServices.map((service) => (
                    <div key={`${service.id}-${service.salon_id}`} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{service.name}</p>
                        {service.description && (
                          <p className="text-xs text-gray-300">{service.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                          {service.price && <span>${service.price}</span>}
                          {service.duration && <span>{service.duration} min</span>}
                          <span className={service.is_bookable ? 'text-green-400' : 'text-yellow-400'}>
                            {service.is_bookable ? 'Bookable' : 'Not Bookable'}
                          </span>
                          <span className="text-blue-400">From: {service.salon_name}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => assignService(service)}
                        disabled={saving}
                        className="ml-3 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
                        title="Create a copy of this service"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Assigned Services */}
            <div className="card">
              <h4 className="text-md font-medium text-white mb-4">Assigned Services</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {assignedServices.length === 0 ? (
                  <p className="text-gray-300 text-sm">No services assigned to this place yet.</p>
                ) : (
                  assignedServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{service.name}</p>
                        {service.description && (
                          <p className="text-xs text-gray-300">{service.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                          {service.price && <span>${service.price}</span>}
                          {service.duration && <span>{service.duration} min</span>}
                          <span className={service.is_bookable ? 'text-green-400' : 'text-yellow-400'}>
                            {service.is_bookable ? 'Bookable' : 'Not Bookable'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => unassignService(service.id)}
                        disabled={saving}
                        className="ml-3 p-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              onClick={onClose}
              className="btn-outline"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicePlaceAssignment;
