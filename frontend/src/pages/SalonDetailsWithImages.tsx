import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Phone, Mail, ExternalLink, Clock, Calendar, Navigation } from 'lucide-react';
import { placeAPI, campaignAPI, getImageUrl } from '../utils/api';
import { useEmployeeServices } from '../utils/ownerApi';
// Define types inline to avoid module resolution issues
import ReviewSection from '../components/review/ReviewSection';
import StarRating from '../components/common/StarRating';
import SalonImageGallery from '../components/salon/SalonImageGallery';
import LeafletSalonMap from '../components/common/LeafletSalonMap';
import BioDiamondIcon from '../components/common/BioDiamondIcon';
import CampaignBanner from '../components/campaign/CampaignBanner';
import ServicePrice from '../components/common/ServicePrice';
import { useTranslation } from 'react-i18next';

const SalonDetailsWithImages: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const salonId = parseInt(id || '0');
  const { t } = useTranslation();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [salonId]);

  const { data: salon, isLoading, error } = useQuery({
    queryKey: ['place', salonId],
    queryFn: () => placeAPI.getPlace(salonId),
    enabled: salonId > 0
  });

  // Component to display employee services
  const EmployeeServicesDisplay = ({ employee }: { employee: any }) => {
    const { data: employeeServicesData, isLoading: servicesLoading } = useEmployeeServices(employee.id);
    const employeeServices = employeeServicesData?.services || [];

    if (servicesLoading) {
      return (
        <div className="mt-2">
          <div className="animate-pulse">
            <div className="h-4 bg-charcoal/20 rounded w-20 mb-1"></div>
            <div className="flex space-x-1">
              <div className="h-6 bg-charcoal/20 rounded w-16"></div>
              <div className="h-6 bg-charcoal/20 rounded w-20"></div>
            </div>
          </div>
        </div>
      );
    }

    if (employeeServices.length === 0) {
      return null;
    }

    return (
      <div className="mt-2">
        <p className="text-xs text-charcoal/60 mb-1 font-body">Services:</p>
        <div className="flex flex-wrap gap-1">
          {employeeServices.map((service) => (
            <span key={service.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-bright-blue text-white font-body">
              {service.name}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Fetch active campaigns for this place
  const { data: activeCampaigns = [] } = useQuery({
    queryKey: ['campaigns', 'active', salonId],
    queryFn: () => campaignAPI.getActiveCampaigns(salonId),
    enabled: salonId > 0
  });

  // Debug logging
  console.log('Salon data:', salon);
  console.log('Working hours:', salon?.working_hours);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bright-blue"></div>
      </div>
    );
  }

  if (error || !salon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-charcoal mb-4 font-display">{t('salon.notFound')}</h2>
          <Link to="/search" className="btn-primary">
            {t('salon.backToSearch')}
          </Link>
        </div>
      </div>
    );
  }

  // Only show BIO Diamond services if the salon itself is BIO Diamond certified
  const bioServices = salon.is_bio_diamond ? (salon.services?.filter(service => service.is_bio_diamond) || []) : [];
  const regularServices = salon.services?.filter(service => !service.is_bio_diamond) || [];

  const formatAddress = () => {
    const parts = [] as string[];
    if (salon.rua) parts.push(salon.rua);
    if (salon.porta) parts.push(salon.porta);
    if (salon.cod_postal) parts.push(salon.cod_postal);
    if (salon.cidade) parts.push(salon.cidade);
    return parts.join(', ');
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-charcoal/70 font-body">
            <Link to="/search" className="hover:text-charcoal font-body">{t('search.search')}</Link>
            <span>/</span>
            <span className="text-charcoal font-body">{salon.nome}</span>
          </div>
        </nav>

        {/* Campaign Banner */}
        {activeCampaigns.length > 0 && (
          <CampaignBanner 
            campaigns={activeCampaigns}
            className="mb-6"
          />
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Image Gallery */}
          <div className="lg:col-span-2">
            <SalonImageGallery 
              images={salon.images || []} 
              salonName={salon.nome}
              className="mb-6"
            />

            {/* About Section */}
            {salon.about && (
              <div className="card mb-6">
                <h2 className="text-2xl font-bold text-charcoal mb-4 font-display">{t('salon.aboutSalon')} {salon.nome}</h2>
                <p className="text-charcoal/80 leading-relaxed whitespace-pre-line font-body">
                  {salon.about}
                </p>
              </div>
            )}

            {/* Location Map */}
            <div className="card mb-6">
              <h2 className="text-2xl font-bold text-charcoal mb-4 font-display">{t('salon.location')}</h2>
              <div className="space-y-4">
                <div className="text-charcoal/80">
                  <p className="font-medium font-body">{salon.nome}</p>
                  {formatAddress() && <p className="font-body">{formatAddress()}</p>}
                </div>
                
                {(salon.latitude && salon.longitude) ? (
                  <div className="border border-medium-gray rounded-lg overflow-hidden">
                    <LeafletSalonMap
                      latitude={salon.latitude}
                      longitude={salon.longitude}
                      salonName={salon.nome}
                      address={`${formatAddress()}${formatAddress() ? ', ' : ''}Portugal`}
                      height="300px"
                    />
                  </div>
                ) : (
                  <div className="bg-light-gray rounded-lg p-8 text-center">
                    <MapPin className="h-12 w-12 text-charcoal/60 mx-auto mb-4" />
                    <p className="text-charcoal/80 font-body">{t('salon.locationMapNotAvailable')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Services */}
            <div className="card mb-6">
              <h2 className="text-2xl font-bold text-charcoal mb-6 font-display">{t('salon.services')}</h2>
              
              {bioServices.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center mb-4">
                    <h3 className="text-lg font-semibold text-charcoal font-display">{t('salon.bioDiamondServices')}</h3>
                    <span className="bg-soft-yellow text-charcoal text-xs px-2 py-1 rounded-full font-medium ml-2 font-body">
                      PREMIUM
                    </span>
                  </div>
                  <div className="space-y-2">
                    {bioServices.map((service) => (
                      <div key={service.id} className="border border-medium-gray rounded-lg p-4 hover:shadow-card transition-shadow duration-200 bg-white">
                        <div className="flex justify-between items-center w-full">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-charcoal truncate font-body">{service.name}</h4>
                            <p className="text-sm text-charcoal/70 truncate font-body">{service.description}</p>
                          </div>
                          <div className="flex items-center space-x-4 ml-4 flex-shrink-0">
                            <div className="flex items-center text-sm text-charcoal/60 font-body">
                              <Clock className="h-4 w-4 mr-1" />
                              {service.duration} min
                            </div>
                            <ServicePrice
                              originalPrice={service.price}
                              discountedPrice={service.price}
                              discountAmount={0}
                              discountPercentage={0}
                              isFree={false}
                              appliedCampaigns={[]}
                              campaigns={activeCampaigns}
                              showDetails={true}
                              size="lg"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {regularServices.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-charcoal mb-4 font-display">{t('salon.regularServices')}</h3>
                  <div className="space-y-2">
                    {regularServices.map((service) => (
                      <div key={service.id} className="border border-medium-gray rounded-lg p-4 hover:shadow-card transition-shadow duration-200 bg-white">
                        <div className="flex justify-between items-center w-full">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-charcoal truncate font-body">{service.name}</h4>
                            <p className="text-sm text-charcoal/70 truncate font-body">{service.description}</p>
                          </div>
                          <div className="flex items-center space-x-4 ml-4 flex-shrink-0">
                            <div className="flex items-center text-sm text-charcoal/60 font-body">
                              <Clock className="h-4 w-4 mr-1" />
                              {service.duration} min
                            </div>
                            <ServicePrice
                              originalPrice={service.price}
                              discountedPrice={service.price}
                              discountAmount={0}
                              discountPercentage={0}
                              isFree={false}
                              appliedCampaigns={[]}
                              campaigns={activeCampaigns}
                              showDetails={true}
                              size="lg"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {salon.services?.length === 0 && (
                <p className="text-charcoal/60 text-center py-8 font-body">{t('salon.noServicesAvailable')}</p>
              )}
            </div>

            {/* Staff */}
            {salon.employees && salon.employees.length > 0 && (
              <div className="card mb-6">
                <h2 className="text-2xl font-bold text-charcoal mb-6 font-display">Equipa</h2>
                <div className="space-y-2">
                  {salon.employees.map((employee) => (
                    <div key={employee.id} className="border border-medium-gray rounded-lg p-4 hover:shadow-card transition-shadow duration-200 bg-white">
                      <div className="flex justify-between items-center w-full">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          {/* Employee Photo */}
                          <div className="flex-shrink-0">
                            {employee.photo_url ? (
                              <div 
                                className="h-12 w-12 rounded-full overflow-hidden shadow-lg border-2"
                                style={{ borderColor: employee.color_code || '#1E90FF' }}
                              >
                                <img
                                  src={`${getImageUrl(employee.photo_url)}?t=${encodeURIComponent(employee.updated_at || '')}`}
                                  alt={employee.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div 
                                className="h-12 w-12 rounded-full flex items-center justify-center shadow-lg"
                                style={{ backgroundColor: employee.color_code || '#1E90FF' }}
                              >
                                <span className="text-white font-semibold text-lg font-body">
                                  {employee.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Employee Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-charcoal truncate font-body">{employee.name}</h4>
                            {employee.specialty && (
                              <p className="text-sm text-charcoal/70 truncate font-body">{employee.specialty}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-1">
                              {employee.email && (
                                <div className="flex items-center text-sm text-charcoal/70">
                                  <Mail className="h-4 w-4 mr-1" />
                                  <a href={`mailto:${employee.email}`} className="hover:text-charcoal truncate font-body">
                                    {employee.email}
                                  </a>
                                </div>
                              )}
                              {employee.phone && (
                                <div className="flex items-center text-sm text-charcoal/70">
                                  <Phone className="h-4 w-4 mr-1" />
                                  <a href={`tel:${employee.phone}`} className="hover:text-charcoal font-body">
                                    {employee.phone}
                                  </a>
                                </div>
                              )}
                            </div>
                            
                            {/* Employee Services */}
                            <EmployeeServicesDisplay employee={employee} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <ReviewSection 
              salonId={salonId} 
              reviewSummary={salon.reviews || { average_rating: 0, total_reviews: 0 }}
            />
          </div>

          {/* Right Column - Salon Info & Booking */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Salon Info Card */}
              <div className="card">
                <div className="flex items-start justify-between mb-4">
                  <h1 className="text-2xl font-bold text-charcoal font-display">{salon.nome}</h1>
                  {salon.is_bio_diamond && (
                    <span className="bg-soft-yellow text-charcoal text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 font-body">
                      BIO Diamond
                      <BioDiamondIcon className="text-charcoal" size="sm" />
                    </span>
                  )}
                </div>

                {/* Rating */}
                {salon.reviews && salon.reviews.total_reviews > 0 && (
                  <div className="flex items-center mb-4">
                    <StarRating rating={salon.reviews.average_rating} size="sm" />
                    <span className="ml-2 text-sm text-charcoal/70 font-body">
                      {salon.reviews.average_rating.toFixed(1)} ({salon.reviews.total_reviews} reviews)
                    </span>
                  </div>
                )}

                {/* Location */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-charcoal/60 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      {formatAddress() && (
                        <p className="text-sm text-charcoal/70 font-body">{formatAddress()}</p>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  {salon.telefone && (
                    <a 
                      href={`tel:${salon.telefone}`}
                      className="flex items-center py-2 min-h-[44px] hover:bg-light-gray -mx-2 px-2 rounded transition-colors"
                    >
                      <Phone className="h-5 w-5 text-charcoal/60 mr-3 flex-shrink-0" />
                      <span className="text-sm text-charcoal font-body">
                        {salon.telefone}
                      </span>
                    </a>
                  )}

                  {salon.email && (
                    <a 
                      href={`mailto:${salon.email}`}
                      className="flex items-center py-2 min-h-[44px] hover:bg-light-gray -mx-2 px-2 rounded transition-colors"
                    >
                      <Mail className="h-5 w-5 text-charcoal/60 mr-3 flex-shrink-0" />
                      <span className="text-sm text-charcoal break-all font-body">
                        {salon.email}
                      </span>
                    </a>
                  )}

                  {salon.website && (
                    <a 
                      href={salon.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center py-2 min-h-[44px] hover:bg-light-gray -mx-2 px-2 rounded transition-colors"
                    >
                      <ExternalLink className="h-5 w-5 text-charcoal/60 mr-3 flex-shrink-0" />
                      <span className="text-sm text-charcoal font-body">
                        {t('salon.visitWebsite')}
                      </span>
                    </a>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {salon.booking_enabled !== false ? (
                    <Link
                      to={`/book/${salon.id}`}
                      className="w-full btn-secondary text-center flex items-center justify-center min-h-[48px]"
                    >
                      <Calendar className="h-5 w-5 mr-2" />
                      {t('salon.bookAppointment')}
                    </Link>
                  ) : (
                    <div className="w-full bg-light-gray text-charcoal/60 text-center py-4 px-4 rounded-lg min-h-[48px] flex items-center justify-center border border-medium-gray font-body">
                      {t('salon.bookingNotAvailable')}
                    </div>
                  )}

                  {salon.latitude && salon.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${salon.latitude},${salon.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full btn-outline text-center flex items-center justify-center min-h-[48px]"
                    >
                      <Navigation className="h-5 w-5 mr-2" />
                      {t('salon.getDirections')}
                    </a>
                  )}
                </div>
              </div>


              {/* Working Hours */}
              <div className="card">
                <h3 className="text-lg font-semibold text-charcoal mb-4 font-display">{t('salon.openingHours')}</h3>
                <div className="space-y-2 text-sm">
                  {salon.working_hours ? (
                    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                      const dayKey = day.toLowerCase();
                      const dayHours = salon.working_hours && salon.working_hours[dayKey];
                      const isAvailable = dayHours && dayHours.available;
                      const timeRange = isAvailable ? `${dayHours.start} - ${dayHours.end}` : 'Closed';
                      
                      return (
                        <div key={day} className="flex justify-between">
                          <span className="text-charcoal/70 font-body">{day}</span>
                          <span className="text-charcoal font-body">{timeRange}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-charcoal/60 font-body">No working hours available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalonDetailsWithImages;
