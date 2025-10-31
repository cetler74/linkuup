import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { adminAPI } from '../../utils/api';

interface Owner {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  place_count: number;
  total_bookings: number;
  created_at: string;
}

interface OwnerSelectorProps {
  selectedOwnerId?: number | null;
  onOwnerSelect: (owner: Owner | null) => void;
  placeholder?: string;
  showStats?: boolean;
  className?: string;
}

const OwnerSelector: React.FC<OwnerSelectorProps> = ({
  selectedOwnerId,
  onOwnerSelect,
  placeholder = "Select an owner...",
  showStats = true,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);

  // Load owners when component mounts or search term changes
  useEffect(() => {
    const loadOwners = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await adminAPI.getOwners(1, 50, searchTerm);
        setOwners(response.items);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load owners');
        setOwners([]);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadOwners();
    }
  }, [isOpen, searchTerm]);

  // Set selected owner when selectedOwnerId changes
  useEffect(() => {
    if (selectedOwnerId && owners.length > 0) {
      const owner = owners.find(o => o.id === selectedOwnerId);
      if (owner) {
        setSelectedOwner(owner);
      }
    } else if (!selectedOwnerId) {
      setSelectedOwner(null);
    }
  }, [selectedOwnerId, owners]);

  const handleOwnerSelect = (owner: Owner) => {
    setSelectedOwner(owner);
    onOwnerSelect(owner);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSelectedOwner(null);
    onOwnerSelect(null);
    setIsOpen(false);
    setSearchTerm('');
  };

  const filteredOwners = owners.filter(owner =>
    owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full bg-white border border-gray-300 rounded-lg shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
      >
        <span className="block truncate">
          {selectedOwner ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{selectedOwner.name}</div>
                <div className="text-sm text-gray-500">{selectedOwner.email}</div>
                {showStats && (
                  <div className="text-xs text-gray-400">
                    {selectedOwner.place_count} places • {selectedOwner.total_bookings} bookings
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {!selectedOwner.is_active && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                    Inactive
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {/* Search Input */}
          <div className="px-3 py-2 border-b border-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search owners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="px-3 py-2 text-center text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mx-auto"></div>
              <span className="ml-2 text-sm">Loading owners...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="px-3 py-2 text-center text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* No Results */}
          {!loading && !error && filteredOwners.length === 0 && (
            <div className="px-3 py-2 text-center text-gray-500 text-sm">
              {searchTerm ? 'No owners found matching your search' : 'No owners available'}
            </div>
          )}

          {/* Owner List */}
          {!loading && !error && filteredOwners.map((owner) => (
            <button
              key={owner.id}
              onClick={() => handleOwnerSelect(owner)}
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                selectedOwner?.id === owner.id ? 'bg-purple-50 text-purple-900' : 'text-gray-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <div className="font-medium truncate">{owner.name}</div>
                    {!owner.is_active && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 truncate">{owner.email}</div>
                  {showStats && (
                    <div className="text-xs text-gray-400">
                      {owner.place_count} places • {owner.total_bookings} bookings • Joined {new Date(owner.created_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {selectedOwner?.id === owner.id && (
                  <div className="ml-2 text-purple-600">
                    ✓
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Click Outside Handler */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default OwnerSelector;
