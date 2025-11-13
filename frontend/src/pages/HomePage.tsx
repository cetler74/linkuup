import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { placeAPI, getImageUrl } from '../utils/api';
import type { Place } from '../utils/api';
import Header from '../components/common/Header';
import HeroCarousel from '../components/common/HeroCarousel';
import SEOHead from '../components/seo/SEOHead';
import StructuredData from '../components/seo/StructuredData';
import {
  Marquee,
  MarqueeContent,
  MarqueeFade,
  MarqueeItem,
} from '../components/kibo-ui/marquee';

const HomePage: React.FC = () => {
  const [currentSalonIndex, setCurrentSalonIndex] = useState(0);
  const [salons, setSalons] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  // Video array for mobile phone mockup
  const videos = [
    '/videos/dog.mp4',
    '/videos/PT2.mp4',
    '/videos/nails.mp4',
    '/videos/massage.mp4',
    '/videos/Tutor.mp4',
    '/videos/hair.mp4',
    '/videos/barber2.mp4',
    '/videos/Barber1.mp4',
  ];

  // Fetch real salons from database
  useEffect(() => {
    const fetchSalons = async () => {
      try {
        setIsLoading(true);
        const response = await placeAPI.getPlaces({}, 1, 10); // Get first 10 places
        console.log('Fetched places:', response);
        
        // Check if response is an array (current API structure) or has places property (expected structure)
        if (Array.isArray(response)) {
          // Current API returns array directly
          console.log('Place images:', response.map(s => ({
            id: s.id,
            nome: s.nome,
            images: s.images
          })));
          setSalons(response);
        } else if (response && response.places && Array.isArray(response.places)) {
          // Expected paginated response structure
          console.log('Place images:', response.places.map(s => ({
            id: s.id,
            nome: s.nome,
            images: s.images
          })));
          setSalons(response.places);
        } else {
          console.warn('Invalid response structure:', response);
          setSalons([]);
        }
      } catch (error) {
        console.error('Error fetching salons:', error);
        // Set empty array on error
        setSalons([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalons();
  }, []);

  // Update state when language changes to force re-render
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      console.log('Language changed to:', lng);
      setCurrentLang(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // Auto-rotate carousel every 2 seconds
  useEffect(() => {
    if (salons.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSalonIndex((prevIndex) => (prevIndex + 1) % salons.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [salons.length]);

  // Mouse tracking effect for 3D phone mockup
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      // Calculate mouse position as percentage of screen
      const x = (clientX / innerWidth) * 100;
      const y = (clientY / innerHeight) * 100;
      
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);


  // Structured Data for Organization
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'LinkUup',
    description: 'All-in-one platform for beauty salons, barbershops, and service businesses',
    url: typeof window !== 'undefined' ? window.location.origin : '',
    logo: typeof window !== 'undefined' ? `${window.location.origin}/vite.svg` : '',
    sameAs: [
      // Add social media links if available
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      // Add contact information if available
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'LinkUup',
    url: typeof window !== 'undefined' ? window.location.origin : '',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: typeof window !== 'undefined' ? `${window.location.origin}/search?q={search_term_string}` : '',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden">
      <SEOHead
        title="Transform Your Beauty Salon Online"
        description="LinkUup is the all-in-one platform for beauty salons, barbershops, and service businesses. Manage bookings, payments, customers, and more with our intuitive platform. Start your free trial today!"
        keywords="beauty salon, barbershop, booking system, online booking, salon management, appointment booking, beauty business, salon software, spa management, beauty appointment"
        ogType="website"
        ogImage="/images/og-home.png"
      />
      <StructuredData data={[organizationSchema, websiteSchema]} />
      
      {/* Hero Section with Bright Blue Background */}
      <section className="relative bg-gradient-to-br from-bright-blue to-blue-600 min-h-screen flex items-center">
        {/* Transparent Header Overlay */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <Header />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Main Content */}
            <div className="space-y-8">
              <h1 className="hero-title text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-8">
                {t('home.heroTitle')}
              </h1>
              
              <p className="hero-subtitle text-lg md:text-xl lg:text-2xl max-w-2xl mb-6">
                {t('home.heroSubtitle')}
              </p>

              <p className="text-white/90 text-base md:text-lg max-w-2xl leading-relaxed">
                {t('home.heroDescription')}
              </p>

              {/* Call to Action */}
              <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
                <Link 
                  to="/join" 
                  className="btn-secondary px-8 py-2 text-lg font-semibold"
                >
                  {t('home.getStartedToday')}
                </Link>
                <Link 
                  to="/about" 
                  className="btn-outline px-8 py-2 text-lg font-semibold border-white text-white hover:bg-white hover:text-bright-blue"
                >
                  {t('home.learnMore')}
                </Link>
              </div>

              {/* Image Marquee */}
              <div className="mt-12 max-w-4xl">
                <Marquee className="py-4" speed="slow" pauseOnHover={true}>
                  <MarqueeFade side="left" />
                  <MarqueeFade side="right" />
                  <MarqueeContent>
                    <MarqueeItem className="h-[115px] w-[115px] mx-4">
                      <img
                        alt="Barbershop"
                        className="h-[115px] w-[115px] rounded-full object-cover shadow-lg"
                        src="/images/barbershop.png"
                      />
                    </MarqueeItem>
                    <MarqueeItem className="h-[115px] w-[115px] mx-4">
                      <img
                        alt="Hair Salon"
                        className="h-[115px] w-[115px] rounded-full object-cover shadow-lg"
                        src="/images/hair_salon.png"
                      />
                    </MarqueeItem>
                    <MarqueeItem className="h-[115px] w-[115px] mx-4">
                      <img
                        alt="Tattoo Studio"
                        className="h-[115px] w-[115px] rounded-full object-cover shadow-lg"
                        src="/images/tattoo_studio.png"
                      />
                    </MarqueeItem>
                    <MarqueeItem className="h-[115px] w-[115px] mx-4">
                      <img
                        alt="Tattoo"
                        className="h-[115px] w-[115px] rounded-full object-cover shadow-lg"
                        src="/images/Tattoo.png"
                      />
                    </MarqueeItem>
                    <MarqueeItem className="h-[115px] w-[115px] mx-4">
                      <img
                        alt="Hairdresser"
                        className="h-[115px] w-[115px] rounded-full object-cover shadow-lg"
                        src="/images/hairdresser.png"
                      />
                    </MarqueeItem>
                    <MarqueeItem className="h-[115px] w-[115px] mx-4">
                      <img
                        alt="Nails"
                        className="h-[115px] w-[115px] rounded-full object-cover shadow-lg"
                        src="/images/nails.png"
                      />
                    </MarqueeItem>
                    <MarqueeItem className="h-[115px] w-[115px] mx-4">
                      <img
                        alt="Spa"
                        className="h-[115px] w-[115px] rounded-full object-cover shadow-lg"
                        src="/images/spa.png"
                      />
                    </MarqueeItem>
                    <MarqueeItem className="h-[115px] w-[115px] mx-4">
                      <img
                        alt="Medical"
                        className="h-[115px] w-[115px] rounded-full object-cover shadow-lg"
                        src="/images/Medical.png"
                      />
                    </MarqueeItem>
                    <MarqueeItem className="h-[115px] w-[115px] mx-4">
                      <img
                        alt="Physiotherapy"
                        className="h-[115px] w-[115px] rounded-full object-cover shadow-lg"
                        src="/images/physiotherapy.png"
                      />
                    </MarqueeItem>
                    <MarqueeItem className="h-[115px] w-[115px] mx-4">
                      <img
                        alt="Tanning"
                        className="h-[115px] w-[115px] rounded-full object-cover shadow-lg"
                        src="/images/tanning.png"
                      />
                    </MarqueeItem>
                    <MarqueeItem className="h-[115px] w-[115px] mx-4">
                      <img
                        alt="Tutor"
                        className="h-[115px] w-[115px] rounded-full object-cover shadow-lg"
                        src="/images/Tutor.png"
                      />
                    </MarqueeItem>
                    <MarqueeItem className="h-[115px] w-[115px] mx-4">
                      <img
                        alt="Pets"
                        className="h-[115px] w-[115px] rounded-full object-cover shadow-lg"
                        src="/images/pets.png"
                      />
                    </MarqueeItem>
                    <MarqueeItem className="h-[115px] w-[115px] mx-4">
                      <img
                        alt="Hands"
                        className="h-[115px] w-[115px] rounded-full object-cover shadow-lg"
                        src="/images/hands.jpg"
                      />
                    </MarqueeItem>
                    <MarqueeItem className="h-[115px] w-[115px] mx-4">
                      <img
                        alt="Hands Side"
                        className="h-[115px] w-[115px] rounded-full object-cover shadow-lg"
                        src="/images/hands_side.jpg"
                      />
                    </MarqueeItem>
                    <MarqueeItem className="h-[115px] w-[115px] mx-4">
                      <img
                        alt="Hands 2"
                        className="h-[115px] w-[115px] rounded-full object-cover shadow-lg"
                        src="/images/hands2.jpg"
                      />
                    </MarqueeItem>
                  </MarqueeContent>
                </Marquee>
              </div>
            </div>

            {/* Right Side - Mobile Phone Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                {/* Mobile Phone Frame */}
                <div 
                  className="w-80 h-[560px] bg-charcoal rounded-3xl p-2 shadow-2xl transition-transform duration-200 ease-out"
                  style={{
                    transform: `perspective(1000px) rotateY(${(mousePosition.x - 50) * 0.4}deg) rotateX(${(mousePosition.y - 50) * -0.4}deg) translateZ(30px)`,
                  }}
                >
                  <div className="w-full h-full bg-white rounded-2xl overflow-hidden relative">
                    {/* Mobile Screen Content */}
                    <div className="p-4 pb-6 space-y-4">
                      <div className="text-center">
                        <h3 className="font-bold text-charcoal text-lg">{t('home.bookYourAppointment')}</h3>
                      </div>
                      
                      {/* Floating UI Elements */}
                      <div className="space-y-3">
                        <div className="bg-bright-blue text-white p-3 rounded-lg text-sm font-medium hover:animate-bounce cursor-pointer transition-all duration-200 hover:scale-105">
                          {t('home.selectService')}
                        </div>
                        <div className="bg-lime-green text-white p-3 rounded-lg text-sm font-medium hover:animate-bounce cursor-pointer transition-all duration-200 hover:scale-105">
                          {t('home.chooseTime')}
                        </div>
                        <div className="bg-coral-red text-white p-3 rounded-lg text-sm font-medium hover:animate-bounce cursor-pointer transition-all duration-200 hover:scale-105">
                          {t('home.confirmBooking')}
                        </div>
                      </div>
                      
                      {/* Video Below Confirm Booking */}
                      <div className="mt-3 mb-6 w-full flex justify-center">
                        <video
                          key={currentVideoIndex}
                          autoPlay
                          muted
                          playsInline
                          className="rounded-lg object-cover shadow-lg"
                          style={{ 
                            width: '60%',
                            aspectRatio: '9/16',
                            maxHeight: '400px'
                          }}
                          onEnded={() => {
                            setCurrentVideoIndex((prev) => (prev + 1) % videos.length);
                          }}
                        >
                          <source src={videos[currentVideoIndex]} type="video/mp4" />
                          {t('home.videoNotSupported')}
                        </video>
                      </div>
                      
                      {/* Decorative Icons */}
                      <div className="absolute top-2 right-2">
                        <div className="w-3 h-3 bg-bright-blue rounded-full"></div>
                      </div>
                      <div className="absolute bottom-2 left-2">
                        <div className="w-2 h-2 bg-lime-green rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Decorative Elements */}
                <div 
                  className="absolute -top-4 -right-4 w-8 h-8 bg-soft-yellow rounded-full animate-bounce transition-transform duration-200 ease-out"
                  style={{
                    transform: `translate(${(mousePosition.x - 50) * 0.3}px, ${(mousePosition.y - 50) * 0.3}px)`,
                  }}
                ></div>
                <div 
                  className="absolute -bottom-4 -left-4 w-6 h-6 bg-lime-green rounded-full animate-pulse transition-transform duration-200 ease-out"
                  style={{
                    transform: `translate(${(mousePosition.x - 50) * 0.25}px, ${(mousePosition.y - 50) * 0.25}px)`,
                  }}
                ></div>
                <div 
                  className="absolute top-1/2 -right-8 w-4 h-4 bg-coral-red rounded-full animate-ping transition-transform duration-200 ease-out"
                  style={{
                    transform: `translate(${(mousePosition.x - 50) * 0.2}px, ${(mousePosition.y - 50) * 0.2}px)`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Highlights Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-charcoal mb-4">
              {t('home.everythingYouNeed')}
            </h2>
            <p className="text-lg text-charcoal/70 max-w-2xl mx-auto">
              {t('home.featuresSubtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Key Highlights */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-bright-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">📅</span>
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-2">{t('home.flexibleBookingSystem')}</h3>
              <p className="text-charcoal/70">{t('home.flexibleBookingDesc')}</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-lime-green rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">💳</span>
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-2">{t('home.instantPayments')}</h3>
              <p className="text-charcoal/70">{t('home.instantPaymentsDesc')}</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-coral-red rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">🔄</span>
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-2">{t('home.realtimeSync')}</h3>
              <p className="text-charcoal/70">{t('home.realtimeSyncDesc')}</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-soft-yellow rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-2">{t('home.clientManagement')}</h3>
              <p className="text-charcoal/70">{t('home.clientManagementDesc')}</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-bright-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-2">{t('home.customizableProfiles')}</h3>
              <p className="text-charcoal/70">{t('home.customizableProfilesDesc')}</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-lime-green rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-2">{t('home.mobileOptimized')}</h3>
              <p className="text-charcoal/70">{t('home.mobileOptimizedDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 bg-light-gray">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-charcoal mb-4">
              {t('home.readyToSimplify')}
            </h2>
            <p className="text-lg text-charcoal/70 max-w-2xl mx-auto mb-8">
              {t('home.ctaDescription')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Business Type Cards */}
            <div className="bg-white text-charcoal p-8 rounded-lg shadow-elevated transform hover:scale-105 transition-all duration-300 border-2 border-medium-gray">
              <div className="text-center">
                <div className="w-16 h-16 bg-bright-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">✂️</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">{t('home.salonsBarbers')}</h3>
                <p className="text-charcoal/70 mb-6">{t('home.salonsBarbersDesc')}</p>
                <Link to="/join" className="bg-bright-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors inline-block">
                  {t('home.getStarted')}
                </Link>
              </div>
            </div>
            
            <div className="bg-white text-charcoal p-8 rounded-lg shadow-elevated transform hover:scale-105 transition-all duration-300 border-2 border-medium-gray">
              <div className="text-center">
                <div className="w-16 h-16 bg-lime-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">🏥</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">{t('home.clinicsMedical')}</h3>
                <p className="text-charcoal/70 mb-6">{t('home.clinicsMedicalDesc')}</p>
                <Link to="/join" className="bg-lime-green text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors inline-block">
                  {t('home.getStarted')}
                </Link>
              </div>
            </div>
            
            <div className="bg-white text-charcoal p-8 rounded-lg shadow-elevated transform hover:scale-105 transition-all duration-300 border-2 border-medium-gray">
              <div className="text-center">
                <div className="w-16 h-16 bg-coral-red rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">💪</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">{t('home.fitnessCoaching')}</h3>
                <p className="text-charcoal/70 mb-6">{t('home.fitnessCoachingDesc')}</p>
                <Link to="/join" className="bg-coral-red text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors inline-block">
                  {t('home.getStarted')}
                </Link>
              </div>
            </div>
          </div>
          
          {/* Main CTA */}
          <div className="text-center mt-12">
            <div className="bg-white rounded-lg shadow-elevated p-8 max-w-2xl mx-auto border border-medium-gray">
              <h3 className="text-2xl font-bold text-charcoal mb-4">{t('home.startFreeTrial')}</h3>
              <p className="text-charcoal/70 mb-6">{t('home.startFreeTrialDesc')}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  to="/join?trial=true" 
                  className="btn-secondary px-8 py-2 text-lg font-semibold"
                >
                  {t('home.startFreeTrialButton')}
                </Link>
                <Link 
                  to="/contact" 
                  className="btn-outline px-8 py-2 text-lg font-semibold"
                >
                  {t('home.scheduleDemo')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;