import React from 'react';
import { placeAPI } from '../../utils/api';

const ImageTest: React.FC = () => {
  const [salons, setSalons] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSalons = async () => {
      try {
        const response = await placeAPI.getPlaces();
        setSalons(Array.isArray(response) ? response : response.places || []);
        console.log('Places with images:', Array.isArray(response) ? response : response.places || []);
      } catch (error) {
        console.error('Error fetching salons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalons();
  }, []);

  if (loading) {
    return <div>Loading salons...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Image Test - {salons.length} salons found</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {salons.map((salon) => (
          <div key={salon.id} className="border rounded-lg p-4">
            <h3 className="font-bold">{salon.nome}</h3>
            <p className="text-sm text-gray-600">{salon.cidade}, {salon.regiao}</p>
            <div className="mt-2">
              <p className="text-sm">Images: {salon.images?.length || 0}</p>
              {salon.images && salon.images.length > 0 && (
                <div className="mt-2">
                  <img 
                    src={salon.images[0].image_url} 
                    alt={salon.images[0].image_alt || 'Salon image'}
                    className="w-full h-32 object-cover rounded"
                    onLoad={() => console.log('Image loaded:', salon.images[0].image_url)}
                    onError={(e) => console.error('Image failed to load:', salon.images[0].image_url, e)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Primary: {salon.images[0].is_primary ? 'Yes' : 'No'}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageTest;
