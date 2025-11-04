import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  HomeIcon, 
  BuildingOfficeIcon, 
  CogIcon, 
  UserGroupIcon, 
  CalendarIcon, 
  ClockIcon,
  MegaphoneIcon, 
  ChatBubbleLeftRightIcon,
  Bars3Icon,
  XMarkIcon,
  CalendarDaysIcon,
  GiftIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import Header from '../common/Header';
import { useUserPermissions } from '../../contexts/UserPermissionsContext';
import { usePlaceContext } from '../../contexts/PlaceContext';
import { useOwnerApi } from '../../utils/ownerApi';

interface OwnerLayoutProps {
  children: React.ReactNode;
}

const OwnerLayout: React.FC<OwnerLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const { isFeatureEnabled } = useUserPermissions();
  const { t } = useTranslation();
  const { selectedPlace, selectedPlaceId, setSelectedPlace, setSelectedPlaceId, places, setPlaces } = usePlaceContext();
  const { usePlaces } = useOwnerApi();
  const { data: placesData = [] } = usePlaces();

  // Update places in context when fetched
  useEffect(() => {
    if (placesData.length > 0) {
      const formattedPlaces = placesData.map((place: any) => ({
        id: place.id,
        name: place.nome || place.name,
        location_type: place.location_type || 'fixed',
        city: place.cidade || place.city,
        service_areas: place.service_areas || []
      }));
      setPlaces(formattedPlaces);
    }
  }, [placesData, setPlaces]);

  // Filter places based on search term
  const filteredPlaces = places.filter(place =>
    place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    place.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allNavigationItems = [
    { name: t('owner.layout.dashboard'), href: '/owner', icon: HomeIcon, feature: null },
    { name: t('owner.layout.places'), href: '/owner/places', icon: BuildingOfficeIcon, feature: null },
    { name: t('owner.layout.services'), href: '/owner/services', icon: CogIcon, feature: null },
    { name: t('owner.layout.employees'), href: '/owner/employees', icon: UserGroupIcon, feature: null },
    { name: t('owner.layout.customers'), href: '/owner/customers', icon: UserGroupIcon, feature: null },
    { name: t('owner.layout.bookings'), href: '/owner/bookings', icon: CalendarIcon, feature: 'bookings' },
    { name: t('owner.layout.rewards'), href: '/owner/rewards', icon: GiftIcon, feature: 'rewards' },
    { name: t('owner.layout.workingHours'), href: '/owner/working-hours', icon: ClockIcon, feature: null },
    { name: t('owner.layout.timeOff'), href: '/owner/time-off', icon: CalendarDaysIcon, feature: 'time_off' },
    { name: t('owner.layout.campaigns'), href: '/owner/campaigns', icon: MegaphoneIcon, feature: 'campaigns' },
    { name: t('owner.layout.messages'), href: '/owner/messages', icon: ChatBubbleLeftRightIcon, feature: 'messaging' },
    { name: t('owner.layout.settings'), href: '/owner/settings', icon: CogIcon, feature: null },
  ];

  // Filter navigation items based on feature settings
  const navigation = allNavigationItems.filter(item => {
    if (!item.feature) return true; // Always show items without feature requirements
    return isFeatureEnabled(item.feature as keyof typeof isFeatureEnabled);
  });

  const isCurrentPath = (path: string) => {
    if (path === '/owner') {
      return location.pathname === '/owner';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#F5F5F5'}}>
      {/* Main Website Header */}
      <Header />
      
      {/* Owner Dashboard Layout */}
      <div className="flex flex-1">
        {/* Mobile sidebar */}
        <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
          <div className="fixed inset-0 bg-[#333333] bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white border-r border-[#E0E0E0] shadow-[0px_2px_8px_rgba(0,0,0,0.1)]">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#1E90FF]"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-[#333333]" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('owner.layout.businessOwner')}</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        isCurrentPath(item.href)
                          ? 'bg-[#1E90FF] bg-opacity-10 text-[#1E90FF] border-l-4 border-[#1E90FF]'
                          : 'text-[#333333] hover:bg-[#F5F5F5] hover:text-[#1E90FF]'
                      } group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors`}
                      style={{ fontFamily: 'Open Sans, sans-serif' }}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="mr-4 h-6 w-6" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          {/* Navigation Menu */}
          <div className="w-64 flex flex-col">
            <div className="flex-1 flex flex-col min-h-0 border-r border-[#E0E0E0] bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.1)]">
              <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                <div className="flex items-center flex-shrink-0 px-4">
                  <h1 className="text-xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>{t('owner.layout.businessOwner')}</h1>
                </div>
                <nav className="mt-5 flex-1 px-2 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`${
                          isCurrentPath(item.href)
                            ? 'bg-[#1E90FF] bg-opacity-10 text-[#1E90FF] border-l-4 border-[#1E90FF]'
                            : 'text-[#333333] hover:bg-[#F5F5F5] hover:text-[#1E90FF]'
                        } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors`}
                        style={{ fontFamily: 'Open Sans, sans-serif' }}
                      >
                        <Icon className="mr-3 h-6 w-6" />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>

          {/* My Places Sidebar */}
          <div className="w-80 max-w-sm flex flex-col border-r border-[#E0E0E0] bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.1)]">
            <div className="p-4 border-b border-[#E0E0E0] flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>My Places</h2>
            </div>
            
            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-[#333333]/60" />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-3 py-2 border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-transparent"
                  placeholder="Search for a place"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Places List */}
            <div className="flex-grow overflow-y-auto">
              <div className="flex flex-col">
                {filteredPlaces.map((place) => (
                  <div
                    key={place.id}
                    className={`flex items-center gap-4 px-4 min-h-[72px] py-2 justify-between cursor-pointer transition-colors ${
                      selectedPlace?.id === place.id
                        ? 'bg-[#1E90FF] bg-opacity-10 border-l-4 border-[#1E90FF]'
                        : 'bg-white hover:bg-[#F5F5F5]'
                    }`}
                    onClick={() => {
                      setSelectedPlace(place);
                      setSelectedPlaceId(place.id);
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center justify-center rounded-lg shrink-0 size-12 ${
                        selectedPlace?.id === place.id ? 'bg-[#1E90FF]' : 'bg-[#F5F5F5]'
                      }`}>
                        {place.location_type === 'fixed' ? (
                          <BuildingOfficeIcon className={`h-6 w-6 ${
                            selectedPlace?.id === place.id ? 'text-white' : 'text-[#1E90FF]'
                          }`} />
                        ) : (
                          <MapPinIcon className={`h-6 w-6 ${
                            selectedPlace?.id === place.id ? 'text-white' : 'text-[#1E90FF]'
                          }`} />
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className={`text-base font-medium leading-normal line-clamp-1 ${
                          selectedPlace?.id === place.id ? 'text-[#1E90FF]' : 'text-[#333333]'
                        }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          {place.name}
                        </p>
                        <p className={`text-sm font-normal leading-normal line-clamp-2 ${
                          selectedPlace?.id === place.id ? 'text-[#1E90FF]' : 'text-[#333333]/60'
                        }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          {place.location_type === 'fixed' ? 'Fixed Location' : 'Mobile/Service Area'}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <div className={`flex size-7 items-center justify-center ${
                        selectedPlace?.id === place.id ? 'text-[#1E90FF]' : 'text-[#333333]/60'
                      }`}>
                        <PencilIcon className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="md:pl-[576px] flex flex-col flex-1">
          <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-white">
            <button
              type="button"
              className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-[#333333] hover:text-[#1E90FF] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#1E90FF]"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>
          <main className="flex-1">
            <div className="py-6">
              <div className="w-full px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default OwnerLayout;
