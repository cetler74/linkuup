import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { List, Map, Search } from 'lucide-react';
import { placeAPI } from '../utils/api';
import SalonCardWithImages from '../components/salon/SalonCardWithImages';
import SalonMapView from '../components/common/SalonMapView';
import { useTranslation } from 'react-i18next';
import SEOHead from '../components/seo/SEOHead';
import StructuredData from '../components/seo/StructuredData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SearchResultsWithImages: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const { t } = useTranslation();

  // Filter states
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    cidade: searchParams.get('cidade') || '',
    tipo: searchParams.get('tipo') || '',
    regiao: searchParams.get('regiao') || '',
    is_bio_diamond: searchParams.get('bio_diamond') === 'true'
  });

  const performSearch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await placeAPI.getPlaces({
        search: filters.search,
        cidade: filters.cidade,
        tipo: filters.tipo
      });
      
      // Handle both current API structure (array) and expected structure (paginated)
      if (Array.isArray(results)) {
        // Current API returns array directly, wrap it in expected structure
        setSearchResults({
          places: results,
          total: results.length,
          pages: 1,
          current_page: 1,
          per_page: results.length,
          has_next: false,
          has_prev: false
        });
      } else {
        // Expected paginated response structure
        setSearchResults(results);
      }
    } catch (err) {
      setError(t('search.tryAgain'));
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters.search, filters.cidade, filters.tipo, filters.regiao, filters.is_bio_diamond, t]);

  // Update filters when URL params change
  useEffect(() => {
    const newFilters = {
      search: searchParams.get('search') || '',
      cidade: searchParams.get('cidade') || '',
      tipo: searchParams.get('tipo') || '',
      regiao: searchParams.get('regiao') || '',
      is_bio_diamond: searchParams.get('bio_diamond') === 'true'
    };
    setFilters(newFilters);
  }, [searchParams]);

  // Perform search when filters change
  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Update URL parameters when filter changes
    const newParams = new URLSearchParams(searchParams);
    if (value === '' || value === false) {
      // Remove parameter if value is empty or false
      newParams.delete(key);
    } else {
      // Set parameter if value exists
      newParams.set(key, String(value));
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      cidade: '',
      tipo: '',
      regiao: '',
      is_bio_diamond: false
    });
    // Clear URL parameters
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = filters.search || filters.cidade || filters.tipo || filters.regiao || filters.is_bio_diamond;

  // Listen for card hover events from cards
  useEffect(() => {
    const handleCardHover = (e: CustomEvent) => {
      setIsCardHovered(e.detail?.hovered || false);
    };

    window.addEventListener('cardHover', handleCardHover as EventListener);

    return () => {
      window.removeEventListener('cardHover', handleCardHover as EventListener);
    };
  }, []);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const searchQuery = searchParams.get('search') || '';
  const cidade = searchParams.get('cidade') || '';
  
  // Dynamic SEO metadata based on search
  const seoTitle = searchQuery || cidade 
    ? `Search ${searchQuery || cidade} - Beauty Salons & Barbershops`
    : 'Search Beauty Salons & Barbershops';
  const seoDescription = searchQuery || cidade
    ? `Find the best beauty salons and barbershops${searchQuery ? ` for "${searchQuery}"` : ''}${cidade ? ` in ${cidade}` : ''}. Book appointments online with LinkUup.`
    : 'Search and discover the best beauty salons, barbershops, and service businesses. Book appointments online with LinkUup.';

  // SearchResultsPage Schema
  const searchPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'SearchResultsPage',
    name: seoTitle,
    description: seoDescription,
    url: typeof window !== 'undefined' ? `${siteUrl}/search${window.location.search}` : `${siteUrl}/search`,
  };

  return (
    <div className="min-h-screen relative bg-white">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={`${searchQuery || ''}, ${cidade || ''}, beauty salon search, barbershop search, salon booking, appointment booking`}
        ogType="website"
        noindex={false}
      />
      <StructuredData data={searchPageSchema} />
      {/* Dim overlay when card is hovered */}
      <div 
        className={`fixed inset-0 z-[1] bg-black transition-opacity duration-300 pointer-events-none ${
          isCardHovered ? 'opacity-[0.03]' : 'opacity-0'
        }`}
      />
      <div className="relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-section mb-2" style={{ fontFamily: 'Poppins, sans-serif', color: '#333333' }}>{t('search.allSalons')}</h1>
            <p className="text-charcoal/70" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              {isLoading ? t('search.searching') : searchResults ? `${searchResults.total} ${searchResults.total === 1 ? t('search.salonFound') : t('search.salonsFoundPlural')}` : ''}
            </p>
          </div>
          {/* View Controls moved to header so cards align under the same baseline */}
          <div className="hidden lg:flex items-center space-x-2">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#1E90FF] text-white hover:bg-[#1877D2]'
                  : 'bg-white text-[#333333] hover:bg-[#F5F5F5] border border-[#E0E0E0]'
              }`}
              style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
            >
              <List className="h-4 w-4 mr-1" />
              {t('search.list')}
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-[#1E90FF] text-white hover:bg-[#1877D2]'
                  : 'bg-white text-[#333333] hover:bg-[#F5F5F5] border border-[#E0E0E0]'
              }`}
              style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
            >
              <Map className="h-4 w-4 mr-1" />
              {t('search.map')}
            </button>
          </div>
        </div>

        {/* Mobile Filter Toggle Button */}
        <div className="lg:hidden mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-4 min-h-[48px] border border-[#E0E0E0]"
            style={{ fontFamily: 'Open Sans, sans-serif' }}
          >
            <span className="font-semibold text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 600 }}>{t('search.filters')}</span>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <span className="bg-[#1E90FF] text-white text-xs px-2 py-1 rounded-full font-medium">
                  {[filters.search, filters.cidade, filters.tipo, filters.regiao, filters.is_bio_diamond].filter(Boolean).length}
                </span>
              )}
              <svg 
                className={`w-5 h-5 transition-transform text-[#333333] ${showFilters ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className={`lg:w-80 ${showFilters ? 'block' : 'hidden'} lg:block lg:flex-shrink-0`}>
            <div 
              className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-6 lg:sticky lg:top-8 border border-[#E0E0E0] filter-sidebar"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                window.dispatchEvent(new CustomEvent('cardHover', { 
                  detail: { 
                    hovered: true,
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                  } 
                }));
              }}
              onMouseLeave={() => {
                window.dispatchEvent(new CustomEvent('cardHover', { 
                  detail: { hovered: false } 
                }));
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('search.filters')}</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-[#9E9E9E] hover:text-[#FF5A5F] transition-colors duration-200"
                    style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
                  >
                    {t('search.clearAll')}
                  </button>
                )}
              </div>

              <form onSubmit={handleSearch} className="space-y-4">
                {/* Search */}
                <div>
                  <label className="block font-medium text-[#333333] mb-1" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>
                    {t('search.search')}
                  </label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder={t('search.salonNameOrService')}
                    className="input-field"
                    style={{ 
                      backgroundColor: '#F5F5F5',
                      borderColor: '#E0E0E0',
                      color: '#333333',
                      fontFamily: 'Open Sans, sans-serif'
                    }}
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block font-medium text-[#333333] mb-1" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>
                    {t('search.city')}
                  </label>
                  <input
                    type="text"
                    value={filters.cidade}
                    onChange={(e) => handleFilterChange('cidade', e.target.value)}
                    placeholder={t('search.enterCity')}
                    className="input-field"
                    style={{ 
                      backgroundColor: '#F5F5F5',
                      borderColor: '#E0E0E0',
                      color: '#333333',
                      fontFamily: 'Open Sans, sans-serif'
                    }}
                  />
                </div>

                {/* Services */}
                <div>
                  <label className="block font-medium text-[#333333] mb-1" style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}>
                    {t('search.services')}
                  </label>
                  <Select
                    value={filters.tipo || ''}
                    onValueChange={(value) => handleFilterChange('tipo', value)}
                  >
                    <SelectTrigger className="input-field" style={{ 
                      backgroundColor: '#F5F5F5',
                      borderColor: '#E0E0E0',
                      color: '#333333',
                      fontFamily: 'Open Sans, sans-serif'
                    }}>
                      <SelectValue placeholder={t('search.allServices') as string} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t('search.allServices')}</SelectItem>
                      <SelectItem value="salon">{t('search.salon')}</SelectItem>
                      <SelectItem value="barber">{t('search.barber')}</SelectItem>
                      <SelectItem value="nails">{t('search.nails')}</SelectItem>
                      <SelectItem value="spaSauna">{t('search.spaSauna')}</SelectItem>
                      <SelectItem value="medicalSpa">{t('search.medicalSpa')}</SelectItem>
                      <SelectItem value="massage">{t('search.massage')}</SelectItem>
                      <SelectItem value="fitnessRehab">{t('search.fitnessRehab')}</SelectItem>
                      <SelectItem value="physiotherapy">{t('search.physiotherapy')}</SelectItem>
                      <SelectItem value="medicalOffices">{t('search.medicalOffices')}</SelectItem>
                      <SelectItem value="tattooPiercing">{t('search.tattooPiercing')}</SelectItem>
                      <SelectItem value="petGrooming">{t('search.petGrooming')}</SelectItem>
                      <SelectItem value="tanningClinic">{t('search.tanningClinic')}</SelectItem>
                      <SelectItem value="others">{t('search.others')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>


                <button
                  type="submit"
                  className="w-full bg-[#1E90FF] hover:bg-[#1877D2] text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 shadow-[0px_2px_8px_rgba(0,0,0,0.1)] hover:shadow-md"
                  style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 600 }}
                >
                  {t('search.applyFilters')}
                </button>
              </form>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">

            {/* Results */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E90FF]"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-[#FF5A5F] mb-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>{error}</p>
                <button 
                  onClick={performSearch} 
                  className="bg-[#1E90FF] hover:bg-[#1877D2] text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 shadow-[0px_2px_8px_rgba(0,0,0,0.1)] hover:shadow-md"
                  style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 600 }}
                >
                  {t('search.tryAgain')}
                </button>
              </div>
            ) : searchResults?.places?.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] border border-[#E0E0E0]">
                <div className="text-[#9E9E9E] mb-4">
                  <Search className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-[#333333] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('search.noResults')}</h3>
                <p className="text-[#9E9E9E] mb-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                  {t('search.tryDifferent')}
                </p>
                <button 
                  onClick={clearFilters} 
                  className="bg-[#1E90FF] hover:bg-[#1877D2] text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 shadow-[0px_2px_8px_rgba(0,0,0,0.1)] hover:shadow-md"
                  style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 600 }}
                >
                  {t('search.clearFilters')}
                </button>
              </div>
            ) : viewMode === 'list' ? (
              <div>
                {/* Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {searchResults?.places.map((place: any) => (
                    <SalonCardWithImages
                      key={place.id}
                      salon={place}
                      showServices={false}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {searchResults && searchResults.pages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex items-center space-x-2">
                      <button
                        disabled={searchResults.current_page === 1}
                        className="px-3 py-2 text-sm font-medium text-[#333333] bg-white border border-[#E0E0E0] rounded-lg hover:bg-[#F5F5F5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
                      >
                        {t('search.previous')}
                      </button>
                      <span className="px-3 py-2 text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                        {t('search.page')} {searchResults.current_page} {t('search.of')} {searchResults.pages}
                      </span>
                      <button
                        disabled={searchResults.current_page === searchResults.pages}
                        className="px-3 py-2 text-sm font-medium text-[#333333] bg-white border border-[#E0E0E0] rounded-lg hover:bg-[#F5F5F5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 500 }}
                      >
                        {t('search.next')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <SalonMapView 
                salons={searchResults?.places || []} 
                height="700px"
                className="rounded-lg"
              />
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default SearchResultsWithImages;
