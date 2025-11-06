import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TimeOffOverview from './TimeOffOverview';
import { useOwnerApi } from '../../utils/ownerApi';
import { BuildingOfficeIcon, MapPinIcon, CalendarIcon } from '@heroicons/react/24/outline';

const EmployeeTimeOff: React.FC = () => {
  const location = useLocation();
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { usePlaces } = useOwnerApi();
  const { data: places = [] } = usePlaces();

  // Handle navigation state from employee list
  useEffect(() => {
    if (location.state) {
      const { selectedEmployee: navEmployee, selectedPlace: navPlace } = location.state as any;
      if (navEmployee) {
        setSelectedEmployee(navEmployee);
      }
      if (navPlace) {
        setSelectedPlaceId(navPlace);
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (!selectedPlaceId && places.length > 0) {
      setSelectedPlaceId(places[0].id);
    }
  }, [places, selectedPlaceId]);

  const filteredPlaces = places.filter((p: any) => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex h-screen bg-background-light">
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-form border border-medium-gray"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <svg className="w-6 h-6 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside className={`w-1/3 max-w-sm flex flex-col border-r border-medium-gray bg-white lg:block ${
        sidebarOpen ? 'block' : 'hidden'
      }`}>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-charcoal/60" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387-1.414 1.414-4.387-4.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd"/></svg>
            </div>
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Search for a place"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Places List */}
        <div className="flex-grow overflow-y-auto">
          <div className="flex flex-col">
            {filteredPlaces.map((place: any) => (
              <div
                key={place.id}
                className={`flex items-center gap-4 px-4 min-h-[72px] py-2 justify-between cursor-pointer transition-colors ${
                  selectedPlaceId === place.id
                    ? 'bg-bright-blue/10 border-l-4 border-bright-blue'
                    : 'bg-white hover:bg-light-gray'
                }`}
                onClick={() => { setSelectedPlaceId(place.id); setSidebarOpen(false); }}
              >
                <div className="flex items-center gap-4">
                  <div className="text-bright-blue flex items-center justify-center rounded-lg bg-bright-blue/10 shrink-0 size-12">
                    {place.location_type === 'fixed' ? (
                      <BuildingOfficeIcon className="h-6 w-6" />
                    ) : (
                      <MapPinIcon className="h-6 w-6" />
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-charcoal text-base font-medium leading-normal line-clamp-1 font-body">
                      {place.name}
                    </p>
                    <p className="text-charcoal/60 text-sm font-normal leading-normal line-clamp-2 font-body">
                      Time-off Management
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="text-bright-blue flex size-7 items-center justify-center">
                    <CalendarIcon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="w-full lg:w-2/3 flex-grow p-4 lg:p-6 bg-background-light overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <h1 className="text-charcoal text-2xl lg:text-3xl font-black leading-tight tracking-[-0.033em] font-display">Time-off</h1>
          </div>
          <div className="card">
            <TimeOffOverview selectedPlaceId={selectedPlaceId} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeTimeOff;
