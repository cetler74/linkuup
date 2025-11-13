import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import type { Service } from '../../utils/api';
import { useTranslation } from 'react-i18next';

interface ServiceManagementProps {
  onError: (error: string) => void;
}

interface ServiceFormData {
  name: string;
  category: string;
  description: string;
  is_bio_diamond: boolean;
}

interface SalonUsage {
  id: number;
  nome: string;
  cidade: string;
  regiao: string;
  price: number;
  duration: number;
}

const ServiceManagement: React.FC<ServiceManagementProps> = ({ onError }) => {
  const { t } = useTranslation();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);
  const [salonUsage, setSalonUsage] = useState<SalonUsage[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [affectedSalons, setAffectedSalons] = useState<Array<{ id: number; nome: string; cidade: string }>>([]);

  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    category: '',
    description: '',
    is_bio_diamond: false,
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getServices();
      setServices(data);
    } catch (err: any) {
      onError(err.response?.data?.error || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingService(null);
    setFormData({
      name: '',
      category: '',
      description: '',
      is_bio_diamond: false,
    });
    setShowModal(true);
  };

  const handleEditClick = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      category: service.category,
      description: service.description,
      is_bio_diamond: service.is_bio_diamond,
    });
    setShowModal(true);
  };

  const handleDeleteClick = async (service: Service) => {
    try {
      const result = await adminAPI.deleteService(service.id, false);
      
      if (result.requires_confirmation && result.affected_salons) {
        setDeletingService(service);
        setAffectedSalons(result.affected_salons);
        setShowDeleteConfirm(true);
      } else {
        // Service not in use, deleted successfully
        await loadServices();
      }
    } catch (err: any) {
      onError(err.response?.data?.error || 'Failed to delete service');
    }
  };

  const confirmDelete = async () => {
    if (!deletingService) return;

    try {
      await adminAPI.deleteService(deletingService.id, true);
      setShowDeleteConfirm(false);
      setDeletingService(null);
      setAffectedSalons([]);
      await loadServices();
    } catch (err: any) {
      onError(err.response?.data?.error || 'Failed to delete service');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      onError(t('admin.serviceNameRequired'));
      return;
    }

    try {
      if (editingService) {
        await adminAPI.updateService(editingService.id, formData);
      } else {
        await adminAPI.createService(formData);
      }
      setShowModal(false);
      await loadServices();
    } catch (err: any) {
      onError(err.response?.data?.error || 'Failed to save service');
    }
  };

  const toggleExpand = async (serviceId: number) => {
    if (expandedServiceId === serviceId) {
      setExpandedServiceId(null);
      setSalonUsage([]);
    } else {
      setExpandedServiceId(serviceId);
      setLoadingUsage(true);
      try {
        const data = await adminAPI.getServiceDetails(serviceId);
        setSalonUsage(data.salons);
      } catch (err: any) {
        onError(err.response?.data?.error || 'Failed to load service details');
      } finally {
        setLoadingUsage(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('admin.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Add Button */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{t('admin.services')}</h2>
        <button
          onClick={handleAddClick}
          className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          {t('admin.addService')}
        </button>
      </div>

      {/* Services List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {services.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-gray-500 text-base sm:text-lg mb-4">{t('admin.noData')}</p>
            <p className="text-gray-400 text-xs sm:text-sm">Click "Add Service" to create your first service</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.serviceName')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.serviceCategory')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.serviceDescription')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.usageCount')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {services.map((service) => (
                  <React.Fragment key={service.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">{service.name}</span>
                          {service.is_bio_diamond && (
                            <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              BIO Diamond
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {service.category || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {service.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => toggleExpand(service.id)}
                          className="text-gray-900 hover:text-gray-600 underline"
                        >
                          {service.usage_count || 0} {t('admin.salonsUsing')}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditClick(service)}
                          className="text-gray-600 hover:text-gray-900 mr-4"
                        >
                          {t('admin.edit')}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(service)}
                          className="text-red-600 hover:text-red-900"
                        >
                          {t('admin.delete')}
                        </button>
                      </td>
                    </tr>
                    {expandedServiceId === service.id && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-gray-50">
                          {loadingUsage ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                            </div>
                          ) : salonUsage.length > 0 ? (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                {t('admin.serviceUsedBy')} ({salonUsage.length}):
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {salonUsage.map((salon) => (
                                  <div key={salon.id} className="border border-gray-200 rounded-md p-3 bg-white">
                                    <p className="font-medium text-gray-900">{salon.nome}</p>
                                    <p className="text-sm text-gray-600">
                                      {salon.cidade}, {salon.regiao}
                                    </p>
                                    <div className="mt-2 text-sm">
                                      <span className="text-gray-700">
                                        {t('admin.price')}: €{salon.price.toFixed(2)}
                                      </span>
                                      <span className="ml-3 text-gray-700">
                                        {t('admin.duration')}: {salon.duration} min
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600 text-center py-4">
                              {t('admin.noSalonsUsing')}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-gray-200">
              {services.map((service) => (
                <div key={service.id} className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-gray-900">{service.name}</h3>
                          {service.is_bio_diamond && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              💎 BIO
                            </span>
                          )}
                        </div>
                        {service.category && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Category:</span> {service.category}
                          </p>
                        )}
                        {service.description && (
                          <p className="text-sm text-gray-600 mt-1 break-words">
                            {service.description}
                          </p>
                        )}
                        <button
                          onClick={() => toggleExpand(service.id)}
                          className="text-sm text-gray-900 hover:text-gray-600 underline mt-2"
                        >
                          📊 {service.usage_count || 0} {t('admin.salonsUsing')}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleEditClick(service)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        ✏️ {t('admin.edit')}
                      </button>
                      <button
                        onClick={() => handleDeleteClick(service)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                      >
                        🗑️ {t('admin.delete')}
                      </button>
                    </div>

                    {expandedServiceId === service.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200 bg-gray-50 -mx-4 px-4 py-3">
                        {loadingUsage ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                          </div>
                        ) : salonUsage.length > 0 ? (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">
                              {t('admin.serviceUsedBy')} ({salonUsage.length}):
                            </h4>
                            <div className="space-y-3">
                              {salonUsage.map((salon) => (
                                <div key={salon.id} className="border border-gray-200 rounded-md p-3 bg-white">
                                  <p className="font-medium text-gray-900">{salon.nome}</p>
                                  <p className="text-sm text-gray-600">
                                    {salon.cidade}, {salon.regiao}
                                  </p>
                                  <div className="mt-2 text-sm flex flex-wrap gap-3">
                                    <span className="text-gray-700">
                                      💰 {t('admin.price')}: €{salon.price.toFixed(2)}
                                    </span>
                                    <span className="text-gray-700">
                                      ⏱️ {t('admin.duration')}: {salon.duration} min
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 text-center py-4">
                            {t('admin.noSalonsUsing')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Service Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 sm:p-8 border w-full max-w-md shadow-2xl rounded-2xl bg-white">
            <h3 className="text-2xl font-bold mb-6" style={{color: '#2a2a2e'}}>
              {editingService ? t('admin.editService') : t('admin.addService')}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                  {t('admin.serviceName')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                  placeholder={t('admin.serviceName')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                  {t('admin.serviceCategory')}
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                  placeholder={t('admin.serviceCategory')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                  {t('admin.serviceDescription')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900 resize-none"
                  placeholder={t('admin.serviceDescription')}
                />
              </div>
              <div className="pt-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_bio_diamond}
                    onChange={(e) => setFormData({ ...formData, is_bio_diamond: e.target.checked })}
                    className="rounded border-gray-300 focus:ring-2 focus:ring-offset-2 h-5 w-5 transition-all duration-200"
                    style={{color: '#2a2a2e'}}
                  />
                  <span className="ml-3 text-sm font-medium" style={{color: '#2a2a2e'}}>
                    {t('admin.bioDiamondService')}
                  </span>
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
                >
                  {t('admin.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 text-white rounded-lg hover:opacity-90 transition-all duration-200 font-medium"
                  style={{backgroundColor: '#2a2a2e'}}
                >
                  {t('admin.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingService && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 sm:p-8 border w-full max-w-md shadow-2xl rounded-2xl bg-white">
            <h3 className="text-2xl font-bold mb-4" style={{color: '#2a2a2e'}}>
              {t('admin.deleteServiceConfirm')}
            </h3>
            <p className="text-sm mb-6" style={{color: '#2a2a2e'}}>
              {t('admin.deleteServiceWarning')}
            </p>
            <div className="mb-6 max-h-48 overflow-y-auto bg-red-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold mb-3" style={{color: '#2a2a2e'}}>
                {t('admin.affectedSalons')} ({affectedSalons.length}):
              </h4>
              <ul className="space-y-2">
                {affectedSalons.map((salon) => (
                  <li key={salon.id} className="text-sm border-l-3 border-red-500 pl-3" style={{color: '#2a2a2e'}}>
                    {salon.nome} - {salon.cidade}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingService(null);
                  setAffectedSalons([]);
                }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                {t('admin.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium"
              >
                {t('admin.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManagement;

