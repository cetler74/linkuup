import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LeafletSalonMapProps {
  latitude?: number;
  longitude?: number;
  salonName: string;
  address?: string;
  height?: string;
  className?: string;
  isEditable?: boolean;
  onLocationChange?: (latitude: number, longitude: number) => void;
  location_type?: 'fixed' | 'mobile';
  coverage_radius?: number; // in kilometers
}

// Component to handle map clicks for editing
const MapClickHandler: React.FC<{
  isEditable: boolean;
  onLocationChange?: (latitude: number, longitude: number) => void;
}> = ({ isEditable, onLocationChange }) => {
  useMapEvents({
    click: (e) => {
      if (isEditable && onLocationChange) {
        const { lat, lng } = e.latlng;
        onLocationChange(lat, lng);
      }
    },
  });
  return null;
};

// Component to control map zoom and center
const MapController: React.FC<{
  center: [number, number];
  zoom: number;
}> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    console.log('MapController: Setting view to', center, 'with zoom', zoom);
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
};

// Component to fit map bounds to show coverage radius for mobile places
const FitBoundsController: React.FC<{
  center: [number, number];
  radiusKm: number;
}> = ({ center, radiusKm }) => {
  const map = useMap();
  
  useEffect(() => {
    if (radiusKm && radiusKm > 0) {
      // Calculate bounds that include the circle
      // Add padding to ensure the circle is fully visible
      const paddingFactor = 1.2; // 20% padding
      const radiusMeters = radiusKm * 1000 * paddingFactor;
      
      // Calculate bounds from center and radius
      // Approximate: 1 degree latitude ≈ 111 km
      const latDelta = (radiusMeters / 111000);
      const lngDelta = (radiusMeters / (111000 * Math.cos(center[0] * Math.PI / 180)));
      
      const bounds = [
        [center[0] - latDelta, center[1] - lngDelta] as [number, number],
        [center[0] + latDelta, center[1] + lngDelta] as [number, number]
      ];
      
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, center, radiusKm]);
  
  return null;
};

const LeafletSalonMap: React.FC<LeafletSalonMapProps> = ({
  latitude,
  longitude,
  salonName,
  address,
  height = '200px',
  className,
  isEditable = false,
  onLocationChange,
  location_type = 'fixed',
  coverage_radius
}) => {
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(15);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [hasGeocoded, setHasGeocoded] = useState(false);

  // Debug logging
  // console.log('LeafletSalonMap props:', { latitude, longitude, salonName, address, isEditable });

  // Default center to Portugal if no coordinates provided
  const defaultCenter: [number, number] = [39.5, -8.0];

  // Geocoding function to convert address to coordinates
  const geocodeAddress = async (address: string): Promise<{coords: [number, number], zoom: number} | null> => {
    try {
      setIsGeocoding(true);
      
      // Try different address formats for better results
      const addressVariations = [
        { addr: address, zoom: 19 }, // Full address - highest zoom
        { addr: address.split(',').slice(0, 2).join(','), zoom: 18 }, // City and street - high zoom
        { addr: address.split(',')[0], zoom: 17 }, // Street only - medium-high zoom
        { addr: 'Porto, Portugal', zoom: 15 } // Fallback to city - medium zoom
      ];
      
      for (const variation of addressVariations) {
        // Add delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const encodedAddress = encodeURIComponent(variation.addr);
        
        try {
          // Use our backend proxy to avoid CORS issues
          const response = await fetch(`/api/geocode?q=${encodedAddress}`);
          
          if (response.status === 429) {
            console.warn('Rate limited by Nominatim API, skipping this variation');
            continue;
          }
          
          const data = await response.json();
          
          if (data && data.length > 0) {
            const result = data[0];
            const coords = [parseFloat(result.lat), parseFloat(result.lon)];
            return { coords, zoom: variation.zoom };
          }
        } catch (error) {
          console.warn('Geocoding request failed for variation:', variation.addr, error);
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    } finally {
      setIsGeocoding(false);
    }
  };

  // Update marker position when coordinates change
  useEffect(() => {
    if (latitude && longitude) {
      setMarkerPosition([latitude, longitude]);
      setMapCenter([latitude, longitude]);
      
      // For mobile places with coverage radius, calculate appropriate zoom
      if (location_type === 'mobile' && coverage_radius && coverage_radius > 0) {
        // Calculate zoom level based on radius
        // Approximate formula: zoom decreases as radius increases
        let calculatedZoom = 15; // default
        if (coverage_radius <= 5) {
          calculatedZoom = 13;
        } else if (coverage_radius <= 10) {
          calculatedZoom = 12;
        } else if (coverage_radius <= 20) {
          calculatedZoom = 11;
        } else if (coverage_radius <= 50) {
          calculatedZoom = 10;
        } else {
          calculatedZoom = 9;
        }
        setMapZoom(calculatedZoom);
      }
    } else {
      // Reset marker position if no coordinates are provided
      setMarkerPosition(null);
    }
  }, [latitude, longitude, location_type, coverage_radius]);

  // Reset geocoding flag and zoom when switching between edit/view modes
  useEffect(() => {
    if (!isEditable) {
      setHasGeocoded(false);
      setMapZoom(15); // Reset to default zoom for view mode
    }
  }, [isEditable]);

  // Handle geocoding when entering edit mode
  useEffect(() => {
    if (isEditable && address && !hasGeocoded) {
      setHasGeocoded(true); // Prevent multiple geocoding attempts
      
      // Always try to geocode when in edit mode if we have an address
      const geocodeAndCenter = async () => {
        const result = await geocodeAddress(address);
        if (result) {
          console.log('Geocoding result:', result);
          setMapCenter(result.coords);
          setMapZoom(result.zoom); // Dynamic zoom based on geocoding accuracy
          console.log('Set map center to:', result.coords, 'and zoom to:', result.zoom);
          // Only update marker if we don't have existing coordinates
          if (!latitude || !longitude) {
            setMarkerPosition(result.coords);
            if (onLocationChange) {
              onLocationChange(result.coords[0], result.coords[1]);
            }
          }
        } else {
          console.log('Geocoding failed, using fallback');
          setMapCenter([latitude || 41.1579, longitude || -8.6291]);
          setMapZoom(16); // Medium zoom for fallback location
        }
      };
      geocodeAndCenter();
    } else if (isEditable && !address) {
      setMapCenter([latitude || 41.1579, longitude || -8.6291]);
      setMapZoom(16); // Medium zoom for edit mode without address
    }
  }, [isEditable, address, latitude, longitude, onLocationChange, hasGeocoded]);

  // Handle location change from map clicks
  const handleLocationChange = (lat: number, lng: number) => {
    setMarkerPosition([lat, lng]);
    if (onLocationChange) {
      onLocationChange(lat, lng);
    }
  };

  // Determine the center and marker positions
  const displayCenter = mapCenter || (latitude && longitude ? [latitude, longitude] : [41.1579, -8.6291]);
  const displayMarker = markerPosition || (latitude && longitude ? [latitude, longitude] : [41.1579, -8.6291]);

  // console.log('Creating map with center:', displayCenter, 'marker:', displayMarker, 'geocoding:', isGeocoding);

  return (
    <div style={{ height, width: '100%' }} className={className}>
      {isGeocoding && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Finding location...</p>
          </div>
        </div>
      )}
      <MapContainer
        center={displayCenter as [number, number]}
        zoom={mapZoom}
        scrollWheelZoom={isEditable}
        dragging={isEditable}
        touchZoom={isEditable}
        doubleClickZoom={isEditable}
        boxZoom={isEditable}
        keyboard={isEditable}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {location_type === 'mobile' && coverage_radius && coverage_radius > 0 ? (
          <FitBoundsController center={displayCenter as [number, number]} radiusKm={coverage_radius} />
        ) : (
          <MapController center={displayCenter as [number, number]} zoom={mapZoom} />
        )}
        <MapClickHandler isEditable={isEditable} onLocationChange={handleLocationChange} />
        {location_type === 'mobile' && coverage_radius && coverage_radius > 0 && (
          <Circle
            center={displayCenter as [number, number]}
            radius={coverage_radius * 1000} // Convert km to meters
            pathOptions={{
              color: '#3B82F6',
              fillColor: '#3B82F6',
              fillOpacity: 0.2,
              weight: 2
            }}
          >
            <Popup>
              <strong>{salonName}</strong><br />
              Service Area: {coverage_radius} km radius
            </Popup>
          </Circle>
        )}
        <Marker 
          position={displayMarker as [number, number]}
          draggable={isEditable}
          eventHandlers={isEditable ? {
            dragend: (e) => {
              const marker = e.target;
              const position = marker.getLatLng();
              handleLocationChange(position.lat, position.lng);
            }
          } : {}}
        >
          <Popup>
            <strong>{salonName}</strong><br />
            {address || 'Location'}
            {location_type === 'mobile' && coverage_radius && (
              <>
                <br />
                <small>Service Area: {coverage_radius} km radius</small>
              </>
            )}
            {isEditable && (
              <>
                <br />
                <em>Click on the map or drag the marker to set exact location</em>
                {isGeocoding && (
                  <>
                    <br />
                    <small>Finding address location...</small>
                  </>
                )}
              </>
            )}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default LeafletSalonMap;