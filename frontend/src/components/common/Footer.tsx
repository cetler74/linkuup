import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-white border-t border-medium-gray">
      <div className="max-w-7xl mx-auto container-padding py-4">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-charcoal">
          {/* Brand */}
          <span className="font-bold text-charcoal">LinkUup</span>

          <span className="text-charcoal/40">|</span>

          {/* Copyright */}
          <span>{t('footer.copyright')}</span>

          <span className="text-charcoal/40">|</span>

          {/* Contact */}
          <Link to="/contact" className="hover:text-bright-blue transition-colors">
            {t('footer.contact')}
          </Link>

          <span className="text-charcoal/40">|</span>

          {/* Pricing */}
          <Link to="/pricing" className="hover:text-bright-blue transition-colors">
            {t('footer.pricing')}
          </Link>

          <span className="text-charcoal/40">|</span>

          {/* For Businesses Section */}
          <span className="font-semibold">{t('footer.forSalons')}:</span>
          <Link to="/manager" className="hover:text-bright-blue transition-colors">
            {t('footer.managerLogin')}
          </Link>
          <Link to="/join" className="hover:text-bright-blue transition-colors">
            {t('footer.joinOurNetwork')}
          </Link>

          <span className="text-charcoal/40">|</span>

          {/* Legal Terms */}
          <span>
            <Link to="/privacy-policy" className="hover:text-bright-blue transition-colors">
              {t('footer.privacyPolicy')}
            </Link>
            {' & '}
            <Link to="/terms-of-service" className="hover:text-bright-blue transition-colors">
              {t('footer.termsOfService')}
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
