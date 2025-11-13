import React, { useState, useEffect } from 'react';
import { ChevronRightIcon, ChevronDownIcon, BuildingOfficeIcon, MapPinIcon, CalendarIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { adminAPI } from '../../utils/api';

interface Place {
  id: number;
  nome: string;
  tipo: string;
  cidade: string;
  regiao: string;
  estado: string;
  telefone?: string;
  email?: string;
  is_active: boolean;
  booking_enabled: boolean;
  is_bio_diamond: boolean;
  bookings_count: number;
  services_count: number;
  created_at: string;
}

interface Owner {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  place_count: number;
  total_bookings: number;
  created_at: string;
}

interface PlaceHierarchyProps {
  selectedOwnerId?: number | null;
  onPlaceSelect?: (place: Place) => void;
  onPlaceUpdate?: (placeId: number, updates: any) => void;
  className?: string;
}

const PlaceHierarchy: React.FC<PlaceHierarchyProps> = ({
  selectedOwnerId,
  onPlaceSelect,
  onPlaceUpdate,
  className = ""
}) => {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPlaces, setExpandedPlaces] = useState<Set<number>>(new Set());
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // Load owner and places when selectedOwnerId changes
  useEffect(() => {
    if (selectedOwnerId) {
      loadOwnerAndPlaces();
    } else {
      setOwner(null);
      setPlaces([]);
      setSelectedPlace(null);
    }
  }, [selectedOwnerId]);

  const loadOwnerAndPlaces = async () => {
    if (!selectedOwnerId) return;

    try {
      setLoading(true);
      setError(null);

      // Load owner details
      const ownerResponse = await adminAPI.getOwnerDetails(selectedOwnerId);
      setOwner(ownerResponse.user);

      // Load owner's places
      const placesResponse = await adminAPI.getOwnerPlaces(selectedOwnerId);
      setPlaces(placesResponse.places);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load owner and places');
      setOwner(null);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const togglePlaceExpansion = (placeId: number) => {
    const newExpanded = new Set(expandedPlaces);
    if (newExpanded.has(placeId)) {
      newExpanded.delete(placeId);
    } else {
      newExpanded.add(placeId);
    }
    setExpandedPlaces(newExpanded);
  };

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlace(place);
    onPlaceSelect?.(place);
  };

  const handlePlaceToggle = async (placeId: number, action: 'booking' | 'status' | 'bio-diamond') => {
    try {
      let response;
      switch (action) {
        case 'booking':
          response = await adminAPI.togglePlaceBooking(placeId);
          break;
        case 'status':
          response = await adminAPI.togglePlaceStatus(placeId);
          break;
        case 'bio-diamond':
          response = await adminAPI.togglePlaceBioDiamond(placeId);
          break;
      }

      // Update local state
      setPlaces(prevPlaces =>
        prevPlaces.map(place => {
          if (place.id === placeId) {
            return {
              ...place,
              ...response
            };
          }
          return place;
        })
      );

      onPlaceUpdate?.(placeId, response);
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to update place ${action}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  if (!selectedOwnerId) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium">Select an Owner</p>
          <p className="text-sm">Choose an owner from the dropdown to view their places</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-red-500">
          <p className="font-medium">Error loading places</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={loadOwnerAndPlaces}
            className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Owner Header */}
      {owner && (
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-sm font-medium text-purple-600">
                  {owner.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{owner.name}</h3>
                <p className="text-sm text-gray-500">{owner.email}</p>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-xs text-gray-400">
                    {owner.place_count} places
                  </span>
                  <span className="text-xs text-gray-400">
                    {owner.total_bookings} bookings
                  </span>
                  <span className="text-xs text-gray-400">
                    Joined {formatDate(owner.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!owner.is_active && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Places List */}
      <div className="divide-y divide-gray-200">
        {places.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="font-medium">No places found</p>
            <p className="text-sm">This owner doesn't have any places yet</p>
          </div>
        ) : (
          places.map((place) => (
            <div key={place.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handlePlaceSelect(place)}
                      className={`flex-1 text-left hover:bg-gray-50 rounded-lg p-3 transition-colors ${
                        selectedPlace?.id === place.id ? 'bg-purple-50 border border-purple-200' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          place.is_active ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <BuildingOfficeIcon className={`h-4 w-4 ${
                            place.is_active ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {place.nome}
                            </h4>
                            <div className="flex items-center space-x-1">
                              {!place.is_active && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  Inactive
                                </span>
                              )}
                              {place.booking_enabled && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Booking
                                </span>
                              )}
                              {place.is_bio_diamond && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  BIO Diamond
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <MapPinIcon className="h-3 w-3" />
                              <span>{place.cidade}, {place.regiao}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <CalendarIcon className="h-3 w-3" />
                              <span>{place.bookings_count} bookings</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {place.services_count} services
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handlePlaceToggle(place.id, 'bio-diamond')}
                    className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors ${
                      place.is_bio_diamond
                        ? 'text-red-700 bg-red-100 hover:bg-red-200'
                        : 'text-purple-700 bg-purple-100 hover:bg-purple-200'
                    }`}
                    title={place.is_bio_diamond ? 'Remove BIO Diamond' : 'Make BIO Diamond'}
                  >
                    💎
                  </button>
                  <button
                    onClick={() => handlePlaceToggle(place.id, 'booking')}
                    className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors ${
                      place.booking_enabled
                        ? 'text-red-700 bg-red-100 hover:bg-red-200'
                        : 'text-green-700 bg-green-100 hover:bg-green-200'
                    }`}
                    title={place.booking_enabled ? 'Disable Booking' : 'Enable Booking'}
                  >
                    📅
                  </button>
                  <button
                    onClick={() => handlePlaceToggle(place.id, 'status')}
                    className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors ${
                      place.is_active
                        ? 'text-red-700 bg-red-100 hover:bg-red-200'
                        : 'text-green-700 bg-green-100 hover:bg-green-200'
                    }`}
                    title={place.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {place.is_active ? '⏸️' : '▶️'}
                  </button>
                  <button
                    onClick={() => togglePlaceExpansion(place.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Configure place"
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Configuration Panel */}
              {expandedPlaces.has(place.id) && (
                <div className="mt-4 ml-11 border-t border-gray-200 pt-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-3">Place Configuration</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Place Type
                        </label>
                        <span className="text-sm text-gray-900">{place.tipo}</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          State
                        </label>
                        <span className="text-sm text-gray-900">{place.estado}</span>
                      </div>
                      {place.telefone && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Phone
                          </label>
                          <span className="text-sm text-gray-900">{place.telefone}</span>
                        </div>
                      )}
                      {place.email && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <span className="text-sm text-gray-900">{place.email}</span>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Created
                        </label>
                        <span className="text-sm text-gray-900">{formatDate(place.created_at)}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          // This would open a detailed configuration modal
                          console.log('Open detailed configuration for place:', place.id);
                        }}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        <Cog6ToothIcon className="h-4 w-4 mr-2" />
                        Advanced Configuration
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PlaceHierarchy;
