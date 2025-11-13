import React, { useState } from 'react';
import { managerAPI } from '../../utils/api';
import { X, Phone, Mail, Globe, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SalonFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const SalonForm: React.FC<SalonFormProps> = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    nome: '',
    cidade: '',
    regiao: '',
    telefone: '',
    email: '',
    website: '',
    instagram: '',
    rua: '',
    porta: '',
    cod_postal: '',
    pais: 'Portugal',
    about: 'Welcome to our salon! We specialize in professional nail care, beauty treatments, and exceptional customer service. Our experienced team is dedicated to providing you with the highest quality services in a relaxing and comfortable environment. We use only premium products and the latest techniques to ensure you leave feeling beautiful and refreshed. Book your appointment today and experience the difference!',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Submitting salon data:', formData); // Debug log
      await managerAPI.createSalon(formData);
      // Reset form data after successful submission
      setFormData({
        nome: '',
        cidade: '',
        regiao: '',
        telefone: '',
        email: '',
        website: '',
        instagram: '',
        rua: '',
        porta: '',
        cod_postal: '',
        pais: 'Portugal',
        about: 'Welcome to our salon! We specialize in professional nail care, beauty treatments, and exceptional customer service. Our experienced team is dedicated to providing you with the highest quality services in a relaxing and comfortable environment. We use only premium products and the latest techniques to ensure you leave feeling beautiful and refreshed. Book your appointment today and experience the difference!',
        latitude: undefined,
        longitude: undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create salon';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-8 border-b border-gray-200">
          <h2 className="text-2xl font-bold" style={{color: '#2a2a2e'}}>{t('manager.addNewSalon')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Salon Name */}
            <div className="md:col-span-2">
              <label htmlFor="nome" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                <Building className="h-4 w-4 inline mr-2" />
                {t('manager.salonName')} *
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                required
                value={formData.nome}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder={t('manager.salonName')}
              />
            </div>

            {/* City */}
            <div>
              <label htmlFor="cidade" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                {t('manager.city')} *
              </label>
              <input
                type="text"
                id="cidade"
                name="cidade"
                required
                value={formData.cidade}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder={t('manager.city')}
              />
            </div>

            {/* Region */}
            <div>
              <label htmlFor="regiao" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                {t('manager.region')}
              </label>
              <input
                type="text"
                id="regiao"
                name="regiao"
                value={formData.regiao}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder={t('manager.region')}
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="telefone" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                <Phone className="h-4 w-4 inline mr-2" />
                {t('manager.phone')} *
              </label>
              <input
                type="tel"
                id="telefone"
                name="telefone"
                required
                value={formData.telefone}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder={t('manager.phone')}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                <Mail className="h-4 w-4 inline mr-2" />
                {t('manager.email')} *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder={t('manager.email')}
              />
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                <Globe className="h-4 w-4 inline mr-2" />
                {t('manager.website')}
              </label>
              <input
                type="text"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder={t('manager.websitePlaceholder')}
              />
            </div>

            {/* Instagram */}
            <div>
              <label htmlFor="instagram" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                <Globe className="h-4 w-4 inline mr-2" />
                {t('manager.instagram')}
              </label>
              <input
                type="text"
                id="instagram"
                name="instagram"
                value={formData.instagram}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder={t('manager.instagramPlaceholder')}
              />
            </div>

            {/* Country */}
            <div>
              <label htmlFor="pais" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                {t('manager.country')}
              </label>
              <select
                id="pais"
                name="pais"
                value={formData.pais}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
              >
                <option value="Portugal">Portugal</option>
                <option value="Spain">Spain</option>
                <option value="France">France</option>
                <option value="Italy">Italy</option>
              </select>
            </div>

            {/* Street */}
            <div>
              <label htmlFor="rua" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                {t('manager.street')}
              </label>
              <input
                type="text"
                id="rua"
                name="rua"
                value={formData.rua}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder={t('manager.street')}
              />
            </div>

            {/* Door Number */}
            <div>
              <label htmlFor="porta" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                {t('manager.doorNumber')}
              </label>
              <input
                type="text"
                id="porta"
                name="porta"
                value={formData.porta}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder={t('manager.doorNumber')}
              />
            </div>

            {/* Postal Code */}
            <div>
              <label htmlFor="cod_postal" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                {t('manager.postalCode')}
              </label>
              <input
                type="text"
                id="cod_postal"
                name="cod_postal"
                value={formData.cod_postal}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder={t('manager.postalCode')}
              />
            </div>
          </div>

          {/* About Section */}
          <div>
                  <label htmlFor="about" className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
              {t('manager.about')}
            </label>
            <textarea
              id="about"
              name="about"
              value={formData.about}
              onChange={handleChange}
              rows={4}
              placeholder={t('manager.aboutPlaceholder')}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900 resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              {t('manager.aboutDisplayText')}
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200"
            >
              {t('manager.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{backgroundColor: '#2a2a2e'}}
            >
              {loading ? t('manager.creating') : t('manager.createSalon')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalonForm;
