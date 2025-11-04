import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  noindex?: boolean;
  nofollow?: boolean;
  lang?: string;
  alternateLanguages?: Array<{ lang: string; url: string }>;
}

const SEOHead: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  noindex = false,
  nofollow = false,
  lang = 'en',
  alternateLanguages = [],
}) => {
  const location = useLocation();
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const fullUrl = canonical || `${siteUrl}${location.pathname}${location.search}`;
  const fullOgImage = ogImage ? (ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`) : `${siteUrl}/images/og-default.png`;
  
  // Default title and description
  const defaultTitle = 'LinkUup - Transform Your Beauty Salon Online';
  const defaultDescription = 'LinkUup is the all-in-one platform for beauty salons, barbershops, and service businesses. Manage bookings, payments, customers, and more with our intuitive platform.';
  const defaultKeywords = 'beauty salon, barbershop, booking system, online booking, salon management, appointment booking, beauty business, salon software';

  const pageTitle = title ? `${title} | LinkUup` : defaultTitle;
  const pageDescription = description || defaultDescription;
  const pageKeywords = keywords || defaultKeywords;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content={lang} />
      
      {/* Robots */}
      {(noindex || nofollow) && (
        <meta name="robots" content={`${noindex ? 'noindex' : 'index'}, ${nofollow ? 'nofollow' : 'follow'}`} />
      )}

      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />

      {/* Language Alternates */}
      {alternateLanguages.map((alt) => (
        <link key={alt.lang} rel="alternate" hreflang={alt.lang} href={alt.url} />
      ))}

      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="LinkUup" />
      <meta property="og:locale" content={lang === 'pt' ? 'pt_PT' : 'en_US'} />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={fullOgImage} />

      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#1E90FF" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    </Helmet>
  );
};

export default SEOHead;

