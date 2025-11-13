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

const LeafletTest: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    console.log('Testing Leaflet initialization...');

    try {
      // Create map centered on Lisbon, Portugal
      const map = L.map(mapRef.current).setView([38.7223, -9.1393], 13);
      mapInstanceRef.current = map;

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Add a marker
      L.marker([38.7223, -9.1393]).addTo(map)
        .bindPopup('Lisbon, Portugal')
        .openPopup();

      setIsLoaded(true);
      console.log('✅ Leaflet test map created successfully');

    } catch (err) {
      console.error('❌ Leaflet test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Leaflet Map Test</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div 
        ref={mapRef} 
        style={{ height: '400px', width: '100%' }}
        className="border border-gray-300 rounded"
      />
      
      <div className="mt-4">
        <p>Status: {isLoaded ? '✅ Map loaded successfully' : '⏳ Loading...'}</p>
        <p>Check the browser console for detailed logs.</p>
      </div>
    </div>
  );
};

export default LeafletTest;
