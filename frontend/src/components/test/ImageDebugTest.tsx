import React, { useState } from 'react';
import { placeAPI } from '../../utils/api';

const ImageDebugTest: React.FC = () => {
  const [salon, setSalon] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const loadSalon = async () => {
    setLoading(true);
    try {
      const response = await placeAPI.getPlace(1);
      setSalon(response);
      console.log('Loaded salon:', response);
      console.log('Images:', response.images);
    } catch (error) {
      console.error('Error loading salon:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextImage = () => {
    if (salon?.images) {
      setCurrentImageIndex((prev) => 
        prev < salon.images.length - 1 ? prev + 1 : 0
      );
    }
  };

  const prevImage = () => {
    if (salon?.images) {
      setCurrentImageIndex((prev) => 
        prev > 0 ? prev - 1 : salon.images.length - 1
      );
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Image Debug Test</h1>
      
      <div className="mb-6">
        <button
          onClick={loadSalon}
          disabled={loading}
          className="btn-primary mr-4"
        >
          {loading ? 'Loading...' : 'Load Salon 1'}
        </button>
      </div>

      {salon && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">{salon.nome}</h2>
            <p>Total images: {salon.images?.length || 0}</p>
            <p>Current image index: {currentImageIndex}</p>
          </div>

          {salon.images && salon.images.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Image Gallery</h3>
              
              {/* Main Image */}
              <div className="relative mb-4">
                <img
                  src={salon.images[currentImageIndex].image_url}
                  alt={salon.images[currentImageIndex].image_alt || 'Salon image'}
                  className="w-full h-64 object-cover rounded-lg"
                  onLoad={() => console.log('Image loaded:', salon.images[currentImageIndex].image_url)}
                  onError={(e) => console.error('Image failed to load:', salon.images[currentImageIndex].image_url, e)}
                />
                
                {/* Navigation */}
                <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
                  <button
                    onClick={prevImage}
                    className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                  >
                    ‹
                  </button>
                </div>
                <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
                  <button
                    onClick={nextImage}
                    className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                  >
                    ›
                  </button>
                </div>
                
                {/* Counter */}
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1} / {salon.images.length}
                </div>
              </div>

              {/* Thumbnails */}
              <div className="flex space-x-2">
                {salon.images.map((image: any, index: number) => (
                  <button
                    key={image.id}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-16 h-16 rounded border-2 overflow-hidden ${
                      index === currentImageIndex
                        ? 'border-blue-500'
                        : 'border-gray-300'
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={image.image_alt || `Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Image Details */}
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <h4 className="font-semibold mb-2">Current Image Details:</h4>
                <p><strong>URL:</strong> {salon.images[currentImageIndex].image_url}</p>
                <p><strong>Alt:</strong> {salon.images[currentImageIndex].image_alt || 'No alt text'}</p>
                <p><strong>Primary:</strong> {salon.images[currentImageIndex].is_primary ? 'Yes' : 'No'}</p>
                <p><strong>Order:</strong> {salon.images[currentImageIndex].display_order}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageDebugTest;
