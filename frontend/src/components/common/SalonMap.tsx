import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface SalonMapProps {
  lat: number;
  lng: number;
  salonName: string;
  address?: string;
  height?: string;
  className?: string;
  zoom?: number;
}

// Custom marker icon for salons
const createSalonIcon = () => {
  return L.divIcon({
    className: 'salon-marker',
    html: `
      <div style="
        background-color: #EF4444;
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transform: rotate(-45deg);
        position: relative;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          width: 10px;
          height: 10px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
};

const SalonMap: React.FC<SalonMapProps> = ({
  lat,
  lng,
  salonName,
  address,
  height = '300px',
  className = '',
  zoom = 15,
}) => {
  if (!lat || !lng) {
    return (
      <div 
        className={`bg-gray-100 flex items-center justify-center text-gray-500 ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <p className="text-sm">Location not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={createSalonIcon()}>
          <Popup>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">{salonName}</h3>
              {address && (
                <p className="text-sm text-gray-600 mt-1">{address}</p>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default SalonMap;
