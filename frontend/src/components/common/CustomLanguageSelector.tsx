import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

interface CustomLanguageSelectorProps {
  className?: string;
  showFullName?: boolean;
}

const CustomLanguageSelector: React.FC<CustomLanguageSelectorProps> = ({ 
  className = '',
  showFullName = false 
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'pt', short: 'PT', full: 'Português (PT)' },
    { code: 'en', short: 'EN', full: 'English (EN)' },
    { code: 'es', short: 'ES', full: 'Español (ES)' },
    { code: 'fr', short: 'FR', full: 'Français (FR)' },
    { code: 'de', short: 'DE', full: 'Deutsch (DE)' },
    { code: 'it', short: 'IT', full: 'Italiano (IT)' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLanguageChange = (langCode: string) => {
    console.log('Changing language to:', langCode);
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-4 py-3 text-sm text-charcoal hover:text-bright-blue transition-colors duration-200 rounded-md hover:bg-light-gray font-medium border border-medium-gray ${className.includes('w-full') ? 'bg-white' : ''}`}
        aria-label="Select Language"
      >
        <span className="font-display font-semibold">
          {showFullName ? currentLanguage.full : currentLanguage.short}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-form border border-medium-gray z-50">
          <div className="py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-light-gray transition-colors duration-200 font-medium ${
                  i18n.language === lang.code ? 'bg-light-gray text-charcoal' : 'text-charcoal'
                }`}
              >
                <span className="font-display">
                  {showFullName ? lang.full : lang.short}
                </span>
                {i18n.language === lang.code && (
                  <span className="text-bright-blue font-bold">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomLanguageSelector;

