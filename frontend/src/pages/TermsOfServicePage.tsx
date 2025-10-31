import React from 'react';
import { useTranslation } from 'react-i18next';

const TermsOfServicePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('terms.title')}</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              {t('terms.lastUpdated')}: {t('terms.updateDate')}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('terms.section1.title')}</h2>
              <p className="text-gray-700 mb-4">{t('terms.section1.content1')}</p>
              <p className="text-gray-700">{t('terms.section1.content2')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('terms.section2.title')}</h2>
              <p className="text-gray-700 mb-4">{t('terms.section2.content1')}</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>{t('terms.section2.item1')}</li>
                <li>{t('terms.section2.item2')}</li>
                <li>{t('terms.section2.item3')}</li>
                <li>{t('terms.section2.item4')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('terms.section3.title')}</h2>
              <p className="text-gray-700 mb-4">{t('terms.section3.content1')}</p>
              <p className="text-gray-700">{t('terms.section3.content2')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('terms.section4.title')}</h2>
              <p className="text-gray-700 mb-4">{t('terms.section4.content1')}</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
                <li>{t('terms.section4.item1')}</li>
                <li>{t('terms.section4.item2')}</li>
                <li>{t('terms.section4.item3')}</li>
                <li>{t('terms.section4.item4')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('terms.section5.title')}</h2>
              <p className="text-gray-700 mb-4">{t('terms.section5.content1')}</p>
              <p className="text-gray-700">{t('terms.section5.content2')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('terms.section6.title')}</h2>
              <p className="text-gray-700">{t('terms.section6.content1')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('terms.section7.title')}</h2>
              <p className="text-gray-700 mb-4">{t('terms.section7.content1')}</p>
              <p className="text-gray-700">{t('terms.section7.content2')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('terms.section8.title')}</h2>
              <p className="text-gray-700">{t('terms.section8.content1')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('terms.section9.title')}</h2>
              <p className="text-gray-700">{t('terms.section9.content1')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('terms.section10.title')}</h2>
              <p className="text-gray-700">{t('terms.section10.content1')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('terms.section11.title')}</h2>
              <p className="text-gray-700 mb-4">{t('terms.section11.content1')}</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 font-medium">{t('terms.section11.contactTitle')}</p>
                <p className="text-gray-700">Email: {t('footer.email')}</p>
                <p className="text-gray-700">{t('terms.section11.contactAddress')}</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
