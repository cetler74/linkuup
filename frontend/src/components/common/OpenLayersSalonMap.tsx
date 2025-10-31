import React, { useState } from 'react';
import { Map } from '@react-ol/fiber';
import 'ol/ol.css';

interface OpenLayersSalonMapProps {
  latitude?: number;
  longitude?: number;
  salonName: string;
  address?: string;
  height?: string;
  className?: string;
}

const OpenLayersSalonMap: React.FC<OpenLayersSalonMapProps> = ({
  latitude,
  longitude,
  salonName,
  address,
  height = '200px',
  className
}) => {
  const [showPopup, setShowPopup] = useState(false);

  // Debug logging
  console.log('OpenLayersSalonMap props:', { latitude, longitude, salonName, address });

  // HARDCODED TEST: Use fixed coordinates for Porto, Portugal
  // OpenLayers uses [longitude, latitude] format
  const testCenter = [-8.6291, 41.1579]; // Porto coordinates
  const testMarker = [-8.6291, 41.1579];

  console.log('Creating OpenLayers map with center:', testCenter);

  return (
    <div style={{ height, width: '100%' }} className={className}>
      <Map 
        style={{ width: '100%', height: '100%' }}
        controls={[]} // Remove all controls for read-only mode
        interactions={[]} // Remove all interactions for read-only mode
      >
        <olView 
          initialCenter={testCenter} 
          initialZoom={15}
        />
        <olLayerTile>
          <olSourceOSM />
        </olLayerTile>
        <olLayerVector>
          <olSourceVector>
            <olFeature>
              <olGeomPoint coordinates={testMarker} />
              <olStyle>
                <olStyleIcon
                  src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMzYjgyZjYiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K"
                  scale={1}
                  anchor={[0.5, 1]}
                />
              </olStyle>
            </olFeature>
          </olSourceVector>
        </olLayerVector>
      </Map>
      
      {/* Custom popup overlay */}
      {showPopup && (
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            border: '1px solid #ccc',
            zIndex: 1000,
            maxWidth: '200px'
          }}
        >
          <div style={{ marginBottom: '5px' }}>
            <strong>{salonName}</strong>
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Test Location - Porto, Portugal
          </div>
          <button 
            onClick={() => setShowPopup(false)}
            style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>
      )}
      
      {/* Invisible clickable area for popup */}
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '20px',
          height: '20px',
          cursor: 'pointer',
          zIndex: 999
        }}
        onClick={() => setShowPopup(true)}
      />
    </div>
  );
};

export default OpenLayersSalonMap;
