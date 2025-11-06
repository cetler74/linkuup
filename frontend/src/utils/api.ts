import axios from 'axios';

// Auth types
interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type: 'customer' | 'business_owner' | 'employee' | 'platform_admin';
  is_active: boolean;
  is_owner: boolean;
  is_admin: boolean;
  gdpr_data_processing_consent: boolean;
  gdpr_marketing_consent: boolean;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  user_type: 'customer' | 'business_owner' | 'employee' | 'platform_admin';
  gdpr_data_processing_consent: boolean;
  gdpr_marketing_consent: boolean;
  selected_plan_code?: string;
  place_id?: number;
}

interface AuthResponse {
  user: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    user_type: 'customer' | 'business_owner' | 'employee' | 'platform_admin';
    is_active: boolean;
    is_owner: boolean;
    is_admin: boolean;
    gdpr_data_processing_consent: boolean;
    gdpr_marketing_consent: boolean;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
}

// Temporary inline types to avoid import issues
export interface PlaceImage {
  id: number;
  place_id: number;
  image_url: string;
  image_alt?: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

export interface Place {
  id: number;
  slug?: string; // Optional until migration is run
  codigo?: string; // Made optional
  nome: string;
  tipo: string; // salon, clinic, office, etc.
  cidade: string;
  regiao: string;
  pais?: string;
  nif?: string;
  estado?: string;
  telefone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  rua?: string;
  porta?: string;
  cod_postal?: string;
  latitude?: number;
  longitude?: number;
  location_type?: 'fixed' | 'mobile';
  coverage_radius?: number;
  created_at?: string;
  owner_id?: number;
  is_bio_diamond?: boolean;
  booking_enabled?: boolean;
  is_active?: boolean;
  about?: string;
  updated_at?: string;
  services?: PlaceService[];
  employees?: PlaceEmployee[];
  images?: PlaceImage[];
  reviews?: {
    average_rating: number;
    total_reviews: number;
  };
  working_hours?: { [key: string]: any };
}

export interface PlaceService {
  id: number;
  place_id: number;
  service_id: number;
  name: string;
  category: string;
  description: string;
  is_bio_diamond: boolean;
  price: number;
  duration: number;
  is_available: boolean;
  created_at: string;
}

export interface PlaceEmployee {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  specialty?: string;
  color_code?: string;
  photo_url?: string;
  is_active: boolean;
  working_hours?: { [key: string]: any };
}

export interface Service {
  id: number;
  name: string;
  category: string;
  description: string;
  is_bio_diamond: boolean;
  usage_count?: number; // For admin views
}

interface SearchFilters {
  search?: string;
  tipo?: string;
  cidade?: string;
  regiao?: string;
  is_bio_diamond?: boolean;
  booking_enabled?: boolean;
}

interface SearchResults {
  places: Place[];
  total: number;
  pages: number;
  current_page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

// Campaign types
export interface CampaignInfo {
  campaign_id: number;
  name: string;
  banner_message: string;
  campaign_type: string;
  discount_type?: string;
  discount_value?: number;
  rewards_multiplier?: number;
  rewards_bonus_points?: number;
}

interface BookingRequest {
  salon_id: number;
  service_id: number;
  employee_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  booking_date: string;
  booking_time: string;
  any_employee_selected?: boolean;
  
  // Campaign fields - optional, included if booking is made during an active campaign
  campaign_id?: number;
  campaign_name?: string;
  campaign_type?: string;
  campaign_discount_type?: string;
  campaign_discount_value?: number;
  campaign_banner_message?: string;
}

interface Booking extends BookingRequest {
  id: number;
  duration: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface AvailabilityResponse {
  available_slots: string[];
  time_slots: TimeSlot[];
  slots_with_campaigns?: Record<string, CampaignInfo[]>;
}

// Use environment variable or relative URL (through nginx proxy)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Backend base URL for images (without /api/v1)
const BACKEND_BASE_URL = API_BASE_URL.replace('/api/v1', '');

console.log('Using API Base URL:', API_BASE_URL);
console.log('Backend Base URL:', BACKEND_BASE_URL);
console.log('Current location:', window.location.href);
console.log('Hostname:', window.location.hostname);

// Helper function to get full image URL
export const getImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  
  // If it's already a full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If it's a relative URL, add the backend base URL
  return `${BACKEND_BASE_URL}${imageUrl}`;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('Making API request to:', config.url);
    console.log('Base URL:', config.baseURL);
    console.log('Full URL:', config.baseURL + config.url);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for debugging, error handling, and token refresh
api.interceptors.response.use(
  (response) => {
    console.log('API response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.error('API error:', error.response?.status, error.response?.statusText, error.config?.url);
    console.error('Error details:', error.message);
    
    // Redirect to Billing on payment required
    if (error.response?.status === 402) {
      const current = window.location.pathname + window.location.search;
      // Avoid redirect loops if already on billing
      if (!current.startsWith('/billing')) {
        window.location.href = '/billing?reason=payment_required';
        return Promise.reject(error);
      }
    }
    
    const originalRequest = error.config;
    
    // Handle token refresh for 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
          const { access_token, refresh_token } = response.data;
          
          localStorage.setItem('auth_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    
    // Handle FastAPI error format
    if (error.response?.data?.detail) {
      error.message = error.response.data.detail;
    }
    
    return Promise.reject(error);
  }
);

export const salonAPI = {
  // Get salons with filters and pagination
  getSalons: async (filters: SearchFilters = {}, page = 1, perPage = 20): Promise<SearchResults> => {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.cidade) params.append('cidade', filters.cidade);
    if (filters.regiao) params.append('regiao', filters.regiao);
    if (filters.is_bio_diamond) params.append('bio_diamond', 'true');
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());
    
    const url = `/salons?${params.toString()}`;
    
    // Debug logging
    if (filters.search) {
      console.log('API call with search:', filters.search);
      console.log('Full URL:', url);
    }
    
    const response = await api.get(url);
    return response.data;
  },

  // Get single salon with services
  getSalon: async (id: number): Promise<Place> => {
    const response = await api.get(`/salons/${id}`);
    return response.data;
  },

  // Get available time slots for a salon on a specific date
  getAvailability: async (salonId: number, date: string, serviceId?: number): Promise<AvailabilityResponse> => {
    let url = `/salons/${salonId}/availability?date=${date}`;
    if (serviceId) {
      url += `&service_id=${serviceId}`;
    }
    const response = await api.get(url);
    return response.data;
  },
};

export const placeAPI = {
  // Get places with filters and pagination
  getPlaces: async (filters: SearchFilters = {}, page = 1, perPage = 20): Promise<SearchResults> => {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.tipo) params.append('tipo', filters.tipo);
    if (filters.cidade) params.append('cidade', filters.cidade);
    if (filters.regiao) params.append('regiao', filters.regiao);
    if (filters.is_bio_diamond) params.append('is_bio_diamond', 'true');
    if (filters.booking_enabled) params.append('booking_enabled', 'true');
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());
    
    const url = `/places?${params.toString()}`;
    
    // Debug logging
    if (filters.search) {
      console.log('API call with search:', filters.search);
      console.log('Full URL:', url);
    }
    
    const response = await api.get(url);
    return response.data;
  },

  // Get single place with services by slug
  getPlace: async (slug: string): Promise<Place> => {
    const response = await api.get(`/places/${slug}`);
    return response.data;
  },

  // Search places by query
  searchPlaces: async (query: string, page = 1, perPage = 20): Promise<SearchResults> => {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());
    
    const url = `/places/search?${params.toString()}`;
    const response = await api.get(url);
    return response.data;
  },

  // Get available time slots for a place on a specific date
  getAvailability: async (placeId: number, date: string, serviceId?: number, employeeId?: number): Promise<AvailabilityResponse> => {
    let url = `/places/${placeId}/availability?date=${date}`;
    if (serviceId) {
      url += `&service_id=${serviceId}`;
    }
    if (employeeId) {
      url += `&employee_id=${employeeId}`;
    }
    const response = await api.get(url);
    return response.data;
  },

  // Get employees who can perform a specific service
  getEmployeesByService: async (placeId: number, serviceId: number): Promise<PlaceEmployee[]> => {
    const response = await api.get(`/places/${placeId}/employees/by-service/${serviceId}`);
    return response.data;
  },

  // Get services that a specific employee can perform
  getServicesByEmployee: async (placeId: number, employeeId: number): Promise<PlaceService[]> => {
    const response = await api.get(`/places/${placeId}/services/by-employee/${employeeId}`);
    return response.data;
  },
};

export const serviceAPI = {
  // Get all services
  getServices: async (bioDiamondOnly = false): Promise<Service[]> => {
    const params = bioDiamondOnly ? '?bio_diamond=true' : '';
    const response = await api.get(`/services${params}`);
    return response.data;
  },
};

export const bookingAPI = {
  // Create a new booking
  createBooking: async (booking: BookingRequest): Promise<{ id: number; message: string }> => {
    const response = await api.post(`/places/${booking.salon_id}/bookings`, booking);
    return response.data;
  },

  // Get booking details
  getBooking: async (id: number): Promise<Booking> => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },
};

export const authAPI = {
  // Login
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Register
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<{ access_token: string; refresh_token: string; token_type: string; expires_in: number }> => {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },

  // Logout
  logout: async (): Promise<{ message: string }> => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Validate token
  validateToken: async (): Promise<{ message: string; is_valid: boolean; user_id?: number }> => {
    const response = await api.get('/auth/validate');
    return response.data;
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Update language preference
  updateLanguagePreference: async (language: string): Promise<{ message: string; language: string }> => {
    const response = await api.patch('/auth/me/language', { language });
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/reset-password', { token, new_password: newPassword });
    return response.data;
  },
};

export const managerAPI = {
  // Get manager's places (migrated to owner API)
  getManagerSalons: async (): Promise<Place[]> => {
    const response = await api.get('/owner/places/');
    return response.data;
  },

  // Create new place (migrated to owner API)
  createSalon: async (placeData: any): Promise<{ id: number; nome: string; message: string }> => {
    const response = await api.post('/owner/places/', placeData);
    return response.data;
  },

  // Get place bookings (migrated to owner API)
  getSalonBookings: async (placeId: number): Promise<Booking[]> => {
    const response = await api.get(`/owner/bookings/places/${placeId}/bookings`);
    return response.data;
  },

  // Get place services (migrated to owner API)
  getSalonServices: async (placeId: number): Promise<PlaceService[]> => {
    const response = await api.get(`/owner/services/places/${placeId}/services`);
    return response.data;
  },

  // Add service to place (migrated to owner API)
  addSalonService: async (placeId: number, serviceData: any): Promise<{ id: number; message: string }> => {
    const response = await api.post(`/owner/services/places/${placeId}/services`, serviceData);
    return response.data;
  },

  // Update place service (migrated to owner API)
  updateSalonService: async (placeId: number, serviceId: number, serviceData: any): Promise<{ message: string }> => {
    const response = await api.put(`/owner/services/${serviceId}`, serviceData);
    return response.data;
  },

  // Delete place service (migrated to owner API)
  deleteSalonService: async (placeId: number, serviceId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/owner/services/${serviceId}`);
    return response.data;
  },

  // Update booking status (migrated to owner API)
  updateBookingStatus: async (bookingId: number, status: string): Promise<{ message: string }> => {
    const response = await api.put(`/owner/bookings/${bookingId}/status`, { status });
    return response.data;
  },

  // Create booking (for managers)
  createBooking: async (bookingData: any): Promise<{ id: number; message: string }> => {
    const response = await api.post('/bookings/', bookingData);
    return response.data;
  },

  // Delete booking (migrated to owner API)
  deleteBooking: async (bookingId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/owner/bookings/${bookingId}`);
    return response.data;
  },

  // Get place opening hours (migrated to owner API)
  getOpeningHours: async (placeId: number): Promise<{ opening_hours: any }> => {
    const response = await api.get(`/owner/places/${placeId}/working-hours`);
    return response.data;
  },

  // Update place opening hours (migrated to owner API)
  updateOpeningHours: async (placeId: number, openingHours: any): Promise<{ message: string }> => {
    const response = await api.put(`/owner/places/${placeId}/working-hours`, { opening_hours: openingHours });
    return response.data;
  },

  // Update place basic information (migrated to owner API)
  updateSalon: async (placeId: number, placeData: any): Promise<{ message: string }> => {
    const response = await api.put(`/owner/places/${placeId}`, placeData);
    return response.data;
  },

};

export const ownerAPI = {
  // Get owner's places - using owner API
  getOwnerPlaces: async (): Promise<Place[]> => {
    const response = await api.get('/owner/places/');
    return response.data; // FastAPI returns data directly
  },

  // Get place services - using complete owner API
  getPlaceServices: async (placeId: number): Promise<PlaceService[]> => {
    const response = await api.get(`/owner/services/places/${placeId}/services`);
    return response.data;
  },

  // Add service to place - using complete owner API
  addPlaceService: async (placeId: number, serviceData: any): Promise<{ id: number; message: string }> => {
    const response = await api.post(`/owner/services/places/${placeId}/services`, serviceData);
    return response.data;
  },

  // Update place service - using complete owner API
  updatePlaceService: async (placeId: number, serviceId: number, serviceData: any): Promise<{ message: string }> => {
    const response = await api.put(`/owner/services/${serviceId}`, serviceData);
    return response.data;
  },

  // Delete place service - using complete owner API
  deletePlaceService: async (placeId: number, serviceId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/owner/services/${serviceId}`);
    return response.data;
  },

  // Dashboard API endpoints
  getDashboardStats: async (): Promise<{
    registered_places: number;
    total_bookings: number;
    active_customers: number;
    recent_bookings: number;
    ongoing_campaigns: number;
    unread_messages: number;
  }> => {
    const response = await api.get('/owner/dashboard/stats');
    return response.data;
  },

  getBookingTrends: async (days: number = 30): Promise<Array<{
    date: string;
    count: number;
  }>> => {
    const response = await api.get(`/owner/dashboard/booking-trends?days=${days}`);
    return response.data;
  },

  getRecentActivity: async (limit: number = 10): Promise<Array<{
    type: string;
    title: string;
    description: string;
    timestamp: string;
    icon: string;
  }>> => {
    const response = await api.get(`/owner/dashboard/recent-activity?limit=${limit}`);
    return response.data;
  },

  getRecentBookings: async (limit: number = 10): Promise<Array<{
    id: number;
    customer_name: string;
    customer_email: string;
    service_name: string;
    booking_date: string;
    status: string;
    place_name: string;
  }>> => {
    const response = await api.get(`/owner/dashboard/recent-bookings?limit=${limit}`);
    return response.data;
  },
};

export const healthAPI = {
  // Health check
  healthCheck: async (): Promise<{ status: string; version: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

// Admin API types
interface AdminUser {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  place_count: number;
  total_bookings: number;
  created_at: string;
}

interface AdminSalon {
  id: number;
  nome: string;
  cidade: string;
  regiao: string;
  telefone?: string;
  email?: string;
  estado: string;
  booking_enabled: boolean;
  is_active: boolean;
  is_bio_diamond: boolean;
  owner?: {
    id: number;
    name: string;
    email: string;
  };
  services_count: number;
  bookings_count?: number;
  services?: Array<{
    id: number;
    name: string;
    category?: string;
    description?: string;
    price: number;
    duration: number;
    is_bio_diamond: boolean;
  }>;
  created_at: string;
}

interface AdminPlaceResponse {
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
  owner: {
    id: number;
    name: string;
    email: string;
  };
  services_count: number;
  bookings_count: number;
  created_at: string;
}

interface AdminBookingResponse {
  id: number;
  place_name: string;
  owner_name: string;
  customer_name: string;
  customer_email: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  created_at: string;
}

interface AdminCampaignResponse {
  id: number;
  name: string;
  description?: string;
  target_audience: 'existing_owners' | 'new_owners' | 'both';
  channels: string[];
  content: string;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  analytics?: {
    opens: number;
    clicks: number;
    conversions: number;
    reach: number;
    engagement_rate: number;
  };
}

interface AdminMessageResponse {
  id: number;
  subject: string;
  content: string;
  sender_id: number;
  sender_name: string;
  is_urgent: boolean;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
  recipients: Array<{
    owner_id: number;
    owner_name: string;
    status: string;
  }>;
}

interface AdminMessageThreadResponse {
  message: AdminMessageResponse;
  replies: Array<{
    id: number;
    sender_owner_id: number;
    sender_name: string;
    content: string;
    created_at: string;
  }>;
  total_recipients: number;
  read_count: number;
  reply_count: number;
}

interface AdminStats {
  users: {
    total: number;
    active: number;
    admins: number;
  };
  places: {
    total: number;
    active: number;
    booking_enabled: number;
    total_services: number;
    bio_diamond: number;
  };
  bookings: {
    total: number;
    recent_week: number;
  };
  time_period: string;
  generated_at: string;
}

export const adminAPI = {
  // Get all owners with pagination
  getOwners: async (page = 1, perPage = 20, search?: string, statusFilter?: string): Promise<{
    items: AdminUser[];
    total: number;
    pages: number;
    page: number;
    per_page: number;
    has_next: boolean;
    has_prev: boolean;
  }> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());
    if (search) params.append('search', search);
    if (statusFilter) params.append('status_filter', statusFilter);
    
    const response = await api.get(`/admin/owners/?${params.toString()}`);
    return response.data;
  },

  // Get owner details with places
  getOwnerDetails: async (ownerId: number): Promise<{
    user: AdminUser;
    places: Array<{
      id: number;
      nome: string;
      tipo: string;
      cidade: string;
      regiao: string;
      is_active: boolean;
      booking_enabled: boolean;
      is_bio_diamond: boolean;
      bookings_count: number;
      services_count: number;
      created_at: string;
    }>;
    total_places: number;
    total_bookings: number;
    total_services: number;
    bio_diamond_places: number;
  }> => {
    const response = await api.get(`/admin/owners/${ownerId}`);
    return response.data;
  },

  // Toggle owner status
  toggleOwnerStatus: async (ownerId: number): Promise<{
    message: string;
    is_active: boolean;
  }> => {
    const response = await api.put(`/admin/owners/${ownerId}/toggle-status`);
    return response.data;
  },

  // Get owner's places
  getOwnerPlaces: async (ownerId: number): Promise<{
    owner_id: number;
    owner_name: string;
    places: Array<{
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
    }>;
    total_places: number;
  }> => {
    const response = await api.get(`/admin/owners/${ownerId}/places`);
    return response.data;
  },

  // Get all places with pagination
  getPlaces: async (page = 1, perPage = 20, search?: string, ownerId?: number, tipo?: string, cidade?: string, statusFilter?: string): Promise<{
    items: AdminPlaceResponse[];
    total: number;
    pages: number;
    page: number;
    per_page: number;
    has_next: boolean;
    has_prev: boolean;
  }> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());
    if (search) params.append('search', search);
    if (ownerId) params.append('owner_id', ownerId.toString());
    if (tipo) params.append('tipo', tipo);
    if (cidade) params.append('cidade', cidade);
    if (statusFilter) params.append('status_filter', statusFilter);
    
    const response = await api.get(`/admin/places?${params.toString()}`);
    return response.data;
  },

  // Get place details
  getPlaceDetails: async (placeId: number): Promise<{
    place: {
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
      created_at: string;
    };
    owner: {
      id: number;
      name: string;
      email: string;
    };
    statistics: {
      bookings_count: number;
      services_count: number;
    };
    recent_bookings: Array<{
      id: number;
      customer_name: string;
      customer_email: string;
      service_name: string;
      booking_date: string;
      booking_time: string;
      status: string;
      created_at: string;
    }>;
  }> => {
    const response = await api.get(`/admin/places/${placeId}`);
    return response.data;
  },

  // Toggle place booking status
  togglePlaceBooking: async (placeId: number): Promise<{
    message: string;
    booking_enabled: boolean;
  }> => {
    const response = await api.put(`/admin/places/${placeId}/toggle-booking`);
    return response.data;
  },

  // Toggle place status
  togglePlaceStatus: async (placeId: number): Promise<{
    message: string;
    is_active: boolean;
  }> => {
    const response = await api.put(`/admin/places/${placeId}/toggle-status`);
    return response.data;
  },

  // Toggle place BIO Diamond status
  togglePlaceBioDiamond: async (placeId: number): Promise<{
    message: string;
    is_bio_diamond: boolean;
  }> => {
    const response = await api.put(`/admin/places/${placeId}/toggle-bio-diamond`);
    return response.data;
  },

  // Update place configuration
  updatePlaceConfiguration: async (placeId: number, configData: {
    working_hours?: any;
    settings?: any;
    features?: any;
  }): Promise<{
    message: string;
    place_id: number;
    updated_at: string;
  }> => {
    const response = await api.put(`/admin/places/${placeId}/configuration`, configData);
    return response.data;
  },

  // Get platform-wide bookings
  getBookings: async (page = 1, perPage = 20, ownerId?: number, placeId?: number, statusFilter?: string, dateFrom?: string, dateTo?: string): Promise<{
    items: AdminBookingResponse[];
    total: number;
    pages: number;
    page: number;
    per_page: number;
    has_next: boolean;
    has_prev: boolean;
  }> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());
    if (ownerId) params.append('owner_id', ownerId.toString());
    if (placeId) params.append('place_id', placeId.toString());
    if (statusFilter) params.append('status_filter', statusFilter);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    const response = await api.get(`/admin/bookings?${params.toString()}`);
    return response.data;
  },

  // Get booking statistics
  getBookingStats: async (timePeriod = 'month'): Promise<{
    total_bookings: number;
    by_place: Array<{
      place_id: number;
      place_name: string;
      booking_count: number;
    }>;
    by_owner: Array<{
      owner_id: number;
      owner_name: string;
      booking_count: number;
    }>;
    by_status: { [status: string]: number };
    recent_trends: Array<{
      date: string;
      count: number;
    }>;
  }> => {
    const response = await api.get(`/admin/bookings/stats?time_period=${timePeriod}`);
    return response.data;
  },

  // Export bookings
  exportBookings: async (ownerId?: number, placeId?: number, dateFrom?: string, dateTo?: string): Promise<{
    data: Array<{
      booking_id: number;
      customer_name: string;
      customer_email: string;
      customer_phone?: string;
      service_name: string;
      booking_date: string;
      booking_time: string;
      status: string;
      place_name: string;
      place_city: string;
      owner_name: string;
      owner_email: string;
      created_at: string;
    }>;
    total_records: number;
    exported_at: string;
    filters_applied: {
      owner_id?: number;
      place_id?: number;
      date_from?: string;
      date_to?: string;
    };
  }> => {
    const params = new URLSearchParams();
    if (ownerId) params.append('owner_id', ownerId.toString());
    if (placeId) params.append('place_id', placeId.toString());
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    const response = await api.get(`/admin/bookings/export?${params.toString()}`);
    return response.data;
  },

  // Get admin dashboard statistics
  getStats: async (timePeriod = 'all'): Promise<{
    users: {
      total: number;
      active: number;
      admins: number;
    };
    places: {
      total: number;
      active: number;
      booking_enabled: number;
      total_services: number;
      bio_diamond: number;
    };
    bookings: {
      total: number;
      recent_week: number;
    };
    time_period: string;
    generated_at: string;
  }> => {
    const response = await api.get(`/admin/stats?time_period=${timePeriod}`);
    return response.data;
  },

  // Get platform trends
  getTrends: async (days = 30): Promise<{
    booking_trends: Array<{
      date: string;
      bookings: number;
    }>;
    registration_trends: Array<{
      date: string;
      registrations: number;
    }>;
    period_days: number;
    start_date: string;
    end_date: string;
  }> => {
    const response = await api.get(`/admin/stats/trends?days=${days}`);
    return response.data;
  },

  // Campaign management
  getCampaigns: async (page = 1, perPage = 20, statusFilter?: string): Promise<{
    items: AdminCampaignResponse[];
    total: number;
    pages: number;
    page: number;
    per_page: number;
    has_next: boolean;
    has_prev: boolean;
  }> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());
    if (statusFilter) params.append('status_filter', statusFilter);
    
    const response = await api.get(`/admin/campaigns?${params.toString()}`);
    return response.data;
  },

  createCampaign: async (campaignData: {
    name: string;
    description?: string;
    target_audience: 'existing_owners' | 'new_owners' | 'both';
    channels: string[];
    content: string;
    scheduled_at?: string;
    is_active?: boolean;
  }): Promise<AdminCampaignResponse> => {
    const response = await api.post('/admin/campaigns', campaignData);
    return response.data;
  },

  getCampaignDetails: async (campaignId: number): Promise<AdminCampaignResponse> => {
    const response = await api.get(`/admin/campaigns/${campaignId}`);
    return response.data;
  },

  updateCampaign: async (campaignId: number, campaignData: {
    name?: string;
    description?: string;
    target_audience?: 'existing_owners' | 'new_owners' | 'both';
    channels?: string[];
    content?: string;
    scheduled_at?: string;
    is_active?: boolean;
  }): Promise<AdminCampaignResponse> => {
    const response = await api.put(`/admin/campaigns/${campaignId}`, campaignData);
    return response.data;
  },

  deleteCampaign: async (campaignId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/campaigns/${campaignId}`);
    return response.data;
  },

  getCampaignAnalytics: async (campaignId: number): Promise<{
    campaign_id: number;
    metrics: {
      opens: number;
      clicks: number;
      conversions: number;
      reach: number;
      engagement_rate: number;
    };
    message: string;
  }> => {
    const response = await api.get(`/admin/campaigns/${campaignId}/analytics`);
    return response.data;
  },

  // Admin messaging
  getAdminMessages: async (page = 1, perPage = 20, statusFilter?: string): Promise<{
    items: AdminMessageResponse[];
    total: number;
    pages: number;
    page: number;
    per_page: number;
    has_next: boolean;
    has_prev: boolean;
  }> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());
    if (statusFilter) params.append('status_filter', statusFilter);
    
    const response = await api.get(`/admin/messages?${params.toString()}`);
    return response.data;
  },

  sendAdminMessage: async (messageData: {
    subject: string;
    content: string;
    recipient_owner_ids: number[];
    is_urgent?: boolean;
    scheduled_at?: string;
  }): Promise<AdminMessageResponse> => {
    const response = await api.post('/admin/messages', messageData);
    return response.data;
  },

  getMessageThread: async (messageId: number): Promise<AdminMessageThreadResponse> => {
    const response = await api.get(`/admin/messages/${messageId}`);
    return response.data;
  },

  markMessageRead: async (messageId: number): Promise<{
    message: string;
    message_id: number;
    read_at: string;
  }> => {
    const response = await api.put(`/admin/messages/${messageId}/read`);
    return response.data;
  },

  getMessagingStats: async (): Promise<{
    total_messages: number;
    sent_messages: number;
    scheduled_messages: number;
    total_recipients: number;
    read_messages: number;
    replied_messages: number;
    unread_count: number;
    message: string;
  }> => {
    const response = await api.get('/admin/messages/stats/overview');
    return response.data;
  },

  // Legacy methods for backward compatibility (renamed from salons to places)
  getUsers: async (page = 1, perPage = 20): Promise<{
    users: AdminUser[];
    total: number;
    pages: number;
    current_page: number;
  }> => {
    const ownersData = await adminAPI.getOwners(page, perPage);
    return {
      users: ownersData.items,
      total: ownersData.total,
      pages: ownersData.pages,
      current_page: ownersData.page
    };
  },

  getUserDetails: async (userId: number): Promise<{
    user: AdminUser;
    salons: AdminSalon[];
  }> => {
    const ownerData = await adminAPI.getOwnerDetails(userId);
    return {
      user: ownerData.user,
      salons: ownerData.places.map(place => ({
        id: place.id,
        nome: place.nome,
        cidade: place.cidade,
        regiao: place.regiao,
        telefone: undefined,
        email: undefined,
        estado: '',
        booking_enabled: place.booking_enabled,
        is_active: place.is_active,
        is_bio_diamond: place.is_bio_diamond,
        owner: {
          id: 0,
          name: '',
          email: ''
        },
        services_count: place.services_count,
        created_at: place.created_at
      }))
    };
  },

  toggleUserStatus: async (userId: number): Promise<{
    message: string;
    is_active: boolean;
  }> => {
    return await adminAPI.toggleOwnerStatus(userId);
  },

  getSalons: async (page = 1, perPage = 20): Promise<{
    salons: AdminSalon[];
    total: number;
    pages: number;
    current_page: number;
  }> => {
    const placesData = await adminAPI.getPlaces(page, perPage);
    return {
      salons: placesData.items.map(place => ({
        id: place.id,
        nome: place.nome,
        cidade: place.cidade,
        regiao: place.regiao,
        telefone: place.telefone,
        email: place.email,
        estado: place.estado,
        booking_enabled: place.booking_enabled,
        is_active: place.is_active,
        is_bio_diamond: place.is_bio_diamond,
        owner: place.owner,
        services_count: place.services_count,
        created_at: place.created_at
      })),
      total: placesData.total,
      pages: placesData.pages,
      current_page: placesData.page
    };
  },

  toggleSalonBooking: async (salonId: number): Promise<{
    message: string;
    booking_enabled: boolean;
  }> => {
    return await adminAPI.togglePlaceBooking(salonId);
  },

  toggleSalonStatus: async (salonId: number): Promise<{
    message: string;
    is_active: boolean;
  }> => {
    return await adminAPI.togglePlaceStatus(salonId);
  },

  toggleSalonBioDiamond: async (salonId: number): Promise<{
    message: string;
    is_bio_diamond: boolean;
  }> => {
    return await adminAPI.togglePlaceBioDiamond(salonId);
  },

  // Service management (legacy)
  getServices: async (): Promise<Service[]> => {
    const response = await api.get('/admin/services');
    return response.data;
  },

  getServiceDetails: async (serviceId: number): Promise<{
    service: Service;
    salons: Array<{
      id: number;
      nome: string;
      cidade: string;
      regiao: string;
      price: number;
      duration: number;
    }>;
  }> => {
    const response = await api.get(`/admin/services/${serviceId}`);
    return response.data;
  },

  createService: async (serviceData: {
    name: string;
    category?: string;
    description?: string;
    is_bio_diamond?: boolean;
  }): Promise<{ id: number; message: string }> => {
    const response = await api.post('/admin/services', serviceData);
    return response.data;
  },

  updateService: async (serviceId: number, serviceData: {
    name?: string;
    category?: string;
    description?: string;
    is_bio_diamond?: boolean;
  }): Promise<{ message: string }> => {
    const response = await api.put(`/admin/services/${serviceId}`, serviceData);
    return response.data;
  },

  deleteService: async (serviceId: number, confirm: boolean = false): Promise<{
    message: string;
    requires_confirmation?: boolean;
    affected_salons?: Array<{ id: number; nome: string; cidade: string }>;
    deleted_from_salons?: number;
  }> => {
    const response = await api.delete(`/admin/services/${serviceId}?confirm=${confirm}`);
    return response.data;
  },
};

// Image Management API
export const imageAPI = {
  // Get all images for a place
  getPlaceImages: async (placeId: number): Promise<{ images: PlaceImage[] }> => {
    const response = await api.get(`/places/${placeId}/images`);
    return response.data;
  },

  // Add a new image to a place
  addPlaceImage: async (placeId: number, imageData: {
    image_url: string;
    image_alt?: string;
    is_primary?: boolean;
    display_order?: number;
  }): Promise<PlaceImage> => {
    const response = await api.post(`/places/${placeId}/images`, imageData);
    return response.data;
  },

  // Update a place image
  updatePlaceImage: async (placeId: number, imageId: number, imageData: {
    image_url?: string;
    image_alt?: string;
    is_primary?: boolean;
    display_order?: number;
  }): Promise<PlaceImage> => {
    const response = await api.put(`/places/${placeId}/images/${imageId}`, imageData);
    return response.data;
  },

  // Delete a place image
  deletePlaceImage: async (placeId: number, imageId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/places/${placeId}/images/${imageId}`);
    return response.data;
  },

  // Legacy salon aliases for backward compatibility
  getSalonImages: async (salonId: number): Promise<{ images: PlaceImage[] }> => {
    return imageAPI.getPlaceImages(salonId);
  },
  addSalonImage: async (salonId: number, imageData: any): Promise<PlaceImage> => {
    return imageAPI.addPlaceImage(salonId, imageData);
  },
  updateSalonImage: async (salonId: number, imageId: number, imageData: any): Promise<PlaceImage> => {
    return imageAPI.updatePlaceImage(salonId, imageId, imageData);
  },
  deleteSalonImage: async (salonId: number, imageId: number): Promise<{ message: string }> => {
    return imageAPI.deletePlaceImage(salonId, imageId);
  },
};

// Campaign types
export interface ActiveCampaign {
  id: number;
  name: string;
  banner_message: string;
  campaign_type: 'price_reduction' | 'rewards_increase' | 'free_service';
  end_datetime: string;
  discount_type?: 'percentage' | 'fixed_amount';
  discount_value?: number;
  rewards_multiplier?: number;
  rewards_bonus_points?: number;
  free_service_type?: 'specific_free' | 'buy_x_get_y';
  buy_quantity?: number;
  get_quantity?: number;
  days_remaining?: number;
}

export interface ServicePriceCalculation {
  service_id: number;
  place_service_id?: number;
  original_price: number;
  discounted_price: number;
  discount_amount: number;
  discount_percentage?: number;
  applied_campaigns: number[];
  is_free: boolean;
  free_reason?: string;
}

// Campaign API
export const campaignAPI = {
  // Get active campaigns for a place
  getActiveCampaigns: async (placeId: number): Promise<ActiveCampaign[]> => {
    const response = await api.get(`/campaigns/active/place/${placeId}`);
    return response.data;
  },

  // Calculate service price with campaigns
  calculateServicePrice: async (placeId: number, serviceId: number, placeServiceId?: number): Promise<ServicePriceCalculation> => {
    const params = new URLSearchParams();
    if (placeServiceId) params.append('place_service_id', placeServiceId.toString());
    
    const response = await api.get(`/campaigns/price/place/${placeId}/service/${serviceId}?${params}`);
    return response.data;
  },

  // Calculate all service prices for a place
  calculateAllServicePrices: async (placeId: number): Promise<ServicePriceCalculation[]> => {
    const response = await api.get(`/campaigns/price/place/${placeId}/services`);
    return response.data;
  },

  // Calculate rewards points with campaigns
  calculateRewardsPoints: async (placeId: number, basePoints: number): Promise<{
    base_points: number;
    final_points: number;
    multiplier: number;
    bonus_points: number;
    applied_campaigns: number[];
  }> => {
    const response = await api.get(`/campaigns/rewards/place/${placeId}/calculate?base_points=${basePoints}`);
    return response.data;
  },
};

// Customer API
export const customerAPI = {
  // Get all bookings
  getBookings: async (): Promise<any[]> => {
    const response = await api.get('/customer/bookings');
    return response.data;
  },

  // Get upcoming bookings
  getUpcomingBookings: async (): Promise<any[]> => {
    const response = await api.get('/customer/bookings/upcoming');
    return response.data;
  },

  // Get past bookings
  getPastBookings: async (): Promise<any[]> => {
    const response = await api.get('/customer/bookings/past');
    return response.data;
  },

  // Cancel a booking
  cancelBooking: async (bookingId: number): Promise<{ message: string; booking_id: number }> => {
    const response = await api.put(`/customer/bookings/${bookingId}/cancel`);
    return response.data;
  },

  // Get rewards (placeholder)
  getRewards: async (): Promise<any> => {
    const response = await api.get('/customer/rewards');
    return response.data;
  },

  // Get rewards for a specific place
  getRewardsByPlace: async (placeId: number): Promise<any> => {
    const response = await api.get(`/customer/rewards/${placeId}`);
    return response.data;
  },

  // Opt-in to rewards program
  optInToRewards: async (placeId: number): Promise<any> => {
    const response = await api.post(`/customer/rewards/${placeId}/opt-in`);
    return response.data;
  },

  // Opt-out of rewards program
  optOutOfRewards: async (placeId: number): Promise<any> => {
    const response = await api.delete(`/customer/rewards/${placeId}/opt-out`);
    return response.data;
  },
};

export default api;

// Billing API
export const billingAPI = {
  createSubscription: async (planCode: 'basic' | 'pro'): Promise<{ clientSecret?: string; subscriptionId: string; trialStarted?: boolean }> => {
    const response = await api.post('/billing/create-subscription', { planCode });
    return response.data;
  },
  getSubscription: async (): Promise<{ subscriptionId?: string; status?: string; planCode?: 'basic' | 'pro' | string }> => {
    const response = await api.get('/billing/subscription');
    return response.data;
  },
  changePlan: async (planCode: 'basic' | 'pro'): Promise<{ status: string; subscriptionId?: string; requiresPayment?: boolean; checkoutUrl?: string }> => {
    const response = await api.post('/billing/change-plan', { planCode });
    return response.data;
  },
  getPortalLink: async (): Promise<{ url: string }> => {
    const response = await api.get('/billing/portal-link');
    return response.data;
  },
  createSetupIntent: async (): Promise<{ clientSecret: string }> => {
    const response = await api.post('/billing/create-setup-intent');
    return response.data;
  },
  getPlans: async (): Promise<{ plans: Array<{ id: number; code: string; name: string; price_cents: number; currency: string; trial_days: number; features: any[] }> }> => {
    const response = await api.get('/subscriptions/plans');
    return response.data;
  },
};
