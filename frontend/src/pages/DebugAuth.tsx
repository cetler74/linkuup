import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../utils/api';

const DebugAuth: React.FC = () => {
  const { user, isAuthenticated, isBusinessOwner } = useAuth();
  const [authTest, setAuthTest] = useState<any>(null);
  const [apiTest, setApiTest] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAuthAPI = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing auth API...');
      const userData = await authAPI.getCurrentUser();
      console.log('✅ Auth API successful:', userData);
      setAuthTest(userData);
    } catch (error) {
      console.error('❌ Auth API failed:', error);
      setAuthTest({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testOwnerAPI = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing owner API...');
      const token = localStorage.getItem('auth_token');
      console.log('🔑 Token:', token ? `Present (${token.substring(0, 20)}...)` : 'Missing');
      
      const response = await fetch('/api/v1/owner/places/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Owner API response:', response.status, response.statusText);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Owner API successful:', data);
        setApiTest({ success: true, data });
      } else {
        const errorData = await response.json();
        console.error('❌ Owner API failed:', errorData);
        setApiTest({ error: errorData });
      }
    } catch (error) {
      console.error('❌ Owner API error:', error);
      setApiTest({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auth Context */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Auth Context</h2>
          <div className="space-y-2">
            <p><strong>User:</strong> {user ? JSON.stringify(user, null, 2) : 'null'}</p>
            <p><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
            <p><strong>Is Business Owner:</strong> {isBusinessOwner ? 'Yes' : 'No'}</p>
            <p><strong>User Type:</strong> {user?.user_type || 'N/A'}</p>
            <p><strong>Token in localStorage:</strong> {localStorage.getItem('auth_token') ? 'Present' : 'Missing'}</p>
          </div>
        </div>

        {/* Auth API Test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Auth API Test</h2>
          <button 
            onClick={testAuthAPI}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Test Auth API
          </button>
          {authTest && (
            <pre className="mt-4 bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(authTest, null, 2)}
            </pre>
          )}
        </div>

        {/* Owner API Test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Owner API Test</h2>
          <button 
            onClick={testOwnerAPI}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            Test Owner API
          </button>
          {apiTest && (
            <pre className="mt-4 bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(apiTest, null, 2)}
            </pre>
          )}
        </div>

        {/* Local Storage */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Local Storage</h2>
          <div className="space-y-2">
            <p><strong>auth_token:</strong> {localStorage.getItem('auth_token') ? 'Present' : 'Missing'}</p>
            <p><strong>refresh_token:</strong> {localStorage.getItem('refresh_token') ? 'Present' : 'Missing'}</p>
            <button 
              onClick={() => {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                window.location.reload();
              }}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Clear Tokens & Reload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugAuth;
