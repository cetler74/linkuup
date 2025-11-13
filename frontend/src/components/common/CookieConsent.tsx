import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

const CookieConsent: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const consent = localStorage.getItem('linkuup-cookie-consent');
    if (!consent) {
      // Show popup after a short delay to avoid jarring experience
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('linkuup-cookie-consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('linkuup-cookie-consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-medium-gray shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col gap-4">
          {/* Main content */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-charcoal mb-2">
                {t('cookieConsent.title')}
              </h3>
              <p className="text-sm text-charcoal/80 mb-2">
                {t('cookieConsent.description')}
              </p>
              
              {/* Details section */}
              {showDetails && (
                <div className="mt-3 p-3 bg-light-gray rounded-md text-sm text-charcoal/80">
                  <p className="mb-2">{t('cookieConsent.detailedDescription')}</p>
                </div>
              )}

              {/* Show details toggle */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-bright-blue hover:text-bright-blue/80 flex items-center gap-1 mt-2 transition-colors"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    {t('cookieConsent.hideDetails')}
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    {t('cookieConsent.showDetails')}
                  </>
                )}
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={handleDecline}
              className="text-charcoal/60 hover:text-charcoal transition-colors p-1"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-end">
            <button
              onClick={handleDecline}
              className="px-4 py-2 text-sm font-medium text-charcoal bg-light-gray hover:bg-medium-gray rounded-md transition-colors"
            >
              {t('cookieConsent.decline')}
            </button>
            <button
              onClick={handleAccept}
              className="px-4 py-2 text-sm font-medium text-white bg-bright-blue hover:bg-bright-blue/90 rounded-md transition-colors"
            >
              {t('cookieConsent.accept')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

