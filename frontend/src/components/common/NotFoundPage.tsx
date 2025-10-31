import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600 mb-8">{t('error.404')}</p>
        <Link to="/" className="btn-primary">
          {t('common.back')}
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
