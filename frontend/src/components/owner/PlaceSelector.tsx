import React from 'react';
import { BuildingOfficeIcon, MapPinIcon } from '@heroicons/react/24/outline';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Place {
  id: number;
  name: string;
  location_type: 'fixed' | 'mobile';
  city?: string;
  service_areas?: string[];
}

interface PlaceSelectorProps {
  places: Place[];
  selectedPlaceId?: number;
  onPlaceChange: (placeId: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

const PlaceSelector: React.FC<PlaceSelectorProps> = ({
  places,
  selectedPlaceId,
  onPlaceChange,
  placeholder = "Select a place",
  disabled = false
}) => {
  // Safety check to ensure places is an array
  const safePlaces = Array.isArray(places) ? places : [];
  const selectedPlace = safePlaces.find(place => place.id === selectedPlaceId);

  return (
    <div className="relative">
      <Select
        value={selectedPlaceId?.toString() || ''}
        onValueChange={(value) => onPlaceChange(Number(value))}
        disabled={disabled}
      >
        <SelectTrigger className="block w-full pl-10 pr-10" style={{ fontFamily: 'Open Sans, sans-serif' }}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {selectedPlace?.location_type === 'mobile' ? (
              <MapPinIcon className="h-5 w-5 text-[#9E9E9E]" />
            ) : (
              <BuildingOfficeIcon className="h-5 w-5 text-[#9E9E9E]" />
            )}
          </div>
          <span className="flex-1 text-left">
            {selectedPlace 
              ? `${selectedPlace.name} (${selectedPlace.location_type === 'fixed' ? 'Fixed' : 'Mobile'})${selectedPlace.location_type === 'fixed' && selectedPlace.city ? ` - ${selectedPlace.city}` : ''}${selectedPlace.location_type === 'mobile' && selectedPlace.service_areas && selectedPlace.service_areas.length > 0 ? ` - ${selectedPlace.service_areas.join(', ')}` : ''}`
              : placeholder
            }
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            {placeholder}
          </SelectItem>
          {safePlaces.map((place) => (
            <SelectItem 
              key={place.id} 
              value={place.id.toString()}
              style={{ fontFamily: 'Open Sans, sans-serif' }}
            >
              {place.name} ({place.location_type === 'fixed' ? 'Fixed' : 'Mobile'})
              {place.location_type === 'fixed' && place.city && ` - ${place.city}`}
              {place.location_type === 'mobile' && place.service_areas && place.service_areas.length > 0 && 
                ` - ${place.service_areas.join(', ')}`
              }
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PlaceSelector;
