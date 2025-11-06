import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  XMarkIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { managerAPI, authAPI } from '../../utils/api';
import { ownerApi } from '../../utils/ownerApi';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Place {
  id: number;
  slug?: string; // Optional until migration is run
  name: string;
  sector: string;
  description?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  location_type: 'fixed' | 'mobile';
  service_areas?: string[];
  coverage_radius?: number; // in kilometers
  booking_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  images?: PlaceImage[];
  latitude?: number;
  longitude?: number;
  working_hours?: { [key: string]: any };
}

interface PlaceImage {
  id: number;
  salon_id: number;
  image_url: string;
  image_alt?: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

const PlacesManagement: React.FC = () => {
  console.log('🏢 PlacesManagement component rendered');
  
  // Check authentication status
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.warn('⚠️ No authentication token found');
  } else {
    console.log('✅ Authentication token found');
  }
  const { user, isAuthenticated, isBusinessOwner } = useAuth();
  const { t } = useTranslation();
  const [places, setPlaces] = useState<Place[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    sector: '',
    description: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    email: '',
    website: '',
    instagram: '',
    location_type: 'fixed' as 'fixed' | 'mobile',
    service_areas: [] as string[],
    coverage_radius: 10, // default 10km radius
    booking_enabled: true,
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    workingHours: editingPlace?.working_hours || {},
  });

  // Helper function to generate slug from name
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  };

  // Auto-generate slug when name changes (only if slug is empty)
  useEffect(() => {
    if (formData.name && !formData.slug) {
      const autoSlug = generateSlug(formData.name);
      setFormData(prev => ({ ...prev, slug: autoSlug }));
    }
  }, [formData.name]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    // Debug authentication status
    console.log('🔐 Auth Debug:', {
      user,
      isAuthenticated,
      isBusinessOwner,
      userType: user?.user_type,
      email: user?.email
    });
    
    // Check if user is properly authenticated
    if (!isAuthenticated) {
      console.warn('⚠️ User is not authenticated - redirecting to login');
      alert('Please log in to access this page.');
      window.location.href = '/login';
      return;
    } else if (!isBusinessOwner) {
      console.warn('⚠️ User is authenticated but not a business owner');
      alert('You need to be a business owner to access this page.');
      window.location.href = '/unauthorized';
      return;
    } else {
      console.log('✅ User is authenticated as business owner');
    }
    
    fetchPlaces();
  }, [isAuthenticated, isBusinessOwner]);

  // Search functionality
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPlaces(places);
    } else {
      const filtered = places.filter(place =>
        place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        place.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
        place.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        place.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPlaces(filtered);
    }
  }, [searchTerm, places]);

  const testAuthentication = async () => {
    try {
      console.log('🧪 Testing authentication...');
      const userData = await authAPI.getCurrentUser();
      console.log('✅ Auth test successful:', userData);
      return userData;
    } catch (error) {
      console.error('❌ Auth test failed:', error);
      return null;
    }
  };

  const fetchPlaces = async () => {
    console.log('🔍 Fetching places data from existing APIs...');
    const token = localStorage.getItem('auth_token');
    console.log('🔑 Token:', token ? 'Present' : 'Missing');
    
    if (!token) {
      console.error('❌ No authentication token found');
      alert('Please log in to access this page.');
      window.location.href = '/login';
      return;
    }
    
    // Test authentication first
    const authTest = await testAuthentication();
    if (!authTest) {
      console.error('❌ Authentication test failed, cannot fetch places');
      alert('Authentication failed. Please log in again.');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      return;
    }
    
    try {
      const salonsData = await managerAPI.getManagerSalons();
        console.log('📊 Salons data:', salonsData);
        
        // Transform salon data to places format and fetch images
        const placesData = await Promise.all(
          salonsData.map(async (salon: any) => {
            try {
              const images = await fetchPlaceImages(salon.id);
              return {
                id: salon.id,
                slug: salon.slug || '',
                name: salon.nome,
                sector: salon.regiao || 'Beauty',
                description: salon.about,
                address: salon.rua,
                city: salon.cidade,
                postal_code: salon.cod_postal,
                phone: salon.telefone,
                email: salon.email,
                website: salon.website || '',
                instagram: salon.instagram || '',
                location_type: (salon.location_type || 'fixed') as 'fixed' | 'mobile',
                service_areas: [],
                coverage_radius: salon.coverage_radius || 10,
                booking_enabled: salon.booking_enabled || true,
                is_active: true,
                created_at: salon.created_at,
                updated_at: salon.updated_at,
                images: images || [],
                working_hours: salon.working_hours || {},
                latitude: salon.latitude,
                longitude: salon.longitude
              };
            } catch (error) {
              console.error(`❌ Error fetching images for place ${salon.id}:`, error);
              return {
                id: salon.id,
                slug: salon.slug || '',
                name: salon.nome,
                sector: salon.regiao || 'Beauty',
                description: salon.about,
                address: salon.rua,
                city: salon.cidade,
                postal_code: salon.cod_postal,
                phone: salon.telefone,
                email: salon.email,
                website: salon.website || '',
                instagram: salon.instagram || '',
                location_type: (salon.location_type || 'fixed') as 'fixed' | 'mobile',
                service_areas: [],
                coverage_radius: salon.coverage_radius || 10,
                booking_enabled: salon.booking_enabled || true,
                is_active: true,
                created_at: salon.created_at,
                updated_at: salon.updated_at,
                images: [],
                working_hours: {},
                latitude: salon.latitude,
                longitude: salon.longitude
              };
            }
          })
        );
        
        setPlaces(placesData);
    } catch (error: any) {
      console.error('❌ Error fetching places:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        console.error('❌ Authentication failed during fetch - redirecting to login');
        alert('Your session has expired. Please log in again.');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return;
      }
      
      // Handle other errors
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch places';
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaceImages = async (placeId: number) => {
    const token = localStorage.getItem('auth_token');
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const response = await fetch(`${apiBase}/owner/places/${placeId}/images`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch place images');
    }
    
    return await response.json();
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('auth_token');
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    // The mobile/images/optimize endpoint is at /api/v1/mobile/images/optimize
    const optimizeUrl = apiBase === '/api/v1' 
      ? '/api/v1/mobile/images/optimize'
      : `${apiBase}/mobile/images/optimize`;
    const response = await fetch(optimizeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Upload failed');
    }
    
    const result = await response.json();
    // Return relative URL or construct full URL based on result.url format
    if (result.url.startsWith('http://') || result.url.startsWith('https://')) {
      return result.url;
    }
    return result.url; // Already relative, or we'll let the browser handle it
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: Math.min(prev[file.name] + 10, 90)
          }));
        }, 100);
        
        const fileUrl = await uploadFile(file);
        
        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        
        return fileUrl;
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        throw error;
      }
    });
    
    return Promise.all(uploadPromises);
  };

  const addSalonImages = async (salonId: number, imageUrls: string[]) => {
    const token = localStorage.getItem('auth_token');
    console.log('🔗 Adding images to salon ID:', salonId);
    console.log('🔗 Image URLs to add:', imageUrls);
    
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        console.log(`📤 Adding image ${i + 1}/${imageUrls.length} to salon ${salonId}`);
        const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
        const response = await fetch(`${apiBase}/owner/places/${salonId}/images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            image_url: imageUrls[i],
            is_primary: i === 0 // First image is primary
          })
        });
        
        console.log(`📡 Image ${i + 1} response status:`, response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`❌ Failed to add image ${i + 1} to salon:`, errorData);
          throw new Error(`Failed to add image ${i + 1}: ${errorData.detail || 'Unknown error'}`);
        } else {
          const result = await response.json();
          console.log(`✅ Image ${i + 1} added successfully:`, result);
        }
      } catch (error) {
        console.error(`❌ Error adding image ${i + 1}:`, error);
        throw error;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const token = localStorage.getItem('auth_token');
    console.log('🔑 Submitting with token:', token ? 'Present' : 'Missing');
    
    // Check if user is authenticated
    if (!token) {
      alert('You must be logged in to create a place. Please log in first.');
      return;
    }
    
    try {
      setUploading(true);
      
      // Use the API utility instead of direct fetch
      const placeData = {
        nome: formData.name,
        slug: formData.slug || undefined, // Auto-generated by backend if not provided
        tipo: formData.sector,
        about: formData.description,
        rua: formData.address,
        cidade: formData.city,
        cod_postal: formData.postal_code,
        telefone: formData.phone,
        email: formData.email,
        website: formData.website || '',
        instagram: formData.instagram || '',
        booking_enabled: formData.booking_enabled,
        pais: 'Portugal',
        regiao: formData.sector,
        porta: '',
        is_bio_diamond: false,
        latitude: formData.latitude || null, // Prioritize formData.latitude
        longitude: formData.longitude || null, // Prioritize formData.longitude
        location_type: formData.location_type,
        coverage_radius: formData.coverage_radius || 10,
        working_hours: formData.workingHours || {}
      };
      
      let responseData;
      let salonId: number;
      
      try {
        if (editingPlace) {
          // Update existing place
          responseData = await managerAPI.updateSalon(editingPlace.id, placeData);
          salonId = editingPlace.id;
          console.log('✏️ Editing existing salon ID:', salonId);
        } else {
          // Create new place
          responseData = await managerAPI.createSalon(placeData);
          salonId = responseData.id;
          console.log('🆕 Created new salon ID:', salonId);
          
          // Validate salon ID for new salons
          if (!salonId) {
            console.error('❌ No salon ID in response:', responseData);
            alert('Failed to create place: No salon ID returned from server.');
            return;
          }
        }
        
        console.log('✅ Place response:', responseData);
      } catch (error: any) {
        console.error('❌ API error:', error);
        console.error('❌ Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          code: error.code
        });
        
        if (error.response?.status === 401) {
          console.error('❌ Authentication failed - redirecting to login');
          alert('Your session has expired. Please log in again.');
          // Clear invalid tokens
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          // Redirect to login
          window.location.href = '/login';
          return;
        } else if (error.response?.status === 403) {
          alert('Access denied. You need to be a business owner to create places.');
          return;
        } else if (error.response?.status === 500) {
          const errorDetail = error.response?.data?.detail || 'Internal server error';
          alert(`Server error: ${errorDetail}. Please try again or contact support.`);
          return;
        } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
          alert('Network error. Please check your connection and try again.');
          return;
        } else {
          const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
          alert(`Failed to ${editingPlace ? 'update' : 'create'} place: ${errorMessage}`);
          return;
        }
      }
      
      // Upload images if any files were selected
      if (uploadedFiles.length > 0) {
        try {
          console.log('📤 Starting image upload for salon ID:', salonId);
          const imageUrls = await uploadFiles(uploadedFiles);
          console.log('📤 Image URLs:', imageUrls);
          await addSalonImages(salonId, imageUrls);
          console.log('✅ Images uploaded and added to salon');
        } catch (error) {
          console.error('❌ Failed to upload images:', error);
          alert('Place saved but failed to upload images. You can add them later.');
        }
      }
      
      await fetchPlaces();
      setShowModal(false);
      setEditingPlace(null);
      resetForm();
    } catch (error) {
      console.error('Error saving place:', error);
      alert('Failed to create place. Please try again.');
    } finally {
      setUploading(false);
      setUploadedFiles([]);
      setUploadProgress({});
    }
  };

  const handleEdit = (place: Place) => {
    setEditingPlace(place);
    setSelectedPlace(place);
    setFormData({
      name: place.name,
      slug: place.slug || '',
      sector: place.sector,
      description: place.description || '',
      address: place.address || '',
      city: place.city || '',
      postal_code: place.postal_code || '',
      phone: place.phone || '',
      email: place.email || '',
      website: place.website || '',
      instagram: place.instagram || '',
      location_type: place.location_type,
      service_areas: place.service_areas || [],
      coverage_radius: place.coverage_radius || 10,
      booking_enabled: place.booking_enabled,
      latitude: place.latitude,
      longitude: place.longitude,
      workingHours: place.working_hours || {}
    });
    // Clear uploaded files when editing (images are already associated with the place)
    setUploadedFiles([]);
    setUploadProgress({});
    setShowModal(true);
  };

  const handleDelete = async (placeId: number) => {
    if (window.confirm('Are you sure you want to delete this place?')) {
      try {
        // Use the proper API client instead of direct fetch
        await ownerApi.deletePlace(placeId);
        await fetchPlaces();
        console.log('✅ Place deleted successfully');
      } catch (error) {
        console.error('❌ Error deleting place:', error);
        alert('Error deleting place. Please try again.');
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const resetForm = () => {
    // Clean up object URLs before clearing files
    uploadedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        URL.revokeObjectURL(createImageThumbnail(file));
      }
    });
    
    setFormData({
      name: '',
      slug: '',
      sector: '',
      description: '',
      address: '',
      city: '',
      postal_code: '',
      phone: '',
      email: '',
      website: '',
      instagram: '',
      location_type: 'fixed',
      service_areas: [],
      coverage_radius: 10,
      booking_enabled: true,
      latitude: undefined,
      longitude: undefined,
      workingHours: {}
    });
    setUploadedFiles([]);
    setUploadProgress({});
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    const validFiles = files.filter(file => allowedTypes.includes(file.type));
    
    if (validFiles.length !== files.length) {
      alert('Some files were skipped. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM) are allowed.');
    }
    
    // Validate file sizes (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const sizeValidFiles = validFiles.filter(file => file.size <= maxSize);
    
    if (sizeValidFiles.length !== validFiles.length) {
      alert('Some files were skipped. Maximum file size is 10MB.');
    }
    
    setUploadedFiles(prev => [...prev, ...sizeValidFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev[index];
      // Clean up object URL for images
      if (fileToRemove && fileToRemove.type.startsWith('image/')) {
        URL.revokeObjectURL(createImageThumbnail(fileToRemove));
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('video/')) {
      return '🎥';
    }
    return '🖼️';
  };

  const createImageThumbnail = (file: File): string => {
    return URL.createObjectURL(file);
  };

  // Cleanup object URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
          URL.revokeObjectURL(createImageThumbnail(file));
        }
      });
    };
  }, [uploadedFiles]);


  // Map component for location selection
  const LocationMap: React.FC<{ 
    latitude?: number; 
    longitude?: number; 
    coverageRadius?: number;
    locationType?: 'fixed' | 'mobile';
    onLocationChange?: (lat: number, lng: number) => void;
    onRadiusChange?: (radius: number) => void;
    isEditable?: boolean;
  }> = ({ latitude, longitude, coverageRadius = 10, locationType = 'fixed', onLocationChange, onRadiusChange, isEditable = true }) => {
    const [position, setPosition] = useState<[number, number] | null>(
      (latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined) ? [latitude, longitude] : null
    );

    useEffect(() => {
      if (latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined) {
        setPosition([latitude, longitude]);
      } else {
        setPosition(null);
      }
    }, [latitude, longitude]);

    const MapEvents = () => {
      useMapEvents({
        click: (e) => {
          if (isEditable && onLocationChange) {
            const { lat, lng } = e.latlng;
            setPosition([lat, lng]);
            onLocationChange(lat, lng);
          }
        },
      });
      return null;
    };

    return (
      <MapContainer
        center={position || [39.5, -8.0]} // Default to Portugal
        zoom={position ? 15 : 8}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={isEditable}
        dragging={isEditable}
        touchZoom={isEditable}
        doubleClickZoom={isEditable}
        boxZoom={isEditable}
        keyboard={isEditable}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapEvents />
        {position && <Marker position={position} />}
        {position && locationType === 'mobile' && (
          <Circle
            center={position}
            radius={coverageRadius * 1000} // Convert km to meters
            pathOptions={{
              color: '#3B82F6',
              fillColor: '#3B82F6',
              fillOpacity: 0.2,
              weight: 2
            }}
          />
        )}
      </MapContainer>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-light-gray">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-bright-blue"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-light-gray">
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #1E90FF;
          cursor: pointer;
          border: 2px solid #E0E0E0;
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #1E90FF;
          cursor: pointer;
          border: 2px solid #E0E0E0;
        }
      `}</style>
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
                  <div className="text-charcoal/60 flex items-center justify-center rounded-lg bg-light-gray shrink-0 size-12">
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
                  <div className="text-charcoal/60 flex size-7 items-center justify-center">
                    <PencilIcon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Place Button */}
        <div className="p-4 border-t border-medium-gray">
          <button
            className="btn-primary w-full"
            onClick={() => {
              resetForm();
              setEditingPlace(null);
              setSelectedPlace(null);
              setShowModal(true);
            }}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            <span className="truncate">Add New Place</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="w-full lg:w-2/3 flex-grow p-4 lg:p-6 bg-light-gray overflow-y-auto">
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
              <h1 className="text-charcoal text-2xl lg:text-3xl font-bold leading-tight font-display">
                Places Management
              </h1>
            </div>
          </div>

          {/* Selected Place Details */}
          {selectedPlace ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Main Info Card */}
              <div className="xl:col-span-2">
                <div className="card">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-charcoal font-display">
                      {selectedPlace.name}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Place Name
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        value={selectedPlace.name}
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Sector
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        value={selectedPlace.sector}
                        readOnly
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Location Type
                      </label>
                      <div className="flex gap-4">
                        <label className={`flex items-center gap-2 p-3 rounded-lg border w-full cursor-pointer ${
                          selectedPlace.location_type === 'fixed'
                            ? 'border-bright-blue bg-bright-blue/10'
                            : 'border-medium-gray'
                        }`}>
                          <input
                            type="radio"
                            name="location-type"
                            checked={selectedPlace.location_type === 'fixed'}
                            readOnly
                            className="form-radio text-bright-blue focus:ring-bright-blue"
                          />
                          <span className="text-charcoal font-body">Fixed Location</span>
                        </label>
                        <label className={`flex items-center gap-2 p-3 rounded-lg border w-full cursor-pointer ${
                          selectedPlace.location_type === 'mobile'
                            ? 'border-bright-blue bg-bright-blue/10'
                            : 'border-medium-gray'
                        }`}>
                          <input
                            type="radio"
                            name="location-type"
                            checked={selectedPlace.location_type === 'mobile'}
                            readOnly
                            className="form-radio text-bright-blue focus:ring-bright-blue"
                          />
                          <span className="text-charcoal font-body">Mobile/Service Area</span>
                        </label>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Address
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        value={selectedPlace.address || ''}
                        readOnly
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Description
                      </label>
                      <textarea
                        className="input-field"
                        rows={3}
                        value={selectedPlace.description || ''}
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Phone
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        value={selectedPlace.phone || ''}
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Email
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        value={selectedPlace.email || ''}
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Website
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        value={selectedPlace.website || ''}
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Instagram
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        value={selectedPlace.instagram || ''}
                        readOnly
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Business URL
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          className="input-field flex-1"
                          type="text"
                          value={`https://linkuup.portugalexpatdirectory.com/${selectedPlace.slug || selectedPlace.id}`}
                          readOnly
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`https://linkuup.portugalexpatdirectory.com/${selectedPlace.slug || selectedPlace.id}`)}
                          className="px-4 py-2 bg-bright-blue text-white rounded-lg hover:bg-bright-blue/90 transition-colors font-medium flex items-center gap-2"
                          title="Copy URL"
                        >
                          <ClipboardDocumentIcon className="h-5 w-5" />
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button
                      className="btn-secondary"
                      onClick={() => handleDelete(selectedPlace.id)}
                    >
                      <TrashIcon className="h-5 w-5 mr-2" />
                      <span>Delete Place</span>
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => handleEdit(selectedPlace)}
                    >
                      <PencilIcon className="h-5 w-5 mr-2" />
                      <span>Edit Place</span>
                    </button>
                    <button
                      className="btn-outline"
                      onClick={() => setSelectedPlace(null)}
                    >
                      <XMarkIcon className="h-5 w-5 mr-2" />
                      <span>Close</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Map and Images Sidebar */}
              <div className="space-y-6">
                {/* Map Card */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-charcoal mb-4 font-display">Location</h3>
                  <div className="w-full h-64 bg-light-gray rounded-lg overflow-hidden">
                    <LocationMap
                      latitude={selectedPlace.latitude}
                      longitude={selectedPlace.longitude}
                      coverageRadius={selectedPlace.coverage_radius}
                      locationType={selectedPlace.location_type}
                      isEditable={false}
                    />
                  </div>
                  {selectedPlace.latitude && selectedPlace.longitude && (
                    <div className="mt-2 text-sm text-charcoal/60 font-body">
                      Coordinates: {selectedPlace.latitude.toFixed(6)}, {selectedPlace.longitude.toFixed(6)}
                    </div>
                  )}
                </div>

                {/* Images Card */}
                {selectedPlace.images && selectedPlace.images.length > 0 && (
                  <div className="card">
                    <h3 className="text-lg font-semibold text-charcoal mb-4 font-display">Images</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedPlace.images.map((image) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.image_url}
                            alt={image.image_alt || selectedPlace.name}
                            className="w-full h-32 object-cover rounded-lg border border-medium-gray"
                          />
                          {image.is_primary && (
                            <div className="absolute top-2 left-2 bg-bright-blue text-white text-xs px-2 py-1 rounded font-body">
                              Primary
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-12">
                <BuildingOfficeIcon className="mx-auto h-12 w-12 text-charcoal/40" />
                <h3 className="mt-2 text-sm font-medium text-charcoal font-display">No place selected</h3>
                <p className="mt-1 text-sm text-charcoal/60 font-body">
                  Select a place from the sidebar to view details, or create a new place.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-2 mx-auto p-4 border border-medium-gray w-11/12 max-w-7xl shadow-elevated rounded-lg bg-white">
            <div className="mt-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-charcoal font-display">
                  {editingPlace ? `Edit Place: ${editingPlace.name}` : 'Add New Place'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPlace(null);
                    resetForm();
                  }}
                  className="text-charcoal/60 hover:text-charcoal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Left Column - Basic Info */}
                  <div className="xl:col-span-1 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Place Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Business URL Slug
                      </label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => {
                          const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                          setFormData({ ...formData, slug: value });
                        }}
                        className="input-field"
                        placeholder="auto-generated-slug"
                        pattern="[a-z0-9\-]+"
                      />
                      <p className="text-xs text-charcoal/60 mt-1">
                        Auto-generated from name. You can customize it.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Sector *
                      </label>
                      <select
                        required
                        value={formData.sector}
                        onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                        className="input-field"
                      >
                        <option value="">{t('search.selectService')}</option>
                        <option value="allServices">{t('search.allServices')}</option>
                        <option value="salon">{t('search.salon')}</option>
                        <option value="barber">{t('search.barber')}</option>
                        <option value="nails">{t('search.nails')}</option>
                        <option value="spaSauna">{t('search.spaSauna')}</option>
                        <option value="medicalSpa">{t('search.medicalSpa')}</option>
                        <option value="massage">{t('search.massage')}</option>
                        <option value="fitnessRehab">{t('search.fitnessRehab')}</option>
                        <option value="physiotherapy">{t('search.physiotherapy')}</option>
                        <option value="medicalOffices">{t('search.medicalOffices')}</option>
                        <option value="tattooPiercing">{t('search.tattooPiercing')}</option>
                        <option value="petGrooming">{t('search.petGrooming')}</option>
                        <option value="tanningClinic">{t('search.tanningClinic')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Location Type
                      </label>
                      <div className="flex gap-4">
                        <label className={`flex items-center gap-2 p-3 rounded-lg border w-full cursor-pointer ${
                          formData.location_type === 'fixed'
                            ? 'border-bright-blue bg-bright-blue/10'
                            : 'border-medium-gray'
                        }`}>
                          <input
                            type="radio"
                            name="location-type"
                            checked={formData.location_type === 'fixed'}
                            onChange={() => setFormData({ ...formData, location_type: 'fixed' })}
                            className="form-radio text-bright-blue focus:ring-bright-blue"
                          />
                          <span className="text-charcoal font-body">Fixed Location</span>
                        </label>
                        <label className={`flex items-center gap-2 p-3 rounded-lg border w-full cursor-pointer ${
                          formData.location_type === 'mobile'
                            ? 'border-bright-blue bg-bright-blue/10'
                            : 'border-medium-gray'
                        }`}>
                          <input
                            type="radio"
                            name="location-type"
                            checked={formData.location_type === 'mobile'}
                            onChange={() => setFormData({ ...formData, location_type: 'mobile' })}
                            className="form-radio text-bright-blue focus:ring-bright-blue"
                          />
                          <span className="text-charcoal font-body">Mobile/Service Area</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Address
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="input-field"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="input-field"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                          Website
                        </label>
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          className="input-field"
                          placeholder="https://example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                          Instagram
                        </label>
                        <input
                          type="text"
                          value={formData.instagram}
                          onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                          className="input-field"
                          placeholder="@username"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                        Online Booking
                      </label>
                      <label
                        className={`flex items-center gap-2 p-3 rounded-lg border w-full cursor-pointer ${
                          formData.booking_enabled ? 'border-bright-blue bg-bright-blue/10' : 'border-medium-gray'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.booking_enabled}
                          onChange={(e) => setFormData({ ...formData, booking_enabled: e.target.checked })}
                          className="form-checkbox text-bright-blue focus:ring-bright-blue"
                        />
                        <span className="text-charcoal font-body">Enable online booking</span>
                      </label>
                    </div>
                  </div>

                  {/* Middle Column - Location */}
                  <div className="xl:col-span-1">
                    <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                      Location Pinpoint
                    </label>
                    <div className="w-full h-80 bg-light-gray rounded-lg overflow-hidden">
                      <LocationMap
                        latitude={formData.latitude}
                        longitude={formData.longitude}
                        coverageRadius={formData.coverage_radius}
                        locationType={formData.location_type}
                        onLocationChange={(lat, lng) => {
                          setFormData({ ...formData, latitude: lat, longitude: lng });
                        }}
                        onRadiusChange={(radius) => {
                          setFormData({ ...formData, coverage_radius: radius });
                        }}
                        isEditable={true}
                      />
                    </div>
                    <p className="text-xs text-charcoal/60 mt-2 font-body">
                      Click on the map to set the location
                    </p>
                    {formData.latitude && formData.longitude && (
                      <div className="mt-2 text-sm text-charcoal/60 font-body">
                        Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                      </div>
                    )}

                    {/* Coverage Radius Control for Mobile Places */}
                    {formData.location_type === 'mobile' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-charcoal mb-2 font-body">
                          Coverage Radius: {formData.coverage_radius} km
                        </label>
                        <div className="space-y-3">
                          <input
                            type="range"
                            min="1"
                            max="50"
                            value={formData.coverage_radius}
                            onChange={(e) => setFormData({ ...formData, coverage_radius: parseInt(e.target.value) })}
                            className="w-full h-2 bg-light-gray rounded-lg appearance-none cursor-pointer slider"
                          />
                          <div className="flex justify-between text-xs text-charcoal/60 font-body">
                            <span>1 km</span>
                            <span>25 km</span>
                            <span>50 km</span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={formData.coverage_radius}
                              onChange={(e) => setFormData({ ...formData, coverage_radius: parseInt(e.target.value) || 1 })}
                              className="w-20 px-2 py-1 bg-light-gray border border-medium-gray rounded text-charcoal text-sm font-body"
                            />
                            <span className="text-sm text-charcoal self-center font-body">km</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.latitude || ''}
                          onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                          className="input-field"
                          placeholder="40.2033"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-1 font-body">
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.longitude || ''}
                          onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                          className="input-field"
                          placeholder="-8.4103"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (position) => {
                                setFormData({
                                  ...formData,
                                  latitude: position.coords.latitude,
                                  longitude: position.coords.longitude
                                });
                              },
                              () => {
                                alert('Unable to get your location. Please enter coordinates manually.');
                              }
                            );
                          } else {
                            alert('Geolocation is not supported by this browser.');
                          }
                        }}
                        className="btn-outline text-sm flex-1"
                      >
                        📍 Current Location
                      </button>
                    </div>
                  </div>

                  {/* Right Column - Images */}
                  <div className="xl:col-span-1 space-y-4">
                    {/* Existing Images Display */}
                    {editingPlace && editingPlace.images && editingPlace.images.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-2 font-body">
                          Current Images
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                          {editingPlace.images.map((image) => (
                            <div key={image.id} className="relative group">
                              <img
                                src={image.image_url}
                                alt={image.image_alt || editingPlace.name}
                                className="w-full h-24 object-cover rounded-lg border border-medium-gray"
                              />
                              {image.is_primary && (
                                <div className="absolute top-1 left-1 bg-bright-blue text-white text-xs px-1 py-0.5 rounded font-body">
                                  Primary
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* File Upload Section */}
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-2 font-body">
                        Images/Videos (Optional)
                        {editingPlace && (
                          <span className="text-sm text-charcoal/60 ml-2 font-body">
                            (Adding new images)
                          </span>
                        )}
                      </label>
                      <div className="space-y-3">
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={handleFileSelect}
                          className="block w-full text-sm text-charcoal/60 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-bright-blue file:text-white hover:file:bg-blue-600 font-body"
                        />
                        
                        {uploadedFiles.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-sm text-charcoal/60 font-body">Selected files:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {uploadedFiles.map((file, index) => (
                                <div key={index} className="bg-light-gray rounded-lg p-3 border border-medium-gray">
                                  <div className="flex items-start space-x-3">
                                    {/* Image Thumbnail or Video Icon */}
                                    <div className="flex-shrink-0">
                                      {file.type.startsWith('image/') ? (
                                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-medium-gray">
                                          <img
                                            src={createImageThumbnail(file)}
                                            alt={file.name}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <div className="w-16 h-16 bg-charcoal/10 rounded-lg flex items-center justify-center">
                                          <span className="text-2xl">{getFileIcon(file)}</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* File Info */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-charcoal truncate font-body" title={file.name}>
                                        {file.name}
                                      </p>
                                      <p className="text-xs text-charcoal/60 font-body">
                                        {(file.size / 1024 / 1024).toFixed(1)} MB
                                      </p>
                                      <p className="text-xs text-charcoal/40 capitalize font-body">
                                        {file.type.split('/')[1]}
                                      </p>
                                    </div>
                                    
                                    {/* Remove Button */}
                                    <button
                                      type="button"
                                      onClick={() => removeFile(index)}
                                      className="flex-shrink-0 text-coral-red hover:text-red-500 transition-colors p-1"
                                      title="Remove file"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {uploading && (
                          <div className="space-y-2">
                            <p className="text-sm text-bright-blue font-body">Uploading files...</p>
                            {Object.entries(uploadProgress).map(([filename, progress]) => (
                              <div key={filename} className="w-full bg-light-gray rounded-full h-2">
                                <div
                                  className="bg-bright-blue h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingPlace(null);
                      resetForm();
                    }}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className={`btn-primary ${
                      uploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {uploading ? 'Uploading...' : (editingPlace ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacesManagement;
