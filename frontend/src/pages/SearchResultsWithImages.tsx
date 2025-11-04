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
  const [searchParams] = useSearchParams();
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
  }, [filters.search, filters.cidade, filters.regiao, filters.is_bio_diamond, t]);

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
  };

  const hasActiveFilters = filters.search || filters.cidade || filters.regiao || filters.is_bio_diamond;

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
    <div className="min-h-screen relative">
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
            <h1 className="text-section mb-2">{t('search.allSalons')}</h1>
            <p className="text-charcoal/70">
              {isLoading ? t('search.searching') : searchResults ? `${searchResults.total} ${searchResults.total === 1 ? t('search.salonFound') : t('search.salonsFoundPlural')}` : ''}
            </p>
          </div>
          {/* View Controls moved to header so cards align under the same baseline */}
          <div className="hidden lg:flex items-center space-x-2">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-bright-blue text-white'
                  : 'bg-white text-charcoal hover:bg-light-gray border border-medium-gray'
              }`}
            >
              <List className="h-4 w-4 mr-1" />
              {t('search.list')}
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-bright-blue text-white'
                  : 'bg-white text-charcoal hover:bg-light-gray border border-medium-gray'
              }`}
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
            className="w-full flex items-center justify-between bg-white rounded-lg shadow-form p-4 min-h-[48px] border border-medium-gray"
          >
            <span className="font-semibold text-charcoal">{t('search.filters')}</span>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <span className="bg-bright-blue text-white text-xs px-2 py-1 rounded-full">
                  {[filters.search, filters.cidade, filters.regiao, filters.is_bio_diamond].filter(Boolean).length}
                </span>
              )}
              <svg 
                className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} 
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
              className="bg-white rounded-lg shadow-form p-6 lg:sticky lg:top-8 border border-medium-gray filter-sidebar"
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
                <h2 className="text-lg font-semibold text-charcoal">{t('search.filters')}</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-charcoal/60 hover:text-charcoal transition-colors duration-200"
                  >
                    {t('search.clearAll')}
                  </button>
                )}
              </div>

              <form onSubmit={handleSearch} className="space-y-4">
                {/* Search */}
                <div>
                  <label className="block font-medium text-charcoal mb-1">
                    {t('search.search')}
                  </label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder={t('search.salonNameOrService')}
                    className="input-field"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block font-medium text-charcoal mb-1">
                    {t('search.city')}
                  </label>
                  <input
                    type="text"
                    value={filters.cidade}
                    onChange={(e) => handleFilterChange('cidade', e.target.value)}
                    placeholder={t('search.enterCity')}
                    className="input-field"
                  />
                </div>

                {/* Services */}
                <div>
                  <label className="block font-medium text-charcoal mb-1">
                    {t('search.services')}
                  </label>
                  <Select
                    value={filters.tipo}
                    onValueChange={(value) => handleFilterChange('tipo', value)}
                  >
                    <SelectTrigger className="input-field">
                      <SelectValue placeholder={t('search.allServices') as string} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t('search.allServices')}</SelectItem>
                      <SelectItem value="salon">{t('search.salon')}</SelectItem>
                      <SelectItem value="barber">{t('search.barber')}</SelectItem>
                      <SelectItem value="nails">{t('search.nails')}</SelectItem>
                      <SelectItem value="spa_sauna">{t('search.spaSauna')}</SelectItem>
                      <SelectItem value="medical_spa">{t('search.medicalSpa')}</SelectItem>
                      <SelectItem value="massage">{t('search.massage')}</SelectItem>
                      <SelectItem value="fitness_rehab">{t('search.fitnessRehab')}</SelectItem>
                      <SelectItem value="physiotherapy">{t('search.physiotherapy')}</SelectItem>
                      <SelectItem value="medical_offices">{t('search.medicalOffices')}</SelectItem>
                      <SelectItem value="tattoo_piercing">{t('search.tattooPiercing')}</SelectItem>
                      <SelectItem value="pet_grooming">{t('search.petGrooming')}</SelectItem>
                      <SelectItem value="tanning_clinic">{t('search.tanningClinic')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>


                <button
                  type="submit"
                  className="w-full btn-primary"
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">{error}</p>
                <button onClick={performSearch} className="btn-primary">
                  {t('search.tryAgain')}
                </button>
              </div>
            ) : searchResults?.places?.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <div className="text-gray-400 mb-4">
                  <Search className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('search.noResults')}</h3>
                <p className="text-gray-600 mb-4">
                  {t('search.tryDifferent')}
                </p>
                <button onClick={clearFilters} className="btn-primary">
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
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('search.previous')}
                      </button>
                      <span className="px-3 py-2 text-sm text-gray-700">
                        {t('search.page')} {searchResults.current_page} {t('search.of')} {searchResults.pages}
                      </span>
                      <button
                        disabled={searchResults.current_page === searchResults.pages}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
