import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapWithPinProps {
  initialLat?: number;
  initialLng?: number;
  address?: string;
  onLocationChange: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}

// Custom marker icon
const createCustomIcon = (color: string = '#3B82F6') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50% 50% 50% 0;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transform: rotate(-45deg);
        position: relative;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });
};

// Component to handle map events
const MapEvents: React.FC<{
  onLocationChange: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}> = ({ onLocationChange, initialLat, initialLng }) => {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );

  // Update position when initial coordinates change
  useEffect(() => {
    if (initialLat && initialLng) {
      setPosition([initialLat, initialLng]);
    }
  }, [initialLat, initialLng]);

  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onLocationChange(lat, lng);
    },
  });

  return position ? (
    <Marker position={position} icon={createCustomIcon()} />
  ) : null;
};

const MapWithPin: React.FC<MapWithPinProps> = ({
  initialLat,
  initialLng,
  address,
  onLocationChange,
  height = '400px',
  className = '',
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.5, -8.0]); // Default to Portugal center
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<L.Map>(null);

  // Geocode address to coordinates using our backend proxy
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      console.log('MapWithPin - Starting geocoding for address:', address);
      
      // Add a small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use our backend proxy to avoid CORS issues
      const geocodeUrl = `/api/geocode?q=${encodeURIComponent(address)}`;
      console.log('MapWithPin - Geocode URL:', geocodeUrl);
      
      const response = await fetch(geocodeUrl);
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limited by Nominatim API, using fallback coordinates');
          return null;
        }
        console.error('Geocoding HTTP error:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('MapWithPin - Geocoding response:', data);
      
      if (data && data.length > 0) {
        const result = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
        console.log('MapWithPin - Found coordinates:', result);
        return result;
      }
      
      console.warn('MapWithPin - No results found for address:', address);
      return null;
    } catch (error) {
      console.error('MapWithPin - Geocoding error:', error);
      return null;
    }
  };

  // Initialize map center
  useEffect(() => {
    const initializeMap = async () => {
      if (initialLat && initialLng) {
        setMapCenter([initialLat, initialLng]);
        // Don't call onLocationChange here to avoid overwriting existing coordinates
        return;
      }

      if (address && address.trim().length > 0) {
        setIsLoading(true);
        setError(null);
        
        try {
          const coords = await geocodeAddress(address);
          if (coords) {
            setMapCenter([coords.lat, coords.lng]);
            onLocationChange(coords.lat, coords.lng);
          } else {
            setError('Could not find location for the provided address');
            // Fallback to Portugal center if geocoding fails
            setMapCenter([39.5, -8.0]);
          }
        } catch (error) {
          console.error('Error during geocoding:', error);
          setError('Failed to load map location');
          setMapCenter([39.5, -8.0]);
        }
        
        setIsLoading(false);
      }
    };

    initializeMap();
  }, [address, initialLat, initialLng, onLocationChange]);

  // Update map center when coordinates change
  useEffect(() => {
    if (mapRef.current && initialLat && initialLng) {
      mapRef.current.setView([initialLat, initialLng], 15);
    }
  }, [initialLat, initialLng]);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Finding location...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-2 left-2 right-2 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm z-10">
          {error}
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents
          onLocationChange={onLocationChange}
          initialLat={initialLat}
          initialLng={initialLng}
        />
      </MapContainer>
      
      <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 px-2 py-1 rounded text-xs text-gray-600 z-10">
        Click on the map to set salon location
      </div>
    </div>
  );
};

export default MapWithPin;
