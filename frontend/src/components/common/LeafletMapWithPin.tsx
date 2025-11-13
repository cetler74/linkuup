import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LeafletMapWithPinProps {
  initialLat?: number;
  initialLng?: number;
  address?: string;
  onLocationChange?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}

const LeafletMapWithPin: React.FC<LeafletMapWithPinProps> = ({
  initialLat,
  initialLng,
  address,
  onLocationChange,
  height = '300px',
  className
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    console.log('Map initialization effect triggered:', {
      hasMapRef: !!mapRef.current,
      hasMapInstance: !!mapInstanceRef.current,
      mapRefElement: mapRef.current
    });

    if (!mapRef.current || mapInstanceRef.current) {
      console.log('Map ref not ready or map already exists');
      return;
    }

    // Add a small delay to ensure the DOM element is fully rendered
    const timer = setTimeout(() => {
      if (!mapRef.current || mapInstanceRef.current) {
        console.log('Map ref still not ready after delay');
        return;
      }

      console.log('Initializing Leaflet map...');

      try {
        // Default center to Portugal
        const defaultCenter: [number, number] = [39.5, -8.0];
        const initialCenter: [number, number] = initialLat && initialLng 
          ? [initialLat, initialLng] 
          : defaultCenter;

        console.log('Creating map with center:', initialCenter);

        // Create map
        const map = L.map(mapRef.current).setView(initialCenter, initialLat && initialLng ? 15 : 8);
        mapInstanceRef.current = map;

        console.log('Map created, adding tiles...');

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        console.log('Tiles added, setting up markers and events...');

        // Create initial marker if coordinates are provided
        if (initialLat && initialLng) {
          console.log('Creating initial marker at:', initialLat, initialLng);
          const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
          markerRef.current = marker;

          // Add drag listener
          marker.on('dragend', (e) => {
            const position = e.target.getLatLng();
            if (onLocationChange) {
              onLocationChange(position.lat, position.lng);
            }
          });
        }

        // Add click listener to map
        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
            markerRef.current = marker;
            
            // Add drag listener
            marker.on('dragend', (e) => {
              const position = e.target.getLatLng();
              if (onLocationChange) {
                onLocationChange(position.lat, position.lng);
              }
            });
          }
          
          if (onLocationChange) {
            onLocationChange(lat, lng);
          }
        });

        setIsLoaded(true);
        console.log('✅ Leaflet map created successfully');

      } catch (error) {
        console.error('❌ Error creating Leaflet map:', error);
        setIsLoaded(true); // Set to true even on error to show the error state
      }
    }, 100); // 100ms delay

    // Cleanup function to prevent double initialization
    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [initialLat, initialLng, onLocationChange]);

  // Handle geocoding when address is provided
  useEffect(() => {
    if (!mapInstanceRef.current || !address || (initialLat && initialLng)) {
      console.log('Geocoding skipped:', { 
        hasMap: !!mapInstanceRef.current, 
        hasAddress: !!address, 
        hasCoords: !!(initialLat && initialLng) 
      });
      return;
    }

    console.log('Starting geocoding for address:', address);

    // Use Nominatim (OpenStreetMap's geocoding service)
    const geocodeAddress = async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=pt`;
        console.log('Geocoding URL:', url);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'BioSearch2/1.0'
          }
        });
        const data = await response.json();
        
        console.log('Geocoding response:', data);
        
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          const map = mapInstanceRef.current;
          
          console.log('Geocoded coordinates:', { lat, lon });
          
          if (map) {
            map.setView([parseFloat(lat), parseFloat(lon)], 15);
            
            // Create marker at geocoded location
            if (markerRef.current) {
              markerRef.current.remove();
            }
            
            const marker = L.marker([parseFloat(lat), parseFloat(lon)], { draggable: true }).addTo(map);
            markerRef.current = marker;
            
            // Add drag listener
            marker.on('dragend', (e) => {
              const position = e.target.getLatLng();
              if (onLocationChange) {
                onLocationChange(position.lat, position.lng);
              }
            });
            
            // Call onLocationChange with geocoded coordinates
            if (onLocationChange) {
              onLocationChange(parseFloat(lat), parseFloat(lon));
            }
            
            console.log('✅ Address geocoded successfully:', data[0].display_name);
          }
        } else {
          console.error('❌ Geocoding failed: No results found for address:', address);
        }
      } catch (error) {
        console.error('❌ Geocoding error:', error);
      }
    };

    geocodeAddress();
  }, [address, initialLat, initialLng, onLocationChange]);


  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100" style={{ height }}>
        <div className="text-gray-600">Loading map...</div>
      </div>
    );
  }

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      <div
        ref={mapRef}
        style={{ 
          height: '100%', 
          width: '100%',
          minHeight: '200px',
          backgroundColor: '#f0f0f0'
        }}
        className={className}
      />
      {!mapInstanceRef.current && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-600">Map failed to load</div>
        </div>
      )}
    </div>
  );
};

export default LeafletMapWithPin;
