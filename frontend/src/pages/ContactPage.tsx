import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, MapPin, Clock, Send } from 'lucide-react';
import axios from 'axios';

const ContactPage: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';
      const response = await axios.post(`${API_BASE_URL}/contact/`, formData);
      
      if (response.data.success) {
        setSubmitStatus({ 
          type: 'success', 
          message: response.data.message || 'Your message has been sent successfully!' 
        });
        // Reset form
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSubmitStatus({ type: null, message: '' });
        }, 5000);
      } else {
        setSubmitStatus({ 
          type: 'error', 
          message: response.data.message || 'Failed to send message. Please try again.' 
        });
      }
    } catch (error: any) {
      console.error('Error submitting contact form:', error);
      setSubmitStatus({ 
        type: 'error', 
        message: error.response?.data?.detail || error.message || 'Failed to send message. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-light-gray">
      
      {/* Hero Section */}
      <section className="relative z-10 py-20 overflow-hidden">
        <div className="max-w-6xl mx-auto container-padding">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-charcoal mb-6 font-display">
              {t('contact.title')}
            </h1>
            <p className="text-xl text-charcoal/70 mb-8 max-w-3xl mx-auto">
              {t('contact.subtitle')}
            </p>
            <div className="w-24 h-1 bg-bright-blue mx-auto"></div>
          </div>
        </div>
      </section>

      {/* Contact Information and Form */}
      <section className="relative z-10 py-16">
        <div className="max-w-6xl mx-auto container-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Contact Information */}
            <div>
              <h2 className="text-3xl font-bold text-charcoal mb-8 font-display">
                {t('contact.getInTouch')}
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-bright-blue/20 border border-bright-blue/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-bright-blue" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-charcoal mb-1 font-display">
                      {t('contact.email')}
                    </h3>
                    <p className="text-charcoal/70">info@linkuup.com</p>
                    <p className="text-charcoal/70">support@linkuup.com</p>
                  </div>
                </div>


                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-bright-blue/20 border border-bright-blue/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-bright-blue" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-charcoal mb-1 font-display">
                      {t('contact.address')}
                    </h3>
                    <p className="text-charcoal/70">Rua da Liberdade, 123</p>
                    <p className="text-charcoal/70">Lisboa, Portugal</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-bright-blue/20 border border-bright-blue/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-bright-blue" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-charcoal mb-1 font-display">
                      {t('contact.hours')}
                    </h3>
                    <p className="text-charcoal/70">{t('contact.weekdays')}</p>
                    <p className="text-charcoal/70">{t('contact.weekends')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-lg shadow-form p-8">
              <h2 className="text-3xl font-bold text-charcoal mb-8 font-display">
                {t('contact.sendMessage')}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-charcoal mb-2">
                      {t('contact.name')} *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="input-field"
                      placeholder={t('contact.namePlaceholder')}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-2">
                      {t('contact.email')} *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="input-field"
                      placeholder={t('contact.emailPlaceholder')}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-charcoal mb-2">
                    {t('contact.subject')} *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder={t('contact.subjectPlaceholder')}
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-charcoal mb-2">
                    {t('contact.message')} *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={6}
                    className="input-field resize-none"
                    placeholder={t('contact.messagePlaceholder')}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-secondary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                  <span>{isSubmitting ? t('contact.sending') || 'Sending...' : t('contact.sendMessage')}</span>
                </button>
                
                {submitStatus.type === 'success' && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 text-sm">{submitStatus.message}</p>
                  </div>
                )}
                
                {submitStatus.type === 'error' && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{submitStatus.message}</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 py-16">
        <div className="max-w-4xl mx-auto container-padding">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-charcoal mb-4 font-display">
              {t('contact.faqTitle')}
            </h2>
            <div className="w-24 h-1 bg-bright-blue mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-form p-6">
                <h3 className="text-lg font-semibold text-charcoal mb-2 font-display">
                  {t('contact.faq1Question')}
                </h3>
                <p className="text-charcoal/70">
                  {t('contact.faq1Answer')}
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-form p-6">
                <h3 className="text-lg font-semibold text-charcoal mb-2 font-display">
                  {t('contact.faq2Question')}
                </h3>
                <p className="text-charcoal/70">
                  {t('contact.faq2Answer')}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-form p-6">
                <h3 className="text-lg font-semibold text-charcoal mb-2 font-display">
                  {t('contact.faq3Question')}
                </h3>
                <p className="text-charcoal/70">
                  {t('contact.faq3Answer')}
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-form p-6">
                <h3 className="text-lg font-semibold text-charcoal mb-2 font-display">
                  {t('contact.faq4Question')}
                </h3>
                <p className="text-charcoal/70">
                  {t('contact.faq4Answer')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
