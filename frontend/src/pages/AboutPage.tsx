import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Home, 
  MapPin, 
  Star, 
  Clock, 
  Shield, 
  Heart, 
  Users, 
  Zap, 
  CheckCircle, 
  ArrowRight,
  Scissors,
  Stethoscope,
  Sparkles,
  TrendingUp,
  Globe
} from 'lucide-react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

const AboutPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Hero Section with Bright Blue Background */}
      <section className="relative bg-gradient-to-br from-bright-blue to-blue-600 min-h-screen flex items-center">
        {/* Transparent Header Overlay */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <Header />
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 mb-6">
                <Sparkles className="w-5 h-5 text-white" />
                <span className="text-sm font-medium">{t('about.hero.badge')}</span>
              </div>
              <h1 className="hero-title mb-6">
                {t('about.hero.title')}
              </h1>
              <p className="hero-subtitle mb-4">
                {t('about.hero.subtitle')}
              </p>
              <p className="hero-subtitle mb-8 max-w-3xl mx-auto">
                {t('about.hero.description')}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link 
                to="/search" 
                className="btn-hero group"
              >
                <span>{t('about.hero.exploreButton')}</span>
                <ArrowRight className="btn-hero-arrow" />
              </Link>
            </div>

            {/* Hero Service Categories */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/30 transition-all duration-300">
                <Scissors className="w-8 h-8 mx-auto mb-2 text-white" />
                <p className="text-sm font-medium text-white">{t('about.hero.categories.beauty')}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/30 transition-all duration-300">
                <Stethoscope className="w-8 h-8 mx-auto mb-2 text-white" />
                <p className="text-sm font-medium text-white">{t('about.hero.categories.health')}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/30 transition-all duration-300">
                <Home className="w-8 h-8 mx-auto mb-2 text-white" />
                <p className="text-sm font-medium text-white">{t('about.hero.categories.home')}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/30 transition-all duration-300">
                <Heart className="w-8 h-8 mx-auto mb-2 text-white" />
                <p className="text-sm font-medium text-white">{t('about.hero.categories.fitness')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Best Services Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-section mb-6">
                  {t('about.whyChoose.title')}
                </h2>
                <p className="text-lg text-charcoal/70 mb-6">
                  {t('about.whyChoose.description1')}
                </p>
                <p className="text-charcoal mb-8">
                  {t('about.whyChoose.description2')}
                </p>
                <p className="text-charcoal mb-8">
                  {t('about.whyChoose.description3')}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-charcoal">
                    <CheckCircle className="w-5 h-5 text-bright-blue" />
                    <span className="font-medium">{t('about.whyChoose.features.instantBooking')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-charcoal">
                    <CheckCircle className="w-5 h-5 text-bright-blue" />
                    <span className="font-medium">{t('about.whyChoose.features.realReviews')}</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="card-elevated max-w-md w-full transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-bright-blue rounded-full flex items-center justify-center">
                      <Search className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-charcoal">{t('about.whyChoose.smartSearch.title')}</h3>
                      <p className="text-sm text-charcoal/70">{t('about.whyChoose.smartSearch.description')}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-light-gray rounded-lg">
                      <MapPin className="w-5 h-5 text-bright-blue" />
                      <span className="text-charcoal">{t('about.whyChoose.smartSearch.location')}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-light-gray rounded-lg">
                      <Scissors className="w-5 h-5 text-bright-blue" />
                      <span className="text-charcoal">{t('about.whyChoose.smartSearch.service')}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-light-gray rounded-lg">
                      <Star className="w-5 h-5 text-soft-yellow" />
                      <span className="text-charcoal">{t('about.whyChoose.smartSearch.rating')}</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-lime-green rounded-full opacity-20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Search Section */}
      <section className="py-16 bg-light-gray">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-section mb-6">
              {t('about.search.title')}
            </h2>
            <p className="text-lg text-charcoal/70 mb-12 max-w-3xl mx-auto">
              {t('about.search.description')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-bright-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-subsection mb-2">{t('about.search.profession.title')}</h3>
                <p className="text-charcoal/70 text-sm">{t('about.search.profession.description')}</p>
              </div>

              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-lime-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-subsection mb-2">{t('about.search.location.title')}</h3>
                <p className="text-charcoal/70 text-sm">{t('about.search.location.description')}</p>
              </div>

              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-coral-red rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-subsection mb-2">{t('about.search.serviceType.title')}</h3>
                <p className="text-charcoal/70 text-sm">{t('about.search.serviceType.description')}</p>
              </div>

              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-soft-yellow rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-charcoal" />
                </div>
                <h3 className="text-subsection mb-2">{t('about.search.quality.title')}</h3>
                <p className="text-charcoal/70 text-sm">{t('about.search.quality.description')}</p>
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
              <h2 className="text-section mb-6">
                {t('about.features.title')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-bright-blue rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-subsection mb-3">{t('about.features.verifiedProfessionals.title')}</h3>
                <p className="text-charcoal/70">{t('about.features.verifiedProfessionals.description')}</p>
              </div>

              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-lime-green rounded-full flex items-center justify-center mb-4">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-subsection mb-3">{t('about.features.realReviews.title')}</h3>
                <p className="text-charcoal/70">{t('about.features.realReviews.description')}</p>
              </div>

              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-coral-red rounded-full flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-subsection mb-3">{t('about.features.instantBooking.title')}</h3>
                <p className="text-charcoal/70">{t('about.features.instantBooking.description')}</p>
              </div>

              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-soft-yellow rounded-full flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-charcoal" />
                </div>
                <h3 className="text-subsection mb-3">{t('about.features.personalizedExperience.title')}</h3>
                <p className="text-charcoal/70">{t('about.features.personalizedExperience.description')}</p>
              </div>

              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-bright-blue rounded-full flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-subsection mb-3">{t('about.features.allServices.title')}</h3>
                <p className="text-charcoal/70">{t('about.features.allServices.description')}</p>
              </div>

              <div className="card hover:scale-105 transition-all duration-300">
                <div className="w-12 h-12 bg-lime-green rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-subsection mb-3">{t('about.features.topRated.title')}</h3>
                <p className="text-charcoal/70">{t('about.features.topRated.description')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Rated Section */}
      <section className="py-16 bg-light-gray">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-section mb-6">
              {t('about.excellence.title')}
            </h2>
            <p className="text-lg text-charcoal/70 mb-12 max-w-3xl mx-auto">
              {t('about.excellence.description')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="card hover:scale-105 transition-all duration-300 transform hover:-translate-y-2">
                <div className="w-16 h-16 bg-bright-blue rounded-full flex items-center justify-center mx-auto mb-6">
                  <Scissors className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-subsection mb-4">{t('about.excellence.beautyWellness.title')}</h3>
                <p className="text-charcoal/70 mb-6">{t('about.excellence.beautyWellness.description')}</p>
                <div className="flex items-center justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-soft-yellow fill-current" />
                  ))}
                </div>
                <p className="text-sm text-charcoal/60">{t('about.excellence.beautyWellness.rating')}</p>
              </div>

              <div className="card hover:scale-105 transition-all duration-300 transform hover:-translate-y-2">
                <div className="w-16 h-16 bg-lime-green rounded-full flex items-center justify-center mx-auto mb-6">
                  <Stethoscope className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-subsection mb-4">{t('about.excellence.healthMedical.title')}</h3>
                <p className="text-charcoal/70 mb-6">{t('about.excellence.healthMedical.description')}</p>
                <div className="flex items-center justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-soft-yellow fill-current" />
                  ))}
                </div>
                <p className="text-sm text-charcoal/60">{t('about.excellence.healthMedical.rating')}</p>
              </div>

              <div className="card hover:scale-105 transition-all duration-300 transform hover:-translate-y-2">
                <div className="w-16 h-16 bg-coral-red rounded-full flex items-center justify-center mx-auto mb-6">
                  <Home className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-subsection mb-4">{t('about.excellence.homeServices.title')}</h3>
                <p className="text-charcoal/70 mb-6">{t('about.excellence.homeServices.description')}</p>
                <div className="flex items-center justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-soft-yellow fill-current" />
                  ))}
                </div>
                <p className="text-sm text-charcoal/60">{t('about.excellence.homeServices.rating')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Power Up Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-section mb-6">
                  {t('about.growBusiness.title')}
                </h2>
                <p className="text-lg text-charcoal/70 mb-8">
                  {t('about.growBusiness.description')}
                </p>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-bright-blue rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-charcoal">{t('about.growBusiness.features.reachCustomers')}</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-lime-green rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-charcoal">{t('about.growBusiness.features.manageBookings')}</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-coral-red rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-charcoal">{t('about.growBusiness.features.promoteBusiness')}</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-soft-yellow rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle className="w-5 h-5 text-charcoal" />
                    </div>
                    <p className="text-charcoal">{t('about.growBusiness.features.getAnalytics')}</p>
                  </div>
                </div>

                <div className="mt-8">
                  <p className="text-charcoal mb-6">{t('about.growBusiness.cta.text')}</p>
                  <Link 
                    to="/join" 
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    {t('about.growBusiness.cta.button')}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="relative">
                <div className="card-elevated">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-bright-blue rounded-full flex items-center justify-center mx-auto mb-6">
                      <TrendingUp className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-subsection mb-4">{t('about.growBusiness.network.title')}</h3>
                    <p className="text-charcoal/70 mb-6">{t('about.growBusiness.network.description')}</p>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-3xl font-bold text-bright-blue">10K+</div>
                        <div className="text-sm text-charcoal/60">{t('about.growBusiness.network.activeUsers')}</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-lime-green">500+</div>
                        <div className="text-sm text-charcoal/60">{t('about.growBusiness.network.professionals')}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-lime-green rounded-full opacity-20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ready to Discover Section */}
      <section className="py-16 bg-gradient-to-br from-bright-blue to-blue-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-section mb-6">
              {t('about.readyToStart.title')}
            </h2>
            <p className="hero-subtitle mb-8">
              {t('about.readyToStart.description')}
            </p>
            <p className="text-white/90 mb-12 font-medium text-lg">
              {t('about.readyToStart.subtitle')}
            </p>

            <Link 
              to="/search" 
              className="btn-hero group"
            >
              <span>{t('about.readyToStart.button')}</span>
              <ArrowRight className="btn-hero-arrow" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AboutPage;