import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

export const useSEO = (config: SEOConfig = {}) => {
  const location = useLocation();
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  const canonical = useMemo(() => {
    return `${siteUrl}${location.pathname}${location.search}`;
  }, [location.pathname, location.search, siteUrl]);

  return {
    ...config,
    canonical,
  };
};

