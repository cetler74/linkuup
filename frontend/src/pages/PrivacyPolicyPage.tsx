import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/common/Header';

const PrivacyPolicyPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <Header />
      </div>
      
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('privacy.title')}</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              {t('privacy.lastUpdated')}: {t('privacy.updateDate')}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.section1.title')}</h2>
              <p className="text-gray-700 mb-4">{t('privacy.section1.content1')}</p>
              <p className="text-gray-700">{t('privacy.section1.content2')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.section2.title')}</h2>
              <p className="text-gray-700 mb-4">{t('privacy.section2.content1')}</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>{t('privacy.section2.item1')}</li>
                <li>{t('privacy.section2.item2')}</li>
                <li>{t('privacy.section2.item3')}</li>
                <li>{t('privacy.section2.item4')}</li>
                <li>{t('privacy.section2.item5')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.section3.title')}</h2>
              <p className="text-gray-700 mb-4">{t('privacy.section3.content1')}</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>{t('privacy.section3.item1')}</li>
                <li>{t('privacy.section3.item2')}</li>
                <li>{t('privacy.section3.item3')}</li>
                <li>{t('privacy.section3.item4')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.section4.title')}</h2>
              <p className="text-gray-700 mb-4">{t('privacy.section4.content1')}</p>
              <p className="text-gray-700">{t('privacy.section4.content2')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.section5.title')}</h2>
              <p className="text-gray-700 mb-4">{t('privacy.section5.content1')}</p>
              <p className="text-gray-700">{t('privacy.section5.content2')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.section6.title')}</h2>
              <p className="text-gray-700">{t('privacy.section6.content1')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.section7.title')}</h2>
              <p className="text-gray-700">{t('privacy.section7.content1')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.section8.title')}</h2>
              <p className="text-gray-700 mb-4">{t('privacy.section8.content1')}</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 font-medium">{t('privacy.section8.contactTitle')}</p>
                <p className="text-gray-700">Email: {t('footer.email')}</p>
                <p className="text-gray-700">{t('privacy.section8.contactAddress')}</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('privacy.section9.title')}</h2>
              <p className="text-gray-700">{t('privacy.section9.content1')}</p>
            </section>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
