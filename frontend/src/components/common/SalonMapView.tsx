import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Place } from '../../utils/api'; // Import Place and PlaceImage as types

// Custom cluster styling
const clusterStyles = `
  .marker-cluster {
    background-clip: padding-box;
    border-radius: 20px;
  }
  .marker-cluster div {
    width: 30px;
    height: 30px;
    margin-left: 5px;
    margin-top: 5px;
    text-align: center;
    border-radius: 15px;
    font: 12px "Helvetica Neue", Arial, Helvetica, sans-serif;
    font-weight: bold;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .marker-cluster span {
    line-height: 30px;
  }
  .marker-cluster-small {
    background-color: rgba(59, 130, 246, 0.8);
  }
  .marker-cluster-small div {
    background-color: rgba(59, 130, 246, 0.9);
  }
  .marker-cluster-medium {
    background-color: rgba(16, 185, 129, 0.8);
  }
  .marker-cluster-medium div {
    background-color: rgba(16, 185, 129, 0.9);
  }
  .marker-cluster-large {
    background-color: rgba(239, 68, 68, 0.8);
  }
  .marker-cluster-large div {
    background-color: rgba(239, 68, 68, 0.9);
  }
`;

// Inject custom styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = clusterStyles + `
    .custom-popup .leaflet-popup-content-wrapper {
      background: #FFFFFF;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      padding: 0;
      border: 1px solid #E0E0E0;
    }
    .custom-popup .leaflet-popup-content {
      margin: 0;
      padding: 0;
    }
    .custom-popup .leaflet-popup-tip {
      background: #FFFFFF;
    }
  `;
  document.head.appendChild(style);
}

// Fix for default markers in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Use the imported Place interface directly
interface Salon extends Place {}

interface SalonMapViewProps {
  salons: Salon[];
  height?: string;
  className?: string;
}

// Component to fit map bounds to show all markers (only on initial load)
const MapBoundsController: React.FC<{ salons: Salon[] }> = ({ salons }) => {
  const map = useMap();
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Memoize valid salons to prevent infinite loops
  const validSalons = useMemo(() => 
    salons.filter(salon => salon.latitude && salon.longitude), 
    [salons]
  );
  
  useEffect(() => {
    // Only set initial bounds once, don't interfere with user interactions
    if (!hasInitialized && validSalons.length > 0) {
      if (validSalons.length === 1) {
        // If only one salon, center on it with a good zoom level
        const salon = validSalons[0];
        map.setView([salon.latitude!, salon.longitude!], 14);
      } else {
        // Multiple salons - fit bounds with appropriate padding
        const bounds = L.latLngBounds(
          validSalons.map(salon => [salon.latitude!, salon.longitude!])
        );
        
        // Add padding and ensure reasonable zoom level
        map.fitBounds(bounds, { 
          padding: [50, 50],
          maxZoom: 12 // Allow more zoom for user interaction
        });
      }
      setHasInitialized(true);
    } else if (!hasInitialized && validSalons.length === 0) {
      // Default to Portugal center if no salons
      map.setView([39.5, -8.0], 6);
      setHasInitialized(true);
    }
  }, [map, validSalons, hasInitialized]);
  
  return null;
};

// Component to handle marker clustering
const MarkerClusterGroup: React.FC<{ salons: Salon[] }> = ({ salons }) => {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  // Memoize valid salons to prevent infinite loops
  const validSalons = useMemo(() => 
    salons.filter(salon => salon.latitude && salon.longitude), 
    [salons]
  );

  useEffect(() => {
    if (!clusterRef.current) {
      // Create cluster group with custom styling
      clusterRef.current = L.markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true, // Spiderfy markers when zoomed in
        showCoverageOnHover: false, // Don't show coverage on hover
        zoomToBoundsOnClick: true, // Zoom to bounds when cluster is clicked
        disableClusteringAtZoom: 16, // Disable clustering at high zoom levels
        maxClusterRadius: function(zoom) {
          // Dynamic cluster radius based on zoom level
          return zoom > 10 ? 40 : 80;
        },
        iconCreateFunction: function(cluster) {
          const childCount = cluster.getChildCount();
          let className = 'marker-cluster marker-cluster-';
          
          if (childCount < 10) {
            className += 'small';
          } else if (childCount < 100) {
            className += 'medium';
          } else {
            className += 'large';
          }
          
          return L.divIcon({
            html: '<div><span>' + childCount + '</span></div>',
            className: className,
            iconSize: L.point(40, 40)
          });
        }
      });
      
      map.addLayer(clusterRef.current);
    }

    // Clear existing markers
    clusterRef.current.clearLayers();

    // Add markers to cluster
    validSalons.forEach(salon => {
      if (salon.latitude && salon.longitude) {
        const marker = L.marker([salon.latitude, salon.longitude]);
        
        // Get the first/primary image
        const sortedImages = salon.images ? [...salon.images].sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return a.display_order - b.display_order;
        }) : [];
        const primaryImage = sortedImages.find(img => img.is_primary) || sortedImages[0];
        
        // Format address
        const formatAddress = () => {
          const parts = [];
          if (salon.rua) parts.push(salon.rua);
          if (salon.porta) parts.push(salon.porta);
          if (salon.cidade) parts.push(salon.cidade);
          if (salon.cod_postal) parts.push(salon.cod_postal);
          return parts.join(', ');
        };

        // Create popup content matching branding (fonts, colors, radii, shadows)
        const popupContent = `
          <div class="bg-white rounded-lg overflow-hidden" style="width: 320px; max-width: 90vw; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #E0E0E0;">
            <!-- Image Section -->
            <div class="relative h-32 bg-[#F5F5F5] overflow-hidden">
              ${primaryImage ? `
                <img
                  src="${primaryImage.image_url}"
                  alt="${primaryImage.image_alt || `${salon.nome} - Salon Image`}"
                  class="w-full h-full object-cover"
                />
                ${salon.is_bio_diamond ? `
                  <div class="absolute top-2 left-2">
                    <span class="bg-[#FFD43B] text-[#333333] text-xs px-2 py-1 rounded-full font-semibold shadow-lg flex items-center gap-1" style="font-family: 'Open Sans', sans-serif;">
                      BIO Diamond
                      <svg class="h-3 w-3 text-[#333333]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L14.5 8.5L21 11L14.5 13.5L12 20L9.5 13.5L3 11L9.5 8.5L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        <path d="M18 6L20 8M20 6L18 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <circle cx="6" cy="16" r="1.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                      </svg>
                    </span>
                  </div>
                ` : ''}
                ${salon.reviews && salon.reviews.total_reviews > 0 ? `
                  <div class="absolute top-2 right-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center space-x-1 border border-[#E0E0E0]">
                    <svg class="h-3 w-3 text-[#FFD43B] fill-current" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                    </svg>
                    <span class="text-xs font-semibold" style="color:#333333; font-family: 'Open Sans', sans-serif;">
                      ${salon.reviews.average_rating.toFixed(1)}
                    </span>
                  </div>
                ` : ''}
                ${sortedImages.length > 1 ? `
                  <div class="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full" style="font-family: 'Open Sans', sans-serif;">
                    1/${sortedImages.length}
                  </div>
                ` : ''}
              ` : `
                <div class="h-full flex items-center justify-center bg-gradient-to-br from-[#F5F5F5] to-[#E0E0E0]">
                  <div class="text-center" style="color:#9E9E9E; font-family: 'Open Sans', sans-serif;">
                    <svg class="h-8 w-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <p class="text-xs">No image</p>
                  </div>
                </div>
              `}
            </div>

            <!-- Content Section -->
            <div class="p-3">
              <!-- Salon Name -->
              <div class="mb-2">
                <h3 class="text-lg font-bold line-clamp-1" style="color:#333333; font-family: 'Poppins', sans-serif;">
                  ${salon.nome}
                </h3>
              </div>

              <!-- Location -->
              ${formatAddress() ? `
                <div class="flex items-center mb-3" style="color:#333333; font-family: 'Open Sans', sans-serif;">
                  <svg class="h-4 w-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  <span class="text-sm line-clamp-1" style="color:#9E9E9E; font-family: 'Open Sans', sans-serif;">
                    ${formatAddress()}
                  </span>
                </div>
              ` : ''}

              <!-- Contact Info -->
              <div class="space-y-1 mb-4">
                ${salon.telefone ? `
                  <div class="flex items-center text-sm" style="color:#333333; font-family: 'Open Sans', sans-serif;">
                    <svg class="h-3 w-3 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                    </svg>
                    <span class="truncate">${salon.telefone}</span>
                  </div>
                ` : ''}
                ${salon.email ? `
                  <div class="flex items-center text-sm" style="color:#333333; font-family: 'Open Sans', sans-serif;">
                    <svg class="h-3 w-3 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                    <span class="truncate">${salon.email}</span>
                  </div>
                ` : ''}
              </div>

              <!-- Action Buttons -->
              <div class="flex space-x-2">
                <a 
                  href="/place/${salon.id}"
                  class="flex-1 btn-outline text-center text-sm"
                  style="font-family: 'Open Sans', sans-serif;"
                >
                  View Details
                </a>
                ${salon.booking_enabled !== false ? `
                  <a 
                    href="/book/${salon.id}"
                    class="flex-1 btn-secondary text-center text-sm"
                    style="font-family: 'Open Sans', sans-serif;"
                  >
                    Book Now
                  </a>
                ` : ''}
              </div>
            </div>
          </div>
        `;
        
        // Clear any existing popup first
        marker.unbindPopup();
        
        marker.bindPopup(popupContent, {
          maxWidth: 350,
          className: 'custom-popup'
        });
        
        // Ensure popup opens on click
        marker.on('click', function(this: L.Marker) {
          this.openPopup();
        });
        
        if (clusterRef.current) {
          clusterRef.current.addLayer(marker);
        }

        // Render coverage radius for mobile places
        if (salon.location_type === 'mobile') {
          const radiusKm = salon.coverage_radius || 10;
          const circle = L.circle([salon.latitude, salon.longitude], {
            radius: radiusKm * 1000,
            color: '#3B82F6',
            fillColor: '#3B82F6',
            fillOpacity: 0.2,
            weight: 2
          });
          // Add circle directly to map to avoid clustering it
          circle.addTo(map);
        }
        
        // Debug: Log popup creation
        console.log(`Created popup for salon: ${salon.nome}, Images: ${sortedImages.length}, Primary image: ${primaryImage?.image_url || 'none'}`);
        console.log('Popup content preview:', popupContent.substring(0, 200) + '...');
      }
    });

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
      // Cleanup any circles added directly to the map by clearing layers of type Circle
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Circle) {
          map.removeLayer(layer);
        }
      });
    };
  }, [map, validSalons]);

  return null;
};

const SalonMapView: React.FC<SalonMapViewProps> = ({ 
  salons, 
  height = '700px', 
  className 
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.5, -8.0]);
  const [mapZoom, setMapZoom] = useState<number>(6);

  // Filter salons that have valid coordinates (memoized to prevent infinite loops)
  const salonsWithCoords = useMemo(() => 
    salons.filter(salon => 
      salon.latitude && salon.longitude && 
      !isNaN(salon.latitude) && !isNaN(salon.longitude)
    ), [salons]
  );

  // Update map center and zoom based on salons (only for initial setup)
  useEffect(() => {
    if (salonsWithCoords.length > 0) {
      if (salonsWithCoords.length === 1) {
        const salon = salonsWithCoords[0];
        setMapCenter([salon.latitude!, salon.longitude!]);
        setMapZoom(14); // Good zoom for single salon
      } else {
        // Calculate center point for multiple salons
        const avgLat = salonsWithCoords.reduce((sum, salon) => sum + salon.latitude!, 0) / salonsWithCoords.length;
        const avgLng = salonsWithCoords.reduce((sum, salon) => sum + salon.longitude!, 0) / salonsWithCoords.length;
        setMapCenter([avgLat, avgLng]);
        setMapZoom(10); // Good overview zoom for multiple salons
      }
    }
  }, [salonsWithCoords]);

  if (salonsWithCoords.length === 0) {
    return (
      <div style={{ height }} className={`${className} bg-gray-100 rounded-lg flex items-center justify-center`}>
        <div className="text-center text-gray-500">
          <MapPin className="h-12 w-12 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">No salon locations available</p>
          <p className="text-sm">The salons in your search results don't have location coordinates.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height, width: '100%' }} className={className}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        zoomControl={true}
        doubleClickZoom={true}
        dragging={true}
        touchZoom={true}
        boxZoom={true}
        keyboard={true}
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={120}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <MapBoundsController salons={salonsWithCoords} />
        <MarkerClusterGroup salons={salonsWithCoords} />
      </MapContainer>
    </div>
  );
};

export default SalonMapView;
