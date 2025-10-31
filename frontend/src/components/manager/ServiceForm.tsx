import React, { useState, useEffect } from 'react';
import { managerAPI, serviceAPI } from '../../utils/api';
import { X, Euro, Clock } from 'lucide-react';

interface Service {
  id: number;
  name: string;
  category: string;
  description: string;
  is_bio_diamond: boolean;
}

interface ServiceFormProps {
  salonId: number;
  onClose: () => void;
  onSuccess: () => void;
  editingService?: any;
}

const ServiceForm: React.FC<ServiceFormProps> = ({ salonId, onClose, onSuccess, editingService }) => {
  const [formData, setFormData] = useState({
    service_id: '',
    price: '',
    duration: '',
  });
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const services = await serviceAPI.getServices();
        setAvailableServices(services);
      } catch (err) {
        setError('Failed to load services');
      }
    };

    fetchServices();

    if (editingService) {
      setFormData({
        service_id: editingService.service_id.toString(),
        price: editingService.price.toString(),
        duration: editingService.duration.toString(),
      });
    }
  }, [editingService]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const serviceData = {
        service_id: parseInt(formData.service_id),
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration),
      };

      if (editingService) {
        await managerAPI.updateSalonService(salonId, editingService.id, serviceData);
      } else {
        await managerAPI.addSalonService(salonId, serviceData);
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to save service';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const selectedService = availableServices.find(s => s.id.toString() === formData.service_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingService ? 'Edit Service' : 'Add Service'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Service Selection */}
          <div>
            <label htmlFor="service_id" className="block text-sm font-medium text-gray-700 mb-2">
              Service *
            </label>
            <select
              id="service_id"
              name="service_id"
              required
              value={formData.service_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
            >
              <option value="">Select a service</option>
              {availableServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} {service.is_bio_diamond && '(BIO Diamond)'}
                </option>
              ))}
            </select>
            {selectedService && (
              <p className="mt-1 text-sm text-gray-500">{selectedService.description}</p>
            )}
          </div>

          {/* Price */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
              <Euro className="h-4 w-4 inline mr-2" />
              Price (€) *
            </label>
            <input
              type="number"
              id="price"
              name="price"
              required
              min="0"
              step="0.01"
              value={formData.price}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
              placeholder="Enter price"
            />
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-2" />
              Duration (minutes) *
            </label>
            <input
              type="number"
              id="duration"
              name="duration"
              required
              min="15"
              step="15"
              value={formData.duration}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
              placeholder="Enter duration in minutes"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : editingService ? 'Update Service' : 'Add Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceForm;
