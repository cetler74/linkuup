import React, { useState, useEffect } from 'react';

const ApiTest: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Testing API call...');
        
        // Test direct fetch to backend
        const response = await fetch('http://localhost:5001/api/v1/places');
        const result = await response.json();
        
        console.log('API response:', result);
        setData(result);
        setError(null);
      } catch (err) {
        console.error('API Error:', err);
        setError(`API Error: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-4">Loading API test...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">API Test</h2>
      <div className="bg-gray-100 p-4 rounded">
        <h3 className="font-semibold mb-2">API Response:</h3>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default ApiTest;