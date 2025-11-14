import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import Header from '../components/common/Header';
import SEOHead from '../components/seo/SEOHead';
import StructuredData from '../components/seo/StructuredData';
import { billingAPI } from '../utils/api';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';

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
  const [plans, setPlans] = useState<Array<{ code: string; trial_days: number; price_cents: number; currency: string }>>([]);
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');

  // Calculate discount percentage for annual plans
  const calculateDiscount = (monthlyPrice: number, yearlyPrice: number): number => {
    const monthlyYearly = monthlyPrice * 12;
    const discount = ((monthlyYearly - yearlyPrice) / monthlyYearly) * 100;
    return Math.round(discount);
  };

  // Recalculate prices when plans change
  const { basicMonthlyPrice, basicYearlyPrice, proMonthlyPrice, proYearlyPrice, basicDiscount, proDiscount } = useMemo(() => {
    // Get prices from backend plans, prioritize new codes over legacy codes
    const getPlanPrice = (planCode: string, fallbackCode?: string): number => {
      // First try the primary plan code
      let plan = plans.find(p => p.code === planCode);
      // If not found and fallback provided, try fallback
      if (!plan && fallbackCode) {
        plan = plans.find(p => p.code === fallbackCode);
      }
      if (plan && plan.price_cents) {
        return plan.price_cents / 100; // Convert cents to euros
      }
      // Only use hardcoded fallback if no plans are loaded at all
      if (plans.length === 0) {
        if (planCode === 'basic_month' || planCode === 'basic') return 5.95;
        if (planCode === 'basic_annual') return 71;
        if (planCode === 'pro_month' || planCode === 'pro') return 10.95;
        if (planCode === 'pro_annual') return 131;
      }
      return 0;
    };

    // Prioritize new monthly/annual codes, with legacy codes as fallback
    const basicMonth = getPlanPrice('basic_month', 'basic');
    const basicAnnual = getPlanPrice('basic_annual');
    const proMonth = getPlanPrice('pro_month', 'pro');
    const proAnnual = getPlanPrice('pro_annual');
    
    return {
      basicMonthlyPrice: basicMonth || 5.95,
      basicYearlyPrice: basicAnnual || 71,
      proMonthlyPrice: proMonth || 10.95,
      proYearlyPrice: proAnnual || 131,
      basicDiscount: calculateDiscount(basicMonth || 5.95, basicAnnual || 71),
      proDiscount: calculateDiscount(proMonth || 10.95, proAnnual || 131)
    };
  }, [plans]);

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

  // Load plans
  useEffect(() => {
    (async () => {
      try {
        const plansData = await billingAPI.getPlans();
        const mappedPlans = plansData.plans.map((p: any) => ({
          code: p.code,
          trial_days: p.trial_days,
          price_cents: p.price_cents,
          currency: p.currency
        }));
        console.log('Loaded plans from API:', mappedPlans);
        setPlans(mappedPlans);
      } catch (error) {
        console.error('Failed to load plans from API:', error);
        // Silently fail, will use fallback hardcoded prices
      }
    })();
  }, []);

  // Scroll to pricing section when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pricingSectionRef.current) {
        // Scroll to show the toggle buttons at the top
        const toggleElement = pricingSectionRef.current.querySelector('[role="tablist"]');
        if (toggleElement) {
          toggleElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        } else {
          pricingSectionRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
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
          message: response.data.message || t('pricing.contactSalesModal.success')
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
          message: response.data.message || t('pricing.contactSalesModal.error')
        });
      }
    } catch (error: any) {
      console.error('Error submitting contact sales form:', error);
      setSubmitStatus({ 
        type: 'error', 
        message: error.response?.data?.detail || error.message || t('pricing.contactSalesModal.error')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactSales = () => {
    setIsContactFormOpen(true);
  };

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // PricingPage Schema with FAQ
  const pricingPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'LinkUup Pricing',
    description: 'Choose the perfect plan for your beauty salon, barbershop, or service business. Flexible pricing plans starting with a free trial.',
    url: `${siteUrl}/pricing`,
  };

  return (
    <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden">
      <SEOHead
        title="Pricing Plans - Choose Your Plan"
        description="Choose the perfect plan for your beauty salon, barbershop, or service business. Flexible pricing plans starting with a free trial. No credit card required."
        keywords="salon software pricing, booking system pricing, beauty business plans, salon management cost, appointment booking software pricing"
        ogType="website"
      />
      <StructuredData data={pricingPageSchema} />
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
                <span className="text-sm font-medium">{t('pricing.simpleTransparent')}</span>
              </div>
              <h1 className="hero-title mb-6">
                {t('pricing.heroTitle')}
              </h1>
              <p className="hero-subtitle mb-8 max-w-3xl mx-auto">
                {t('pricing.heroSubtitle')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section ref={pricingSectionRef} className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Monthly/Annual Toggle - Sticky */}
            <div className="sticky top-0 z-10 flex justify-center items-center mb-8 pt-4 pb-4 bg-transparent -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
              <Tabs value={frequency} onValueChange={(value) => setFrequency(value as 'monthly' | 'yearly')} className="w-full flex justify-center">
                <TabsList className="!rounded-full inline-flex h-12 items-center justify-center bg-gray-100 p-1.5 shadow-inner border border-gray-200">
                  <TabsTrigger 
                    value="monthly"
                    className="!rounded-full px-6 py-2.5 text-base font-semibold transition-all duration-200 min-w-[120px] hover:bg-gray-200 [&.active]:!bg-bright-blue [&.active]:!text-white [&.active]:!shadow-md [&.active]:!font-bold"
                    style={frequency === 'monthly' ? { backgroundColor: '#1E90FF', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' } : {}}
                  >
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger 
                    value="yearly"
                    className="!rounded-full px-6 py-2.5 text-base font-semibold transition-all duration-200 min-w-[120px] hover:bg-gray-200 [&.active]:!bg-bright-blue [&.active]:!text-white [&.active]:!shadow-md [&.active]:!font-bold"
                    style={frequency === 'yearly' ? { backgroundColor: '#1E90FF', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' } : {}}
                  >
                    Yearly
                    <Badge variant="secondary" className="ml-2 text-xs">Save up to 20%</Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Basic Plan */}
              <div className="card hover:scale-105 transition-all duration-300 relative flex flex-col h-full">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-charcoal mb-2">{t('pricing.basic')}</h3>
                  <div className="mb-4">
                    {frequency === 'yearly' && basicDiscount > 0 && (
                      <div className="mb-2">
                        <Badge variant="secondary" className="bg-lime-green/20 text-lime-green border-lime-green/30">
                          Save {basicDiscount}%
                        </Badge>
                      </div>
                    )}
                    <div className="text-4xl font-bold text-charcoal">
                      €{frequency === 'monthly' 
                        ? basicMonthlyPrice.toFixed(2).replace('.', ',') 
                        : basicYearlyPrice.toFixed(2).replace('.', ',')}
                    </div>
                    <div className="text-charcoal/70">
                      /{frequency === 'monthly' ? 'month' : 'year'}
                      {frequency === 'yearly' && (
                        <span className="text-xs block mt-1">
                          (€{(basicYearlyPrice / 12).toFixed(2).replace('.', ',')}/month)
                        </span>
                      )}
                    </div>
                  </div>
                  {(() => {
                    const basicPlan = plans.find(p => p.code === 'basic_month' || p.code === 'basic');
                    const trialDays = basicPlan?.trial_days ?? 0;
                    if (trialDays > 0) {
                      return (
                        <div className="bg-lime-green/20 text-lime-green text-sm font-medium px-3 py-1 rounded-full inline-block mb-4">
                          {trialDays} {t('pricing.dayTrial')}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="space-y-4 mb-8 flex-grow">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.features.calendarSupport')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.features.emailNotifications')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.features.marketingEmails')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.features.unlimitedLocations')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.features.employeeManagement2')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.features.emailChatSupport')}</span>
                  </div>
                </div>

                <div className="mt-auto">
                  <Link 
                    to={`/join?plan=${frequency === 'monthly' ? 'basic_month' : 'basic_annual'}`}
                    className="btn-primary w-full text-center inline-flex items-center justify-center gap-2"
                  >
                    {t('pricing.startNow')}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Pro Plan - Featured */}
              <div className="card hover:scale-105 transition-all duration-300 relative border-2 border-bright-blue shadow-elevated flex flex-col h-full">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-bright-blue text-white px-4 py-2 rounded-full text-sm font-medium">
                    {t('pricing.mostPopular')}
                  </div>
                </div>
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-charcoal mb-2">{t('pricing.pro')}</h3>
                  <div className="mb-4">
                    {frequency === 'yearly' && proDiscount > 0 && (
                      <div className="mb-2">
                        <Badge variant="secondary" className="bg-lime-green/20 text-lime-green border-lime-green/30">
                          Save {proDiscount}%
                        </Badge>
                      </div>
                    )}
                    <div className="text-4xl font-bold text-charcoal">
                      €{frequency === 'monthly' 
                        ? proMonthlyPrice.toFixed(2).replace('.', ',') 
                        : proYearlyPrice.toFixed(2).replace('.', ',')}
                    </div>
                    <div className="text-charcoal/70">
                      /{frequency === 'monthly' ? 'month' : 'year'}
                      {frequency === 'yearly' && (
                        <span className="text-xs block mt-1">
                          (€{(proYearlyPrice / 12).toFixed(2).replace('.', ',')}/month)
                        </span>
                      )}
                    </div>
                  </div>
                  {(() => {
                    const proPlan = plans.find(p => p.code === 'pro_month' || p.code === 'pro');
                    const trialDays = proPlan?.trial_days ?? 0;
                    if (trialDays > 0) {
                      return (
                        <div className="bg-lime-green/20 text-lime-green text-sm font-medium px-3 py-1 rounded-full inline-block mb-4">
                          {trialDays} {t('pricing.dayTrial')}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="space-y-4 mb-8 flex-grow">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.features.calendarSupport')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.features.emailNotifications')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.features.marketingEmails')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.features.unlimitedLocations')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.features.employeeManagement10')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.features.rewardsProgram')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.features.campaignProgram')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.features.timeOffManagement')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.features.emailChatSupport')}</span>
                  </div>
                </div>

                <div className="mt-auto">
                  <Link 
                    to={`/join?plan=${frequency === 'monthly' ? 'pro_month' : 'pro_annual'}`}
                    className="btn-primary w-full text-center inline-flex items-center justify-center gap-2"
                  >
                    {t('pricing.startNow')}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Enterprise Plan */}
              <div className="card hover:scale-105 transition-all duration-300 relative flex flex-col h-full">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-charcoal mb-2">{t('pricing.enterprise')}</h3>
                  <div className="mb-4">
                    <div className="text-4xl font-bold text-charcoal">{t('pricing.customRates')}</div>
                    <div className="text-charcoal/70">{t('pricing.enterpriseDescription')}</div>
                  </div>
                </div>

                <div className="space-y-4 mb-8 flex-grow">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.featuresTable.pro')} - {t('pricing.featuresTable.unlimited')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.featuresTable.customIntegrations')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.featuresTable.dedicatedManager')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.featuresTable.prioritySupport')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-bright-blue flex-shrink-0" />
                    <span className="text-charcoal">{t('pricing.featuresTable.customTraining')}</span>
                  </div>
                </div>

                <div className="mt-auto">
                  <button 
                    onClick={handleContactSales}
                    className="btn-outline w-full text-center inline-flex items-center justify-center gap-2"
                  >
                    {t('pricing.contactSales')}
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
              <h2 className="text-section mb-6">{t('pricing.compareFeatures')}</h2>
              <p className="text-lg text-charcoal/70 max-w-3xl mx-auto">
                {t('pricing.compareSubtitle')}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-bright-blue/10">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-charcoal">{t('pricing.featuresTable.features')}</th>
                      <th className="text-center py-4 px-6 font-semibold text-charcoal">{t('pricing.featuresTable.basic')}</th>
                      <th className="text-center py-4 px-6 font-semibold text-charcoal">{t('pricing.featuresTable.pro')}</th>
                      <th className="text-center py-4 px-6 font-semibold text-charcoal">{t('pricing.featuresTable.enterprise')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-medium-gray">
                    <tr>
                      <td className="py-4 px-6 text-charcoal">{t('pricing.featuresTable.calendarManagement')}</td>
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
                      <td className="py-4 px-6 text-charcoal">{t('pricing.featuresTable.emailMessages')}</td>
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
                      <td className="py-4 px-6 text-charcoal">{t('pricing.featuresTable.marketingEmails')}</td>
                      <td className="text-center py-4 px-6">100</td>
                      <td className="text-center py-4 px-6">100</td>
                      <td className="text-center py-4 px-6">{t('pricing.featuresTable.unlimited')}</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-charcoal">{t('pricing.featuresTable.rewardsProgram')}</td>
                      <td className="text-center py-4 px-6">-</td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-charcoal">{t('pricing.featuresTable.campaignProgram')}</td>
                      <td className="text-center py-4 px-6">-</td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle className="w-5 h-5 text-bright-blue mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-charcoal">{t('pricing.featuresTable.employeeManagement')}</td>
                      <td className="text-center py-4 px-6">2 {t('pricing.featuresTable.employees')}</td>
                      <td className="text-center py-4 px-6">10 {t('pricing.featuresTable.employees')}</td>
                      <td className="text-center py-4 px-6">{t('pricing.featuresTable.unlimited')}</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-charcoal">{t('pricing.featuresTable.supportLevel')}</td>
                      <td className="text-center py-4 px-6">{t('pricing.featuresTable.emailChat')}</td>
                      <td className="text-center py-4 px-6">{t('pricing.featuresTable.emailChat')}</td>
                      <td className="text-center py-4 px-6">{t('pricing.featuresTable.prioritySupport')}</td>
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
              <h2 className="text-section mb-6">{t('pricing.whyChoose')}</h2>
              <p className="text-lg text-charcoal/70 max-w-3xl mx-auto">
                {t('pricing.whyChooseSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-bright-blue rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-subsection mb-3">{t('pricing.secureReliable')}</h3>
                <p className="text-charcoal/70">{t('pricing.secureReliableDesc')}</p>
              </div>

              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-lime-green rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-subsection mb-3">{t('pricing.growBusiness')}</h3>
                <p className="text-charcoal/70">{t('pricing.growBusinessDesc')}</p>
              </div>

              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-coral-red rounded-full flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-subsection mb-3">{t('pricing.easyToUse')}</h3>
                <p className="text-charcoal/70">{t('pricing.easyToUseDesc')}</p>
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
              {t('pricing.readyToStart')}
            </h2>
            <p className="hero-subtitle mb-8">
              {t('pricing.readyToStartSubtitle')}
            </p>
            <p className="text-white/90 mb-12 font-medium text-lg">
              {t('pricing.noCreditCard')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                to="/join?trial=true" 
                className="btn-hero group"
              >
                <span>{t('pricing.startFreeTrial')}</span>
                <ArrowRight className="btn-hero-arrow" />
              </Link>
              <button 
                onClick={handleContactSales}
                className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30"
              >
                {t('pricing.contactSales')}
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
              <h3 className="text-2xl font-bold text-charcoal">{t('pricing.contactSalesModal.title')}</h3>
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
                <label className="block text-sm font-medium text-charcoal mb-2">{t('pricing.contactSalesModal.name')} *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={contactForm.name}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder={t('pricing.contactSalesModal.namePlaceholder')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">{t('pricing.contactSalesModal.email')} *</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={contactForm.email}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder={t('pricing.contactSalesModal.emailPlaceholder')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">{t('pricing.contactSalesModal.company')}</label>
                <input
                  type="text"
                  name="company"
                  value={contactForm.company}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder={t('pricing.contactSalesModal.companyPlaceholder')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">{t('pricing.contactSalesModal.message')} *</label>
                <textarea
                  name="message"
                  required
                  value={contactForm.message}
                  onChange={handleInputChange}
                  className="input-field resize-none"
                  rows={4}
                  placeholder={t('pricing.contactSalesModal.messagePlaceholder')}
                />
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
                <span>{isSubmitting ? t('pricing.contactSalesModal.sending') : t('pricing.contactSalesModal.sendMessage')}</span>
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
    </div>
  );
};

export default PricingPage;
