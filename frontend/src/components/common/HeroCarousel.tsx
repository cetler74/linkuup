import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroCarouselProps {
  className?: string;
  showTitle?: boolean;
}

const HeroCarousel: React.FC<HeroCarouselProps> = ({ className = '', showTitle = true }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Define the carousel images
  const images = [
    {
      src: '/images/barbershop.png',
      alt: 'Stylish barbershop interior with vintage aesthetic',
      title: 'Premium Barbershop Experience'
    },
    {
      src: '/images/hair_salon.png',
      alt: 'Modern hair salon with industrial chic design',
      title: 'Modern Hair Salon'
    },
    {
      src: '/images/tattoo_studio.png',
      alt: 'Professional tattoo artist at work',
      title: 'Professional Tattoo Studio'
    }
  ];

  // Auto-rotate carousel every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 30000);

    return () => clearInterval(interval);
  }, [images.length]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{backgroundColor: '#7B2E2E'}}>
      {/* Background Images */}
      <div className="absolute inset-0">
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url(${image.src})`,
              backgroundSize: '120%',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat'
            }}
            onError={(e) => {
              console.error(`Failed to load image: ${image.src}`);
              // Fallback to a solid color if image fails to load
              e.currentTarget.style.backgroundColor = '#7B2E2E';
            }}
          />
        ))}
      </div>

      {/* Barbershop overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-burgundy/60 via-burgundy/40 to-charcoal/50"></div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-gold/20 hover:bg-gold/30 text-gold p-2 rounded-full transition-all duration-200 backdrop-blur-sm border border-gold/30"
        aria-label="Previous image"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-gold/20 hover:bg-gold/30 text-gold p-2 rounded-full transition-all duration-200 backdrop-blur-sm border border-gold/30"
        aria-label="Next image"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Carousel Indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-gold scale-110'
                : 'bg-gold bg-opacity-50 hover:bg-opacity-75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Image Title Overlay (optional) */}
      {showTitle && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-20 text-center">
          <h3 className="text-cream text-lg font-semibold bg-charcoal/70 px-4 py-2 rounded-lg backdrop-blur-sm border border-gold/30">
            {images[currentIndex].title}
          </h3>
        </div>
      )}
    </div>
  );
};

export default HeroCarousel;
