import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, ExternalLink, Star, ChevronLeft, ChevronRight, Camera, Instagram } from 'lucide-react';
import BioDiamondIcon from '../common/BioDiamondIcon';
import { useTranslation } from 'react-i18next';
import { getImageUrl } from '../../utils/api';

// Inline types to avoid import issues
interface SalonImage {
  id: number;
  place_id: number;
  image_url: string;
  image_alt?: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

interface SalonService {
  id: number;
  name: string;
  category: string;
  description: string;
  is_bio_diamond: boolean;
  price: number;
  duration: number;
}

interface Salon {
  id: number;
  slug?: string; // Optional until migration is run
  nome: string;
  cidade: string;
  regiao: string;
  telefone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  rua?: string;
  porta?: string;
  cod_postal?: string;
  latitude?: number;
  longitude?: number;
  booking_enabled?: boolean;
  is_bio_diamond?: boolean;
  about?: string;
  services?: SalonService[];
  images?: SalonImage[];
  reviews?: {
    average_rating: number;
    total_reviews: number;
  };
}

interface SalonCardWithImagesProps {
  salon: Salon;
  showServices?: boolean;
}

const SalonCardWithImages: React.FC<SalonCardWithImagesProps> = ({ 
  salon, 
  showServices = false 
}) => {
  const { t } = useTranslation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const formatAddress = () => {
    const parts = [];
    if (salon.rua) parts.push(salon.rua);
    if (salon.porta) parts.push(salon.porta);
    if (salon.cidade) parts.push(salon.cidade);
    if (salon.cod_postal) parts.push(salon.cod_postal);
    return parts.join(', ');
  };

  const bioServices = salon.services?.filter(service => service.is_bio_diamond);
  const hasBioServices = bioServices && bioServices.length > 0;

  // Get images, with primary image first, then by creation date
  const sortedImages = salon.images ? [...salon.images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  }) : [];

  // Debug logging
  React.useEffect(() => {
    console.log('SalonCardWithImages - Salon:', salon.nome, 'Images:', sortedImages.length, 'Current index:', currentImageIndex);
    if (sortedImages.length > 0) {
      console.log('Current image URL:', sortedImages[currentImageIndex]?.image_url);
      console.log('Processed image URL:', getImageUrl(sortedImages[currentImageIndex]?.image_url));
      console.log('Final image URL with timestamp:', `${getImageUrl(sortedImages[currentImageIndex]?.image_url)}?t=${Date.now()}`);
    }
  }, [salon.nome, sortedImages.length, currentImageIndex]);

  const primaryImage = sortedImages.find(img => img.is_primary) || sortedImages[0];
  const thumbnailImages = sortedImages.slice(0, 4); // Show max 4 thumbnails

  const nextImage = () => {
    setCurrentImageIndex((prev) => {
      const next = prev < sortedImages.length - 1 ? prev + 1 : 0;
      console.log('Next image:', next, 'Total images:', sortedImages.length);
      return next;
    });
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => {
      const next = prev > 0 ? prev - 1 : sortedImages.length - 1;
      console.log('Prev image:', next, 'Total images:', sortedImages.length);
      return next;
    });
  };

  const openImageModal = (index: number) => {
    setCurrentImageIndex(index);
    setIsImageModalOpen(true);
  };

  // Handle card hover for background effects
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('cardHover', { 
      detail: { 
        hovered: true,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      } 
    }));
  };

  const handleMouseLeave = () => {
    window.dispatchEvent(new CustomEvent('cardHover', { 
      detail: { hovered: false } 
    }));
  };

  return (
    <>
      <div 
        className="salon-card bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group flex flex-col h-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Image Section */}
        <div className="relative h-56 sm:h-48 bg-gray-100 overflow-hidden flex-shrink-0">
          {sortedImages.length > 0 ? (
            <div className="relative h-full">
              <img
                key={`${salon.id}-${currentImageIndex}-${Date.now()}`}
                src={`${getImageUrl(sortedImages[currentImageIndex].image_url)}?t=${Date.now()}`}
                alt={sortedImages[currentImageIndex].image_alt || `${salon.nome} - Salon Image`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onClick={() => openImageModal(currentImageIndex)}
                loading="lazy"
                onError={(e) => {
                  console.warn('Image failed to load, using fallback:', getImageUrl(sortedImages[currentImageIndex].image_url));
                  // Replace with fallback image
                  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
                  const backendBase = apiBase.replace('/api/v1', '') || window.location.origin;
                  e.target.src = `${backendBase}/api/placeholder/400/300`;
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', getImageUrl(sortedImages[currentImageIndex].image_url));
                }}
              />
              
              {/* Image Navigation Arrows */}
              {sortedImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage();
                    }}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* Image Counter */}
              {sortedImages.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                  {currentImageIndex + 1}/{sortedImages.length}
                </div>
              )}

              {/* BIO Diamond Badge */}
              {(salon.is_bio_diamond || hasBioServices) && (
                <div className="absolute top-3 left-3">
                  <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg flex items-center gap-1">
                    {t('common.bioDiamond')}
                    <BioDiamondIcon className="text-white" size="sm" />
                  </span>
                </div>
              )}

              {/* Rating Overlay */}
              {salon.reviews && salon.reviews.total_reviews > 0 && (
                <div className="absolute top-3 right-3 bg-white bg-opacity-90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center space-x-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <span className="text-xs font-medium text-gray-900">
                    {salon.reviews.average_rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="text-center text-gray-400">
                <Camera className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">No images available</p>
              </div>
            </div>
          )}

          {/* Thumbnail Strip */}
          {thumbnailImages.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
              <div className="flex space-x-1 justify-center">
                {thumbnailImages.slice(0, 4).map((image, index) => (
                  <button
                    key={image.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Thumbnail clicked:', index, 'Current:', currentImageIndex);
                      setCurrentImageIndex(index);
                    }}
                    className={`w-10 h-10 sm:w-8 sm:h-8 rounded border-2 overflow-hidden ${
                      index === currentImageIndex 
                        ? 'border-white' 
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={getImageUrl(image.image_url)}
                      alt={image.image_alt || `Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.warn('Thumbnail image failed to load:', getImageUrl(image.image_url));
                        const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
                        const backendBase = apiBase.replace('/api/v1', '') || window.location.origin;
                        e.target.src = `${backendBase}/api/placeholder/100/100`;
                      }}
                    />
                  </button>
                ))}
                {sortedImages.length > 4 && (
                  <div className="w-10 h-10 sm:w-8 sm:h-8 rounded border-2 border-transparent bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      +{sortedImages.length - 4}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Salon Name and Badge */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 flex-1">
              {salon.nome}
            </h3>
          </div>

          {/* Location and Address */}
          <div className="flex items-center text-gray-600 mb-3">
            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="text-sm line-clamp-1">
              {formatAddress() || `${salon.cidade}, ${salon.regiao}`}
            </span>
          </div>

          {/* Contact Info */}
          <div className="space-y-1 mb-4">
            {salon.telefone && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
                <span className="truncate">{salon.telefone}</span>
              </div>
            )}
            {salon.email && (
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-3 w-3 mr-2 flex-shrink-0" />
                <span className="truncate">{salon.email}</span>
              </div>
            )}
            {salon.website && (
              <div className="flex items-center text-sm text-gray-900">
                <ExternalLink className="h-3 w-3 mr-2 flex-shrink-0" />
                <span className="truncate">Website</span>
              </div>
            )}
            {salon.instagram && (
              <div className="flex items-center text-sm text-pink-600">
                <Instagram className="h-3 w-3 mr-2 flex-shrink-0" />
                <span className="truncate">Instagram</span>
              </div>
            )}
          </div>

          {/* Services Preview */}
          {showServices && salon.services && salon.services.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Featured Services</h4>
              <div className="flex flex-wrap gap-1">
                {salon.services.slice(0, 3).map((service) => (
                  <span
                    key={service.id}
                    className={`text-xs px-2 py-1 rounded-full ${
                      service.is_bio_diamond 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {service.name}
                  </span>
                ))}
                {salon.services.length > 3 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                    +{salon.services.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 mt-auto">
            <Link 
              to={`/place/${salon.slug || salon.id}`}
              className="flex-1 btn-primary text-center text-sm py-3 min-h-[48px]"
            >
              {t('search.viewDetails')}
            </Link>
            {salon.booking_enabled !== false && (
              <Link 
                to={`/book/${salon.id}`}
                className="flex-1 btn-secondary text-center text-sm py-3 min-h-[48px]"
              >
                {t('search.bookNow')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {isImageModalOpen && sortedImages.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 text-white text-2xl z-10 hover:text-gray-300"
            >
              ×
            </button>
            
            <img
              src={sortedImages[currentImageIndex].image_url}
              alt={sortedImages[currentImageIndex].image_alt || `${salon.nome} - Image ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            
            {sortedImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-4xl hover:text-gray-300"
                >
                  ‹
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-4xl hover:text-gray-300"
                >
                  ›
                </button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
                  {currentImageIndex + 1} / {sortedImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SalonCardWithImages;
