import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Camera } from 'lucide-react';
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

interface SalonImageGalleryProps {
  images: SalonImage[];
  salonName: string;
  className?: string;
}

const SalonImageGallery: React.FC<SalonImageGalleryProps> = ({ 
  images, 
  salonName, 
  className = '' 
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-400 p-8">
          <Camera className="h-16 w-16 mx-auto mb-4" />
          <p className="text-lg font-medium">No images available</p>
          <p className="text-sm">Images will appear here when added</p>
        </div>
      </div>
    );
  }

  // Sort images: primary first, then by display_order
  const sortedImages = [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.display_order - b.display_order;
  });

  const currentImage = sortedImages[currentImageIndex];

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev < sortedImages.length - 1 ? prev + 1 : 0
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev > 0 ? prev - 1 : sortedImages.length - 1
    );
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Main Image */}
        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden group">
          <img
            src={getImageUrl(currentImage.image_url)}
            alt={currentImage.image_alt || `${salonName} - Image ${currentImageIndex + 1}`}
            className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
            onClick={openModal}
          />

          {/* Navigation Arrows */}
          {sortedImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-70"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Image Counter */}
          {sortedImages.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white text-sm px-3 py-1 rounded-full">
              {currentImageIndex + 1} / {sortedImages.length}
            </div>
          )}

          {/* Click to expand hint */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 rounded-full p-2">
              <Camera className="h-6 w-6 text-gray-700" />
            </div>
          </div>
        </div>

        {/* Thumbnail Strip */}
        {sortedImages.length > 1 && (
          <div className="mt-4 flex space-x-2 overflow-x-auto pb-2">
            {sortedImages.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setCurrentImageIndex(index)}
                className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  index === currentImageIndex
                    ? 'border-gray-900 ring-2 ring-gray-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={getImageUrl(image.image_url)}
                  alt={image.image_alt || `Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Full Screen Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-6xl max-h-full w-full">
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white text-3xl z-10 hover:text-gray-300 transition-colors duration-200"
            >
              <X className="h-8 w-8" />
            </button>

            {/* Main Image */}
            <div className="relative">
              <img
                src={getImageUrl(currentImage.image_url)}
                alt={currentImage.image_alt || `${salonName} - Image ${currentImageIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain mx-auto"
              />

              {/* Navigation Arrows */}
              {sortedImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-5xl hover:text-gray-300 transition-colors duration-200"
                  >
                    ‹
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-5xl hover:text-gray-300 transition-colors duration-200"
                  >
                    ›
                  </button>
                </>
              )}

              {/* Image Info */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center">
                <p className="text-lg font-medium">{salonName}</p>
                {currentImage.image_alt && (
                  <p className="text-sm opacity-80">{currentImage.image_alt}</p>
                )}
                {sortedImages.length > 1 && (
                  <p className="text-sm opacity-60 mt-1">
                    {currentImageIndex + 1} of {sortedImages.length}
                  </p>
                )}
              </div>
            </div>

            {/* Thumbnail Strip in Modal */}
            {sortedImages.length > 1 && (
              <div className="mt-6 flex justify-center space-x-2 overflow-x-auto">
                {sortedImages.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all duration-200 ${
                      index === currentImageIndex
                        ? 'border-white'
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <img
                      src={getImageUrl(image.image_url)}
                      alt={image.image_alt || `Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SalonImageGallery;
