import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle, 
  ArrowRight, 
  Mail,
  Star,
  Calendar,
  MessageCircle,
  Users,
  Gift,
  Phone,
  Zap,
  Shield,
  TrendingUp,
  X,
  Send
} from 'lucide-react';
import axios from 'axios';
import Footer from '../components/common/Footer';
import Header from '../components/common/Header';

const PricingPage: React.FC = () => {
  const { t } = useTranslation();
  const pricingSectionRef = useRef<HTMLElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  // Parallax scroll effect - hero section scrolls at half speed
  useEffect(() => {
    const handleScroll = () => {
      if (heroSectionRef.current) {
        const scrollY = window.scrollY;
        // Move at half speed (0.5x scroll speed)
        const parallaxOffset = scrollY * 0.5;
        heroSectionRef.current.style.transform = `translateY(${parallaxOffset}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Scroll to pricing section when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pricingSectionRef.current) {
        pricingSectionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100); // Small delay to ensure the page is fully loaded

    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const response = await axios.post(`${API_BASE_URL}/contact-sales/`, contactForm);
      
      if (response.data.success) {
        setSubmitStatus({ 
          type: 'success', 
          message: response.data.message || 'Thank you for your interest! Our sales team will contact you within 24 hours.' 
        });
        // Reset form
        setContactForm({
          name: '',
          email: '',
          company: '',
          message: ''
        });
        // Close modal after 3 seconds
        setTimeout(() => {
          setIsContactFormOpen(false);
          setSubmitStatus({ type: null, message: '' });
        }, 3000);
      } else {
        setSubmitStatus({ 
          type: 'error', 
          message: response.data.message || 'Failed to send message. Please try again.' 
        });
      }
    } catch (error: any) {
      console.error('Error submitting contact sales form:', error);
      setSubmitStatus({ 
        type: 'error', 
        message: error.response?.data?.detail || error.message || 'Failed to send message. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactSales = () => {
    setIsContactFormOpen(true);
  };

  return (
    <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Hero Section - header overlays this section, scrolls at half speed */}
      <section 
        ref={heroSectionRef}
        className="relative bg-gradient-to-br from-bright-blue to-blue-600 min-h-screen flex items-center"
        style={{ willChange: 'transform' }}
      >
        {/* Header positioned at the beginning of this section */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
          <Header />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-24">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 mb-6">
                <Star className="w-5 h-5 text-white" />
                <span className="text-sm font-medium">Simple, Transparent Pricing</span>
              </div>
              <h1 className="hero-title mb-6">
                A service that grows with your business
              </h1>
              <p className="hero-subtitle mb-8 max-w-3xl mx-auto">
                Choose the perfect plan for your business needs. Start with our free trial and upgrade as you grow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section ref={pricingSectionRef} className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Basic Plan */}
              <div className="card hover:scale-105 transition-all duration-300 relative flex flex-col h-full">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-charcoal mb-2">Basic</h3>
                  <div className="mb-4">
                    <div className="text-4xl font-bold text-charcoal">€5,95</div>
                    <div className="text-charcoal/70">per month</div>
                  </div>
                  <div className="bg-lime-green/20 text-lime-green text-sm font-medium px-3 py-1 rounded-full inline-block mb-4">
                    10 day trial
                  </div>
                </div>

                <div className="space-y-4 mb-8 flex-grow">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">Single calendar column</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">Free email messages</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">100 free marketing emails</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">Email and chat support</span>
                  </div>
                </div>

                <div className="mt-auto">
                  <Link 
                    to="/join" 
                    className="btn-primary w-full text-center inline-flex items-center justify-center gap-2"
                  >
                    Start now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Pro Plan - Featured */}
              <div className="card hover:scale-105 transition-all duration-300 relative border-2 border-bright-blue shadow-elevated flex flex-col h-full">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-bright-blue text-white px-4 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                </div>
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-charcoal mb-2">Pro</h3>
                  <div className="mb-4">
                    <div className="text-4xl font-bold text-charcoal">€10,95</div>
                    <div className="text-charcoal/70">per month</div>
                  </div>
                </div>

                <div className="space-y-4 mb-8 flex-grow">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">Multiple calendar columns</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">Free email messages</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">100 free marketing emails</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">Rewards program</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">Campaign program</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">Employee Time-off Management</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">24/7 phone and chat support</span>
                  </div>
                </div>

                <div className="mt-auto">
                  <Link 
                    to="/join" 
                    className="btn-primary w-full text-center inline-flex items-center justify-center gap-2"
                  >
                    Start now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Enterprise Plan */}
              <div className="card hover:scale-105 transition-all duration-300 relative flex flex-col h-full">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-charcoal mb-2">Enterprise</h3>
                  <div className="mb-4">
                    <div className="text-4xl font-bold text-charcoal">Custom rates</div>
                    <div className="text-charcoal/70">Enterprise solutions available for high-volume businesses with over 20 team members</div>
                  </div>
                </div>

                <div className="space-y-4 mb-8 flex-grow">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">Everything in Pro</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">Custom integrations</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">Dedicated account manager</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">Priority support</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">Custom training</span>
                  </div>
                </div>

                <div className="mt-auto">
                  <button 
                    onClick={handleContactSales}
                    className="btn-outline w-full text-center inline-flex items-center justify-center gap-2"
                  >
                    Contact sales
                    <Mail className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Comparison Section */}
      <section className="py-16 bg-light-gray">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-section mb-6">Compare Features</h2>
              <p className="text-lg text-charcoal/70 max-w-3xl mx-auto">
                See what's included in each plan to choose the right one for your business
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-bright-blue/10">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-charcoal">Features</th>
                      <th className="text-center py-4 px-6 font-semibold text-charcoal">Basic</th>
                      <th className="text-center py-4 px-6 font-semibold text-charcoal">Pro</th>
                      <th className="text-center py-4 px-6 font-semibold text-charcoal">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-medium-gray">
                    <tr>
                      <td className="py-4 px-6 text-charcoal">Calendar Management</td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-charcoal">Email Messages</td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-charcoal">Marketing Emails</td>
                      <td className="text-center py-4 px-6">100</td>
                      <td className="text-center py-4 px-6">100</td>
                      <td className="text-center py-4 px-6">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-charcoal">Rewards Program</td>
                      <td className="text-center py-4 px-6">-</td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-charcoal">Campaign Program</td>
                      <td className="text-center py-4 px-6">-</td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-charcoal">Employee Management</td>
                      <td className="text-center py-4 px-6">-</td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-charcoal">Support Level</td>
                      <td className="text-center py-4 px-6">Email & Chat</td>
                      <td className="text-center py-4 px-6">24/7 Phone & Chat</td>
                      <td className="text-center py-4 px-6">Priority Support</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose LinkUup Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-section mb-6">Why Choose LinkUup?</h2>
              <p className="text-lg text-charcoal/70 max-w-3xl mx-auto">
                Join thousands of businesses that trust LinkUup to manage their bookings and grow their customer base
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-bright-blue rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-subsection mb-3">Secure & Reliable</h3>
                <p className="text-charcoal/70">Your data is protected with enterprise-grade security and 99.9% uptime guarantee.</p>
              </div>

              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-lime-green rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-subsection mb-3">Grow Your Business</h3>
                <p className="text-charcoal/70">Increase bookings by up to 40% with our smart marketing tools and customer management.</p>
              </div>

              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-coral-red rounded-full flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-subsection mb-3">Easy to Use</h3>
                <p className="text-charcoal/70">Get started in minutes with our intuitive interface. No technical knowledge required.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-bright-blue to-blue-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-section mb-6">
              Ready to Get Started?
            </h2>
            <p className="hero-subtitle mb-8">
              Join thousands of businesses already using LinkUup to manage their bookings and grow their customer base.
            </p>
            <p className="text-white/90 mb-12 font-medium text-lg">
              Start your free trial today - no credit card required!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                to="/join" 
                className="btn-hero group"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="btn-hero-arrow" />
              </Link>
              <button 
                onClick={handleContactSales}
                className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Sales Modal */}
      {isContactFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-charcoal">Contact Sales</h3>
              <button 
                onClick={() => {
                  setIsContactFormOpen(false);
                  setSubmitStatus({ type: null, message: '' });
                }}
                className="text-charcoal/60 hover:text-charcoal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={contactForm.name}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={contactForm.email}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Company</label>
                <input
                  type="text"
                  name="company"
                  value={contactForm.company}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Your company name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Message *</label>
                <textarea
                  name="message"
                  required
                  value={contactForm.message}
                  onChange={handleInputChange}
                  className="input-field resize-none"
                  rows={4}
                  placeholder="Tell us about your business needs..."
                />
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
                <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
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
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PricingPage;
