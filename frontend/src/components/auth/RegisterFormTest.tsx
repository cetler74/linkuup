import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const RegisterFormTest: React.FC = () => {
  const { t } = useTranslation();
  const [test, setTest] = useState('');

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Registration Form Test</h1>
        <p>Translation test: {t('auth.register')}</p>
        <input 
          type="text" 
          value={test}
          onChange={(e) => setTest(e.target.value)}
          placeholder="Test input"
          className="border p-2 rounded"
        />
        <p>Input value: {test}</p>
      </div>
    </div>
  );
};

export default RegisterFormTest;
