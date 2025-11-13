import React, { useState, useEffect } from 'react';

const TestOwner: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testAPI = async () => {
      console.log('🧪 Testing owner API...');
      try {
        const response = await fetch('/api/owner/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        console.log('📡 Test API response:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('📊 Test API data:', result);
          setData(result);
        } else {
          console.error('❌ Test API error:', response.status);
        }
      } catch (error) {
        console.error('❌ Test API error:', error);
      } finally {
        setLoading(false);
      }
    };

    testAPI();
  }, []);

  if (loading) {
    return <div>Loading test...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Owner API Test</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export default TestOwner;
