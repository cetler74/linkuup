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
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

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
      const target = event.target as Node;
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        right: window.innerWidth - rect.right - window.scrollX
      });
    }
  }, [isOpen]);

  const handleLanguageChange = async (langCode: string) => {
    console.log('Changing language to:', langCode);
    try {
      await i18n.changeLanguage(langCode);
      // Force a small delay to ensure language change is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      setIsOpen(false);
      // Trigger a window event to notify all components
      window.dispatchEvent(new Event('languagechange'));
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  return (
    <>
      <div className={`relative z-[9999] ${className}`} ref={containerRef}>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between w-full px-4 py-1.5 text-sm text-charcoal hover:text-bright-blue transition-colors duration-200 rounded-md hover:bg-light-gray font-medium border border-medium-gray ${className.includes('w-full') ? 'bg-white' : ''}`}
          aria-label="Select Language"
        >
        <span className="font-display font-semibold">
          {showFullName ? currentLanguage.full : currentLanguage.short}
        </span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className="fixed w-48 bg-white rounded-md shadow-form border border-medium-gray z-[99999]"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`
          }}
        >
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
    </>
  );
};

export default CustomLanguageSelector;

