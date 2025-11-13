import React, { useState, useEffect } from 'react';
import { placeAPI } from '../../utils/api';

const PlacesTest: React.FC = () => {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setLoading(true);
        console.log('Fetching places...');
        const response = await placeAPI.getPlaces();
        console.log('Places response:', response);
        setPlaces(response.places || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching places:', err);
        setError(`Failed to fetch places: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  if (loading) return <div>Loading places...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Places Test</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {places.map((place) => (
          <div key={place.id} className="border rounded-lg p-4 shadow">
            <h3 className="text-lg font-semibold">{place.nome}</h3>
            <p className="text-sm text-gray-600">{place.tipo}</p>
            <p className="text-sm text-gray-600">{place.cidade}, {place.regiao}</p>
            {place.telefone && <p className="text-sm text-gray-600">📞 {place.telefone}</p>}
            {place.email && <p className="text-sm text-gray-600">✉️ {place.email}</p>}
            {place.website && (
              <p className="text-sm text-blue-600">
                <a href={place.website} target="_blank" rel="noopener noreferrer">
                  🌐 Website
                </a>
              </p>
            )}
            {place.is_bio_diamond && (
              <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded mt-2">
                💎 BIO Diamond
              </span>
            )}
            {place.booking_enabled && (
              <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mt-2 ml-2">
                📅 Booking Enabled
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlacesTest;
