import React, { useState, useEffect } from 'react';
import { ClockIcon, BuildingOfficeIcon, MapPinIcon, MagnifyingGlassIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useOwnerApi } from '../../utils/ownerApi';

interface Place {
  id: number;
  name: string;
  location_type: 'fixed' | 'mobile';
  city?: string;
  service_areas?: string[];
  working_hours?: { [key: string]: any };
}

interface WorkingHours {
  [day: string]: {
    available: boolean;
    start: string;
    end: string;
    break_start?: string;
    break_end?: string;
  };
}

const PlaceWorkingHours: React.FC = () => {
  const { usePlaces, useUpdatePlace } = useOwnerApi();
  
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: placesData } = usePlaces();
  const places = Array.isArray(placesData) ? placesData : [];
  const updatePlaceMutation = useUpdatePlace();

  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    if (places.length > 0 && !selectedPlace) {
      setSelectedPlace(places[0]);
    }
  }, [places, selectedPlace]);

  useEffect(() => {
    if (selectedPlace) {
      // Check if working_hours exists and has actual content (not just empty object)
      if (selectedPlace.working_hours && Object.keys(selectedPlace.working_hours).length > 0) {
        setWorkingHours(selectedPlace.working_hours);
      } else {
        // Initialize with default working hours
        const defaultHours: WorkingHours = {};
        dayNames.forEach(day => {
          defaultHours[day] = {
            available: day !== 'sunday', // Closed on Sunday by default
            start: '09:00',
            end: '17:00'
          };
        });
        setWorkingHours(defaultHours);
      }
    }
  }, [selectedPlace]);

  const handleDayToggle = (day: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        available: !prev[day]?.available
      }
    }));
  };

  const handleTimeChange = (day: string, field: string, value: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!selectedPlace) return;

    setIsSaving(true);
    try {
      await updatePlaceMutation.mutateAsync({
        id: selectedPlace.id,
        data: { working_hours: workingHours }
      });
      alert('Working hours saved successfully!');
    } catch (error) {
      console.error('Error saving working hours:', error);
      alert('Error saving working hours. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyToAll = (sourceDay: string) => {
    const sourceHours = workingHours[sourceDay];
    if (!sourceHours) return;

    const newHours = { ...workingHours };
    dayNames.forEach(day => {
      if (day !== sourceDay) {
        newHours[day] = { ...sourceHours };
      }
    });
    setWorkingHours(newHours);
  };

  // Filter places based on search term
  const filteredPlaces = places.filter(place =>
    place.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <MagnifyingGlassIcon className="h-5 w-5 text-charcoal/60" />
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
            {filteredPlaces.map((place) => (
              <div
                key={place.id}
                className={`flex items-center gap-4 px-4 min-h-[72px] py-2 justify-between cursor-pointer transition-colors ${
                  selectedPlace?.id === place.id
                    ? 'bg-bright-blue/10 border-l-4 border-bright-blue'
                    : 'bg-white hover:bg-light-gray'
                }`}
                onClick={() => {
                  setSelectedPlace(place);
                  setSidebarOpen(false); // Close sidebar on mobile when place is selected
                }}
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
                      {place.location_type === 'fixed' ? 'Fixed Location' : 'Mobile/Service Area'}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="text-bright-blue flex size-7 items-center justify-center">
                    <ClockIcon className="h-4 w-4" />
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
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 text-charcoal/60 hover:text-charcoal"
                onClick={() => setSidebarOpen(true)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-charcoal text-2xl lg:text-3xl font-black leading-tight tracking-[-0.033em] font-display">
                Working Hours
              </h1>
            </div>
          </div>

          {/* Selected Place Details */}
          {selectedPlace ? (
            <div className="space-y-6">
              {/* Place Info Card */}
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-charcoal font-display">
                    {selectedPlace.name}
                  </h2>
                  <div className="flex items-center text-sm text-charcoal/60 font-body">
                    {selectedPlace.location_type === 'fixed' ? (
                      <>
                        <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                        Fixed Location - {selectedPlace.city}
                      </>
                    ) : (
                      <>
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        Mobile Service - {selectedPlace.service_areas?.join(', ')}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Working Hours Editor */}
              <div className="card">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-charcoal mb-4 font-display">
                    Weekly Schedule
                  </h3>
                  
                  <div className="space-y-4">
                    {dayNames.map((day, index) => (
                      <div key={day} className="flex items-center space-x-4 p-4 border border-medium-gray rounded-lg bg-white">
                        <div className="w-24">
                          <label className="block text-sm font-medium text-charcoal font-body">
                            {dayLabels[index]}
                          </label>
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={workingHours[day]?.available || false}
                            onChange={() => handleDayToggle(day)}
                            className="h-4 w-4 text-bright-blue focus:ring-bright-blue border-medium-gray bg-white rounded"
                          />
                          <label className="ml-2 text-sm text-charcoal font-body">Open</label>
                        </div>
                        
                        {workingHours[day]?.available && (
                          <div className="flex items-center space-x-4">
                            <div>
                              <label className="block text-xs text-charcoal/60 font-body">Start</label>
                              <input
                                type="time"
                                value={workingHours[day]?.start || '09:00'}
                                onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                                className="input-field w-24"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-charcoal/60 font-body">End</label>
                              <input
                                type="time"
                                value={workingHours[day]?.end || '17:00'}
                                onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                                className="input-field w-24"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={!!workingHours[day]?.break_start}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleTimeChange(day, 'break_start', '12:00');
                                    handleTimeChange(day, 'break_end', '13:00');
                                  } else {
                                    handleTimeChange(day, 'break_start', '');
                                    handleTimeChange(day, 'break_end', '');
                                  }
                                }}
                                className="h-4 w-4 text-bright-blue focus:ring-bright-blue border-medium-gray bg-white rounded"
                              />
                              <label className="text-sm text-charcoal font-body">Lunch Break</label>
                            </div>
                            {workingHours[day]?.break_start && (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="time"
                                  value={workingHours[day]?.break_start || '12:00'}
                                  onChange={(e) => handleTimeChange(day, 'break_start', e.target.value)}
                                  className="input-field w-20"
                                />
                                <span className="text-charcoal/60">-</span>
                                <input
                                  type="time"
                                  value={workingHours[day]?.break_end || '13:00'}
                                  onChange={(e) => handleTimeChange(day, 'break_end', e.target.value)}
                                  className="input-field w-20"
                                />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopyToAll(day)}
                              className="text-xs text-bright-blue hover:text-blue-600 font-body"
                            >
                              Copy to all
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-6 pt-4 border-t border-medium-gray">
                    <h4 className="text-sm font-medium text-charcoal mb-3 font-body">Quick Actions</h4>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newHours = { ...workingHours };
                          dayNames.forEach(day => {
                            newHours[day] = { available: true, start: '09:00', end: '17:00' };
                          });
                          setWorkingHours(newHours);
                        }}
                        className="px-3 py-1 text-xs bg-lime-green text-white rounded hover:bg-green-500 font-body"
                      >
                        Set All Days 9AM-5PM
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newHours = { ...workingHours };
                          dayNames.forEach(day => {
                            newHours[day] = { available: day !== 'sunday', start: '09:00', end: '17:00' };
                          });
                          setWorkingHours(newHours);
                        }}
                        className="px-3 py-1 text-xs bg-bright-blue text-white rounded hover:bg-blue-600 font-body"
                      >
                        Set Weekdays Only
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newHours = { ...workingHours };
                          dayNames.forEach(day => {
                            newHours[day] = { available: false, start: '09:00', end: '17:00' };
                          });
                          setWorkingHours(newHours);
                        }}
                        className="px-3 py-1 text-xs bg-coral-red text-white rounded hover:bg-red-500 font-body"
                      >
                        Close All Days
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons at Bottom */}
                  <div className="mt-6 pt-4 border-t border-medium-gray flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!selectedPlace || isSaving}
                      className="btn-primary"
                    >
                      <ClockIcon className="h-4 w-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save Hours'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="p-8 text-center">
                <ClockIcon className="h-12 w-12 text-charcoal/40 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-charcoal mb-2 font-display">Select a Place</h3>
                <p className="text-charcoal/60 font-body">Choose a place from the sidebar to set working hours</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PlaceWorkingHours;
