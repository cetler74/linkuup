/**
 * Business Owner API Client
 * Provides React Query hooks and API functions for business owner administration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Re-export time-off types for backward compatibility
export type { EmployeeTimeOff, TimeOffCreate, TimeOffUpdate, TimeOffStatusUpdate } from '../types/timeOff';
import type { EmployeeTimeOff, TimeOffCreate, TimeOffUpdate, TimeOffStatusUpdate } from '../types/timeOff';

// Re-export messaging campaign types - temporarily inline to debug import issue
export interface MessagingCustomer {
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  gdpr_marketing_consent: boolean;
  last_booking_date?: string;
  total_bookings: number;
  is_selected: boolean;
}

export interface CampaignRecipient {
  id: number;
  campaign_id: number;
  user_id: number;
  customer_email?: string;
  customer_phone?: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  sent_at?: string;
  delivery_status?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface MessagingStats {
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  delivery_rate: number;
  email_count: number;
  whatsapp_count: number;
  last_sent_at?: string;
}

export interface MessagingConfig {
  channels: ('email' | 'whatsapp')[];
  email_subject?: string;
  email_body?: string;
  whatsapp_message?: string;
  scheduled_send_time?: string;
  send_immediately: boolean;
}

// Types
export interface Place {
  id: number;
  name: string;
  sector: string;
  description?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  location_type: 'fixed' | 'mobile';
  service_areas?: string[];
  booking_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  // Include backend-provided working hours for the place
  working_hours?: { [key: string]: any };
}

export interface Service {
  id: number;
  business_id: number;
  name: string;
  description?: string;
  price?: number;
  duration?: number;
  is_bookable: boolean;
  is_active: boolean;
  assigned_employees?: string[];
}

export interface Employee {
  id: number;
  business_id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  specialty?: string;
  color_code?: string;
  photo_url?: string;
  is_active: boolean;
  working_hours?: { [key: string]: any };
  services?: number[];
  created_at: string;
}

export interface ClosedPeriod {
  id: number;
  place_id?: number;
  business_id?: number;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  is_full_day: boolean;
  half_day_period?: 'AM' | 'PM';
  is_recurring: boolean;
  recurrence_pattern?: { [key: string]: any };
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  business_id: number;
  service_id: number;
  employee_id?: number;
  employee_name?: string;
  employee_photo_url?: string;
  employee_color_code?: string;
  service_name?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  booking_date: string;
  booking_time: string;
  duration?: number;
  status: string;
  color_code?: string;
  is_recurring: boolean;
  recurrence_pattern?: { [key: string]: any };
  reminder_sent: boolean;
  created_at: string;
}

export interface Campaign {
  id: number;
  owner_id: number;
  name: string;
  description?: string;
  banner_message: string;
  campaign_type: 'price_reduction' | 'rewards_increase' | 'free_service';
  start_datetime: string;
  end_datetime: string;
  discount_type?: 'percentage' | 'fixed_amount';
  discount_value?: number;
  rewards_multiplier?: number;
  rewards_bonus_points?: number;
  free_service_type?: 'specific_free' | 'buy_x_get_y';
  buy_quantity?: number;
  get_quantity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  places?: Array<{ id: number; nome: string; cidade?: string }>;
  services?: Array<{ id: number; name: string; category?: string }>;
  is_currently_active?: boolean;
  days_remaining?: number;
}

export interface Message {
  id: number;
  business_id: number;
  customer_name?: string;
  customer_email?: string;
  sender_type: string;
  message_type: string;
  subject?: string;
  content: string;
  is_read: boolean;
  read_at?: string;
  parent_message_id?: number;
  attachments?: any;
  created_at: string;
}

export interface DashboardStats {
  registered_places: number;
  total_bookings: number;
  active_customers: number;
  ongoing_campaigns: number;
  unread_messages: number;
}

// API Base Configuration
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/owner`;

// Authentication helper functions
export const checkAuthStatus = () => {
  const token = localStorage.getItem('auth_token');
  const refreshToken = localStorage.getItem('refresh_token');
  
  console.log('🔐 Auth Status Check:');
  console.log('  - Token exists:', !!token);
  console.log('  - Refresh token exists:', !!refreshToken);
  console.log('  - Token preview:', token ? `${token.substring(0, 20)}...` : 'None');
  
  return {
    hasToken: !!token,
    hasRefreshToken: !!refreshToken,
    token: token,
    refreshToken: refreshToken
  };
};

export const clearAuthTokens = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  console.log('🧹 Auth tokens cleared');
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  console.log('🔐 getAuthHeaders - Token:', token ? `${token.substring(0, 20)}...` : 'No token found');
  
  if (!token) {
    console.warn('⚠️ No auth token found in localStorage');
    throw new Error('No authentication token found. Please log in again.');
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Custom error class for feature availability errors
export class FeatureNotAvailableError extends Error {
  feature: string;
  
  constructor(feature: string, message?: string) {
    super(message || `Feature "${feature}" is not available. Please upgrade your plan to access this feature.`);
    this.name = 'FeatureNotAvailableError';
    this.feature = feature;
  }
}

// Custom error class for limit reached errors
export class LimitReachedError extends Error {
  feature: string;
  currentCount: number;
  limit: number;
  
  constructor(feature: string, currentCount: number, limit: number, message?: string) {
    super(message || `You have reached the limit of ${limit} ${feature}. Please upgrade your plan to add more.`);
    this.name = 'LimitReachedError';
    this.feature = feature;
    this.currentCount = currentCount;
    this.limit = limit;
  }
}

// Helper function for error handling
const handleApiError = async (response: Response, defaultMessage: string) => {
  if (!response.ok) {
    console.error('🚨 API Error Details:', {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    let errorData;
    try {
      errorData = await response.json();
    } catch (jsonError) {
      // If JSON parsing fails, throw generic error
      console.error('🚨 Failed to parse error response as JSON:', jsonError);
      throw new Error(defaultMessage);
    }
    
    console.error('🚨 Error Response Body:', errorData);
    console.error('🚨 Error Details:', JSON.stringify(errorData, null, 2));
    
    const errorDetail = Array.isArray(errorData.detail) 
      ? errorData.detail.join(', ') 
      : (errorData.detail || defaultMessage);
    
    // Check if this is a limit_reached error
    // Handle "limit_reached: employees current=X limit=Y" format
    if (typeof errorDetail === 'string') {
      const limitMatch = errorDetail.match(/limit_reached:?\s*(\w+)(?:\s+current=(\d+))?(?:\s+limit=(\d+))?/);
      if (limitMatch) {
        const featureName = limitMatch[1] || 'feature';
        const currentCount = limitMatch[2] ? parseInt(limitMatch[2], 10) : 0;
        const limit = limitMatch[3] ? parseInt(limitMatch[3], 10) : 0;
        
        console.log('🚨 Detected limit_reached error for feature:', featureName, `current=${currentCount} limit=${limit}`);
        
        const limitError = new LimitReachedError(
          featureName,
          currentCount,
          limit,
          `You have reached your ${featureName} limit (${limit}). Please upgrade your plan to add more ${featureName}.`
        );
        
        console.log('🚨 Throwing LimitReachedError:', limitError);
        throw limitError;
      }
      
      // Check if this is a feature_not_available error
      // Handle both "feature_not_available: employees" and "feature_not_available:employees" formats
      const featureMatch = errorDetail.match(/feature_not_available:?\s*(\w+)/);
      if (featureMatch) {
        const featureName = featureMatch[1] || 'feature';
        
        console.log('🚨 Detected feature_not_available error for feature:', featureName);
        
        const featureError = new FeatureNotAvailableError(
          featureName,
          `The "${featureName}" feature is not available with your current plan. Please upgrade to access this feature.`
        );
        
        console.log('🚨 Throwing FeatureNotAvailableError:', featureError, 'feature:', featureError.feature);
        throw featureError;
      }
    }
    
    // If not a feature error, throw regular error
    throw new Error(errorDetail);
  }
};

// API Functions
export const ownerApi = {
  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch dashboard stats');
    return response.json();
  },

  getDashboardOverview: async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch dashboard overview');
    const result = await response.json();
    return result.success ? result.data : {};
  },

  // Places
  getPlaces: async (): Promise<Place[]> => {
    const response = await fetch(`${API_BASE_URL}/places/`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch places');
    const placesData = await response.json();
    
    // Transform Portuguese field names to English field names
    return placesData.map((place: any) => ({
      id: place.id,
      name: place.nome,
      city: place.cidade,
      location_type: place.location_type || 'fixed', // Read from API response, default to 'fixed' if not present
      service_areas: place.service_areas || [],
      address: place.rua,
      postal_code: place.cod_postal,
      phone: place.telefone,
      email: place.email,
      booking_enabled: place.booking_enabled,
      is_active: place.is_active,
      created_at: place.created_at,
      updated_at: place.updated_at,
      // Pass through working hours from backend list response if present
      working_hours: place.working_hours
    }));
  },

  getPlace: async (id: number): Promise<Place> => {
    const response = await fetch(`${API_BASE_URL}/places/${id}`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch place');
    return response.json();
  },

  createPlace: async (data: Partial<Place>): Promise<Place> => {
    const response = await fetch(`${API_BASE_URL}/places/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    await handleApiError(response, 'Failed to create place');
    return response.json();
  },

  updatePlace: async (id: number, data: Partial<Place>): Promise<Place> => {
    const response = await fetch(`${API_BASE_URL}/places/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    await handleApiError(response, 'Failed to update place');
    return response.json();
  },

  deletePlace: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/places/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to delete place');
  },

  updatePlaceLocation: async (id: number, data: { location_type: string; service_areas?: string[] }): Promise<Place> => {
    const response = await fetch(`${API_BASE_URL}/places/${id}/location`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    await handleApiError(response, 'Failed to update place location');
    return response.json();
  },

  // Services
  getPlaceServices: async (placeId: number): Promise<Service[]> => {
    const response = await fetch(`${API_BASE_URL}/services/places/${placeId}/services`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch services');
    return response.json();
  },

  createService: async (placeId: number, data: Partial<Service>): Promise<Service> => {
    const response = await fetch(`${API_BASE_URL}/services/places/${placeId}/services`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    await handleApiError(response, 'Failed to create service');
    return response.json();
  },

  getService: async (id: number): Promise<Service> => {
    const response = await fetch(`${API_BASE_URL}/services/${id}`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch service');
    return response.json();
  },

  updateService: async (id: number, data: Partial<Service>): Promise<Service> => {
    const response = await fetch(`${API_BASE_URL}/services/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    await handleApiError(response, 'Failed to update service');
    return response.json();
  },

  deleteService: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/services/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to delete service');
  },

  assignEmployeeToService: async (serviceId: number, employeeId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/services/${serviceId}/employees`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ employee_id: employeeId }),
    });
    await handleApiError(response, 'Failed to assign employee');
  },

  removeEmployeeFromService: async (serviceId: number, employeeId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/services/${serviceId}/employees/${employeeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to remove employee');
  },

  // Employees
  getPlaceEmployees: async (placeId: number): Promise<Employee[]> => {
    const response = await fetch(`${API_BASE_URL}/employees/places/${placeId}/employees`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch employees');
    return response.json();
  },

  createEmployee: async (placeId: number, data: Partial<Employee>): Promise<Employee> => {
    const response = await fetch(`${API_BASE_URL}/employees/places/${placeId}/employees`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    await handleApiError(response, 'Failed to create employee');
    return response.json();
  },

  getEmployee: async (id: number): Promise<Employee> => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch employee');
    return response.json();
  },

  updateEmployee: async (id: number, data: Partial<Employee>): Promise<Employee> => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    await handleApiError(response, 'Failed to update employee');
    return response.json();
  },

  deleteEmployee: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to delete employee');
  },

  getEmployeeWorkingHours: async (id: number): Promise<{ working_hours: any }> => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}/hours`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch working hours');
    return response.json();
  },

  updateEmployeeWorkingHours: async (id: number, workingHours: any): Promise<Employee> => {
    const response = await fetch(`${API_BASE_URL}/employees/${id}/hours`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ working_hours: workingHours }),
    });
    await handleApiError(response, 'Failed to update working hours');
    return response.json();
  },

  assignEmployeeServices: async (employeeId: number, serviceIds: number[]): Promise<{ message: string; services: number[] }> => {
    const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/services`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ service_ids: serviceIds }),
    });
    await handleApiError(response, 'Failed to assign services to employee');
    return response.json();
  },

  getEmployeeServices: async (employeeId: number): Promise<{ services: Service[] }> => {
    const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/services`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch employee services');
    return response.json();
  },

  // Bookings
  getPlaceBookings: async (placeId: number, params?: { start_date?: string; end_date?: string; status?: string; employee_id?: number }): Promise<Booking[]> => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.append('date_from', params.start_date);
    if (params?.end_date) searchParams.append('date_to', params.end_date);
    if (params?.status) searchParams.append('status_filter', params.status);
    if (params?.employee_id) searchParams.append('employee_id', params.employee_id.toString());

    const response = await fetch(`${API_BASE_URL}/bookings/places/${placeId}/bookings?${searchParams}`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch bookings');
    return response.json();
  },

  createBooking: async (data: Partial<Booking>): Promise<Booking> => {
    // Extract place_id from business_id (used in URL) and remove it from body
    const placeId = (data as any).business_id || (data as any).place_id;
    const { business_id, place_id, ...bodyData } = data as any;
    
    console.log('📝 createBooking - Data:', bodyData);
    console.log('📝 createBooking - URL:', `${API_BASE_URL}/bookings/places/${placeId}/bookings`);
    
    try {
      const headers = getAuthHeaders();
      console.log('📝 createBooking - Headers:', headers);
      
      const response = await fetch(`${API_BASE_URL}/bookings/places/${placeId}/bookings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyData),
      });
      
      console.log('📝 createBooking - Response status:', response.status);
      console.log('📝 createBooking - Response headers:', Object.fromEntries(response.headers.entries()));
      
      await handleApiError(response, 'Failed to create booking');
      return response.json();
    } catch (error) {
      console.error('📝 createBooking - Error:', error);
      throw error;
    }
  },

  updateBooking: async (id: number, data: Partial<Booking>): Promise<Booking> => {
    const url = `${API_BASE_URL}/bookings/${id}`;
    const headers = getAuthHeaders();
    console.log('🔧 updateBooking:', { url, headers, data });
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    
    console.log('📡 updateBooking response:', { 
      status: response.status, 
      statusText: response.statusText,
      ok: response.ok 
    });
    
    await handleApiError(response, 'Failed to update booking');
    return response.json();
  },

  cancelBooking: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to cancel booking');
  },

  acceptBooking: async (id: number): Promise<void> => {
    const url = `${API_BASE_URL}/bookings/${id}/accept`;
    const headers = getAuthHeaders();
    console.log('🔧 acceptBooking:', { url, headers });

    const response = await fetch(url, {
      method: 'PUT',
      headers,
    });

    console.log('📡 acceptBooking response:', { 
      status: response.status, 
      statusText: response.statusText,
      ok: response.ok 
    });
    
    await handleApiError(response, 'Failed to accept booking');
  },

  assignEmployeeToBooking: async (bookingId: number, employeeId: number): Promise<Booking> => {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/assign-employee`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ employee_id: employeeId }),
    });
    await handleApiError(response, 'Failed to assign employee');
    return response.json();
  },

  createRecurringBooking: async (data: Partial<Booking> & { recurrence_pattern: any; recurrence_end_date?: string }): Promise<Booking> => {
    const response = await fetch(`${API_BASE_URL}/bookings/recurring`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    await handleApiError(response, 'Failed to create recurring booking');
    return response.json();
  },

  setBookingColor: async (bookingId: number, colorCode: string): Promise<Booking> => {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/color`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ color_code: colorCode }),
    });
    await handleApiError(response, 'Failed to set booking color');
    return response.json();
  },

  // Campaigns
  getPlaceCampaigns: async (placeId: number): Promise<Campaign[]> => {
    const response = await fetch(`${API_BASE_URL}/campaigns/places/${placeId}/campaigns`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch campaigns');
    return response.json();
  },

  getAllCampaigns: async (params?: { page?: number; size?: number; status_filter?: string }): Promise<{ campaigns: Campaign[]; total: number; page: number; size: number; pages: number }> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.size) searchParams.append('size', params.size.toString());
    if (params?.status_filter) searchParams.append('status_filter', params.status_filter);

    const response = await fetch(`${API_BASE_URL}/campaigns?${searchParams}`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch campaigns');
    return response.json();
  },

  createCampaign: async (data: Partial<Campaign>): Promise<Campaign> => {
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    await handleApiError(response, 'Failed to create campaign');
    return response.json();
  },

  getCampaign: async (id: number): Promise<Campaign> => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch campaign');
    return response.json();
  },

  updateCampaign: async (id: number, data: Partial<Campaign>): Promise<Campaign> => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    await handleApiError(response, 'Failed to update campaign');
    return response.json();
  },

  deleteCampaign: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to delete campaign');
  },

  getCampaignStats: async (): Promise<{ total_campaigns: number; active_campaigns: number; scheduled_campaigns: number; expired_campaigns: number; total_places_affected: number; total_services_affected: number }> => {
    const response = await fetch(`${API_BASE_URL}/campaigns/stats/overview`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch campaign stats');
    return response.json();
  },

  // Messages
  getPlaceMessages: async (placeId: number, params?: { message_type?: string; is_read?: boolean; limit?: number; offset?: number }): Promise<Message[]> => {
    const searchParams = new URLSearchParams();
    if (params?.message_type) searchParams.append('message_type', params.message_type);
    if (params?.is_read !== undefined) searchParams.append('is_read', params.is_read.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const response = await fetch(`${API_BASE_URL}/messages/places/${placeId}/messages?${searchParams}`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch messages');
    return response.json();
  },

  getAllMessages: async (params?: { message_type?: string; is_read?: boolean; limit?: number; offset?: number }): Promise<Message[]> => {
    const searchParams = new URLSearchParams();
    if (params?.message_type) searchParams.append('message_type', params.message_type);
    if (params?.is_read !== undefined) searchParams.append('is_read', params.is_read.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const response = await fetch(`${API_BASE_URL}/messages?${searchParams}`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch messages');
    return response.json();
  },

  getMessage: async (id: number): Promise<Message> => {
    const response = await fetch(`${API_BASE_URL}/messages/${id}`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch message');
    return response.json();
  },

  markMessageRead: async (id: number): Promise<Message> => {
    const response = await fetch(`${API_BASE_URL}/messages/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to mark message as read');
    return response.json();
  },

  markMessageUnread: async (id: number): Promise<Message> => {
    const response = await fetch(`${API_BASE_URL}/messages/${id}/unread`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to mark message as unread');
    return response.json();
  },

  sendMessage: async (data: Partial<Message>): Promise<Message> => {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    await handleApiError(response, 'Failed to send message');
    return response.json();
  },

  deleteMessage: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/messages/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to delete message');
  },

  replyToMessage: async (messageId: number, content: string, attachments?: any): Promise<Message> => {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}/reply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, attachments }),
    });
    await handleApiError(response, 'Failed to send reply');
    return response.json();
  },

  getUnreadCount: async (): Promise<{ unread_count: number }> => {
    const response = await fetch(`${API_BASE_URL}/messages/unread-count`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch unread count');
    return response.json();
  },

  // Time-off Management API methods (Place-scoped)
  getEmployeeTimeOffByPlace: async (placeId: number, employeeId: number): Promise<EmployeeTimeOff[]> => {
    const response = await fetch(`${API_BASE_URL}/places/${placeId}/employees/${employeeId}/time-off`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch employee time-off');
    return response.json();
  },

  getPlaceTimeOff: async (placeId: number, startDate?: string, endDate?: string): Promise<EmployeeTimeOff[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await fetch(`${API_BASE_URL}/places/${placeId}/time-off?${params}`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch place time-off');
    return response.json();
  },

  getPlaceTimeOffCalendar: async (placeId: number, startDate: string, endDate: string): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/places/${placeId}/time-off/calendar?start_date=${startDate}&end_date=${endDate}`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch time-off calendar');
    return response.json();
  },

  createEmployeeTimeOffByPlace: async (placeId: number, employeeId: number, data: TimeOffCreate): Promise<{ id: number }> => {
    const response = await fetch(`${API_BASE_URL}/places/${placeId}/employees/${employeeId}/time-off`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    await handleApiError(response, 'Failed to create time-off');
    return response.json();
  },

  updateEmployeeTimeOffByPlace: async (placeId: number, employeeId: number, id: number, data: TimeOffUpdate): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/places/${placeId}/employees/${employeeId}/time-off/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    await handleApiError(response, 'Failed to update time-off');
    return response.json();
  },

  deleteEmployeeTimeOffByPlace: async (placeId: number, employeeId: number, id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/places/${placeId}/employees/${employeeId}/time-off/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to delete time-off');
  },

  updateTimeOffStatus: async (id: number, data: TimeOffStatusUpdate): Promise<EmployeeTimeOff> => {
    const response = await fetch(`${API_BASE_URL}/time-off/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    await handleApiError(response, 'Failed to update time-off status');
    return response.json();
  },

  // Closed Periods (Place-wide)
  getClosedPeriodsByPlace: async (placeId: number, status?: 'active' | 'inactive'): Promise<ClosedPeriod[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status_filter', status);
    const response = await fetch(`${API_BASE_URL}/places/${placeId}/closed-periods?${params}`, {
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to fetch closed periods');
    return response.json();
  },
  createClosedPeriodByPlace: async (placeId: number, data: Omit<ClosedPeriod, 'id' | 'place_id' | 'created_at' | 'updated_at' | 'business_id'>): Promise<{ id: number }> => {
    const payload = { ...data } as any;
    delete payload.id; delete payload.place_id; delete payload.created_at; delete payload.updated_at; delete payload.business_id;
    const response = await fetch(`${API_BASE_URL}/places/${placeId}/closed-periods`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    await handleApiError(response, 'Failed to create closed period');
    return response.json();
  },
  updateClosedPeriodByPlace: async (placeId: number, id: number, data: Partial<ClosedPeriod>): Promise<{ success: boolean }> => {
    const payload = { ...data } as any;
    delete payload.id; delete payload.place_id; delete payload.business_id; delete payload.created_at; delete payload.updated_at;
    const response = await fetch(`${API_BASE_URL}/places/${placeId}/closed-periods/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    await handleApiError(response, 'Failed to update closed period');
    return response.json();
  },
  deleteClosedPeriodByPlace: async (placeId: number, id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/places/${placeId}/closed-periods/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleApiError(response, 'Failed to delete closed period');
  },
};

// React Query Hooks
export const useEmployeeServices = (employeeId: number) => {
  return useQuery({
    queryKey: ['owner', 'employees', employeeId, 'services'],
    queryFn: () => ownerApi.getEmployeeServices(employeeId),
    enabled: !!employeeId,
  });
};

export const useOwnerApi = () => {
  const queryClient = useQueryClient();

  // Dashboard
  const useDashboardStats = () => {
    return useQuery({
      queryKey: ['owner', 'dashboard', 'stats'],
      queryFn: ownerApi.getDashboardStats,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  const useDashboardOverview = () => {
    return useQuery({
      queryKey: ['owner', 'dashboard', 'overview'],
      queryFn: ownerApi.getDashboardOverview,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Places
  const usePlaces = () => {
    return useQuery({
      queryKey: ['owner', 'places'],
      queryFn: ownerApi.getPlaces,
    });
  };

  const usePlace = (id: number) => {
    return useQuery({
      queryKey: ['owner', 'places', id],
      queryFn: () => ownerApi.getPlace(id),
      enabled: !!id,
    });
  };

  const useCreatePlace = () => {
    return useMutation({
      mutationFn: ownerApi.createPlace,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'places'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
      },
    });
  };

  const useUpdatePlace = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Place> }) => ownerApi.updatePlace(id, data),
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'places'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'places', id] });
      },
    });
  };

  const useDeletePlace = () => {
    return useMutation({
      mutationFn: ownerApi.deletePlace,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'places'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
      },
    });
  };

  // Services
  const usePlaceServices = (placeId: number) => {
    return useQuery({
      queryKey: ['owner', 'places', placeId, 'services'],
      queryFn: () => ownerApi.getPlaceServices(placeId),
      enabled: !!placeId,
    });
  };

  const useCreateService = () => {
    return useMutation({
      mutationFn: ({ placeId, data }: { placeId: number; data: Partial<Service> }) => ownerApi.createService(placeId, data),
      onSuccess: (_, { placeId }) => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'places', placeId, 'services'] });
      },
    });
  };

  const useUpdateService = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Service> }) => ownerApi.updateService(id, data),
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'services', id] });
      },
    });
  };

  const useDeleteService = () => {
    return useMutation({
      mutationFn: ownerApi.deleteService,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'services'] });
      },
    });
  };

  // Employees
  const usePlaceEmployees = (placeId: number) => {
    return useQuery({
      queryKey: ['owner', 'places', placeId, 'employees'],
      queryFn: () => ownerApi.getPlaceEmployees(placeId),
      enabled: !!placeId,
    });
  };

  const useCreateEmployee = () => {
    return useMutation({
      mutationFn: ({ placeId, data }: { placeId: number; data: Partial<Employee> }) => ownerApi.createEmployee(placeId, data),
      onSuccess: (_, { placeId }) => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'places', placeId, 'employees'] });
      },
    });
  };

  const useUpdateEmployee = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Employee> }) => ownerApi.updateEmployee(id, data),
      onSuccess: (_, { id }) => {
        // Invalidate both the specific employee and the employees list
        queryClient.invalidateQueries({ queryKey: ['owner', 'employees', id] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'places'] });
      },
    });
  };

  const useDeleteEmployee = () => {
    return useMutation({
      mutationFn: ownerApi.deleteEmployee,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'employees'] });
      },
    });
  };

  const useUpdateEmployeeWorkingHours = () => {
    return useMutation({
      mutationFn: ({ id, workingHours }: { id: number; workingHours: any }) => ownerApi.updateEmployeeWorkingHours(id, workingHours),
      onSuccess: (_, { id }) => {
        // Invalidate both the specific employee and the employees list
        queryClient.invalidateQueries({ queryKey: ['owner', 'employees', id] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'places'] });
      },
    });
  };

  const useAssignEmployeeServices = () => {
    return useMutation({
      mutationFn: ({ employeeId, serviceIds }: { employeeId: number; serviceIds: number[] }) => 
        ownerApi.assignEmployeeServices(employeeId, serviceIds),
      onSuccess: (_, { employeeId }) => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'employees', employeeId, 'services'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'employees', employeeId] });
      },
    });
  };


  // Bookings
  const usePlaceBookings = (placeId: number, params?: any) => {
    return useQuery({
      queryKey: ['owner', 'places', placeId, 'bookings', params],
      queryFn: () => ownerApi.getPlaceBookings(placeId, params),
      enabled: !!placeId,
    });
  };

  const useCreateBooking = () => {
    return useMutation({
      mutationFn: ownerApi.createBooking,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'places'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
      },
    });
  };

  const useUpdateBooking = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Booking> }) => ownerApi.updateBooking(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'places'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
      },
    });
  };

  const useCancelBooking = () => {
    return useMutation({
      mutationFn: ownerApi.cancelBooking,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'places'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
      },
    });
  };

  const useAcceptBooking = () => {
    return useMutation({
      mutationFn: ownerApi.acceptBooking,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'bookings'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'places'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
      },
    });
  };

  // Campaigns
  const usePlaceCampaigns = (placeId: number) => {
    return useQuery({
      queryKey: ['owner', 'places', placeId, 'campaigns'],
      queryFn: () => ownerApi.getPlaceCampaigns(placeId),
      enabled: !!placeId,
    });
  };

  const useAllCampaigns = (params?: { page?: number; size?: number; status_filter?: string }) => {
    return useQuery({
      queryKey: ['owner', 'campaigns', params],
      queryFn: () => ownerApi.getAllCampaigns(params),
    });
  };

  const useCampaign = (id: number) => {
    return useQuery({
      queryKey: ['owner', 'campaigns', id],
      queryFn: () => ownerApi.getCampaign(id),
      enabled: !!id,
    });
  };

  const useCreateCampaign = () => {
    return useMutation({
      mutationFn: (data: Partial<Campaign>) => ownerApi.createCampaign(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
      },
    });
  };

  const useUpdateCampaign = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Campaign> }) => ownerApi.updateCampaign(id, data),
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'campaigns', id] });
      },
    });
  };

  const useDeleteCampaign = () => {
    return useMutation({
      mutationFn: ownerApi.deleteCampaign,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
      },
    });
  };

  const useCampaignStats = () => {
    return useQuery({
      queryKey: ['owner', 'campaigns', 'stats'],
      queryFn: ownerApi.getCampaignStats,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Messages
  const usePlaceMessages = (placeId: number, params?: any) => {
    return useQuery({
      queryKey: ['owner', 'places', placeId, 'messages', params],
      queryFn: () => ownerApi.getPlaceMessages(placeId, params),
      enabled: !!placeId,
    });
  };

  const useAllMessages = (params?: any) => {
    return useQuery({
      queryKey: ['owner', 'messages', params],
      queryFn: () => ownerApi.getAllMessages(params),
    });
  };

  const useUnreadCount = () => {
    return useQuery({
      queryKey: ['owner', 'messages', 'unread-count'],
      queryFn: ownerApi.getUnreadCount,
      refetchInterval: 30000, // Refetch every 30 seconds
    });
  };

  const useMarkMessageRead = () => {
    return useMutation({
      mutationFn: ownerApi.markMessageRead,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'messages'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
      },
    });
  };

  const useSendMessage = () => {
    return useMutation({
      mutationFn: ownerApi.sendMessage,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'messages'] });
      },
    });
  };

  const useReplyToMessage = () => {
    return useMutation({
      mutationFn: ({ messageId, content, attachments }: { messageId: number; content: string; attachments?: any }) => 
        ownerApi.replyToMessage(messageId, content, attachments),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'messages'] });
      },
    });
  };

  const useCreateMessage = () => {
    return useMutation({
      mutationFn: ({ data }: { placeId: number; data: Partial<Message> }) => 
        ownerApi.sendMessage(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'messages'] });
      },
    });
  };

  const useUpdateMessage = () => {
    return useMutation({
      mutationFn: ({ id }: { id: number; data: Partial<Message> }) => 
        ownerApi.markMessageRead(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'messages'] });
      },
    });
  };

  // Time-off Management
  const useEmployeeTimeOff = (placeId: number, employeeId: number) => {
    return useQuery({
      queryKey: ['owner', 'places', placeId, 'employees', employeeId, 'time-off'],
      queryFn: () => ownerApi.getEmployeeTimeOffByPlace(placeId, employeeId),
      enabled: !!placeId && !!employeeId,
    });
  };

  const usePlaceTimeOff = (placeId: number, startDate?: string, endDate?: string) => {
    return useQuery({
      queryKey: ['owner', 'places', placeId, 'time-off', startDate, endDate],
      queryFn: () => ownerApi.getPlaceTimeOff(placeId, startDate, endDate),
      enabled: !!placeId,
    });
  };

  const usePlaceTimeOffCalendar = (placeId: number, startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['owner', 'places', placeId, 'time-off', 'calendar', startDate, endDate],
      queryFn: () => ownerApi.getPlaceTimeOffCalendar(placeId, startDate, endDate),
      enabled: !!placeId && !!startDate && !!endDate,
    });
  };

  const useCreateTimeOff = () => {
    return useMutation({
      mutationFn: ({ placeId, employeeId, data }: { placeId: number; employeeId: number; data: TimeOffCreate }) => 
        ownerApi.createEmployeeTimeOffByPlace(placeId, employeeId, data),
      onSuccess: (_, { placeId, employeeId }) => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'places', placeId, 'employees', employeeId, 'time-off'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'places'] });
      },
    });
  };

  const useUpdateTimeOff = () => {
    return useMutation({
      mutationFn: ({ placeId, employeeId, id, data }: { placeId: number; employeeId: number; id: number; data: TimeOffUpdate }) => 
        ownerApi.updateEmployeeTimeOffByPlace(placeId, employeeId, id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'employees'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'places'] });
      },
    });
  };

  const useDeleteTimeOff = () => {
    return useMutation({
      mutationFn: ({ placeId, employeeId, id }: { placeId: number; employeeId: number; id: number }) => ownerApi.deleteEmployeeTimeOffByPlace(placeId, employeeId, id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'employees'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'places'] });
      },
    });
  };

  // Closed Periods hooks
  const useClosedPeriods = (placeId: number, status?: 'active' | 'inactive') => {
    return useQuery({
      queryKey: ['owner', 'places', placeId, 'closed-periods', status],
      queryFn: () => ownerApi.getClosedPeriodsByPlace(placeId, status),
      enabled: !!placeId,
    });
  };

  const useCreateClosedPeriod = () => {
    return useMutation({
      mutationFn: ({ placeId, data }: { placeId: number; data: Omit<ClosedPeriod, 'id' | 'place_id' | 'created_at' | 'updated_at' | 'business_id'> }) =>
        ownerApi.createClosedPeriodByPlace(placeId, data),
      onSuccess: (_, { placeId }) => {
        useQueryClient().invalidateQueries({ queryKey: ['owner', 'places', placeId, 'closed-periods'] });
      },
    });
  };

  const useUpdateClosedPeriod = () => {
    return useMutation({
      mutationFn: ({ placeId, id, data }: { placeId: number; id: number; data: Partial<ClosedPeriod> }) =>
        ownerApi.updateClosedPeriodByPlace(placeId, id, data),
      onSuccess: (_, { placeId }) => {
        useQueryClient().invalidateQueries({ queryKey: ['owner', 'places', placeId, 'closed-periods'] });
      },
    });
  };

  const useDeleteClosedPeriod = () => {
    return useMutation({
      mutationFn: ({ placeId, id }: { placeId: number; id: number }) => ownerApi.deleteClosedPeriodByPlace(placeId, id),
      onSuccess: (_, { placeId }) => {
        useQueryClient().invalidateQueries({ queryKey: ['owner', 'places', placeId, 'closed-periods'] });
      },
    });
  };

  const useApproveTimeOff = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: TimeOffStatusUpdate }) => 
        ownerApi.updateTimeOffStatus(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['owner', 'employees'] });
        queryClient.invalidateQueries({ queryKey: ['owner', 'places'] });
      },
    });
  };

  // Customer Management Hooks
  const usePlaceCustomers = (placeId: number, searchParams?: any) => {
    return useQuery({
      queryKey: ['place-customers', placeId, searchParams],
      queryFn: async () => {
        const params = new URLSearchParams(searchParams || {});
        const response = await fetch(`/api/v1/owner/places/${placeId}/customers?${params}`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch customers');
        return response.json();
      },
      enabled: !!placeId,
    });
  };

  const useCustomerDetails = (placeId: number, userId: number) => {
    return useQuery({
      queryKey: ['customer-details', placeId, userId],
      queryFn: async () => {
        const response = await fetch(`/api/v1/owner/places/${placeId}/customers/${userId}`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch customer details');
        return response.json();
      },
      enabled: !!placeId && !!userId,
    });
  };

  const useCustomerRewardHistory = (placeId: number, userId: number) => {
    return useQuery({
      queryKey: ['customer-reward-history', placeId, userId],
      queryFn: async () => {
        const response = await fetch(`/api/v1/owner/places/${placeId}/customers/${userId}/reward-history`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch reward history');
        return response.json();
      },
      enabled: !!placeId && !!userId,
    });
  };

  // Messaging Campaign Hooks
  const useMessagingCampaignCustomers = (placeIds: number[], searchParams?: any) => {
    return useQuery({
      queryKey: ['messaging-campaign-customers', placeIds, searchParams],
      queryFn: async () => {
        if (!placeIds || placeIds.length === 0) return [];
        
        const params = new URLSearchParams();
        placeIds.forEach(id => params.append('place_ids', id.toString()));
        
        if (searchParams?.filter_by) params.append('filter_by', searchParams.filter_by);
        if (searchParams?.search) params.append('search', searchParams.search);
        
        const response = await fetch(`/api/v1/owner/campaigns/messaging/customers?${params}`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch messaging campaign customers');
        return response.json();
      },
      enabled: !!placeIds && placeIds.length > 0,
    });
  };

  const useUpdateCustomerRewards = () => {
    return useMutation({
      mutationFn: async ({ placeId, userId, adjustment }: { placeId: number; userId: number; adjustment: any }) => {
        const response = await fetch(`/api/v1/owner/places/${placeId}/customers/${userId}/rewards`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(adjustment),
        });
        if (!response.ok) throw new Error('Failed to update customer rewards');
        return response.json();
      },
      onSuccess: (_, { placeId, userId }) => {
        queryClient.invalidateQueries({ queryKey: ['customer-details', placeId, userId] });
        queryClient.invalidateQueries({ queryKey: ['customer-reward-history', placeId, userId] });
        queryClient.invalidateQueries({ queryKey: ['place-customers', placeId] });
      },
    });
  };

  // Settings Hooks
  const usePlaceFeatureSettings = (placeId: number) => {
    return useQuery({
      queryKey: ['place-feature-settings', placeId],
      queryFn: async () => {
        const response = await fetch(`${API_BASE_URL}/places/${placeId}/settings`, {
          headers: getAuthHeaders(),
        });
        await handleApiError(response, 'Failed to fetch feature settings');
        return response.json();
      },
      enabled: !!placeId,
    });
  };

  const useUpdateFeatureSettings = () => {
    return useMutation({
      mutationFn: async ({ placeId, settings }: { placeId: number; settings: any }) => {
        const response = await fetch(`${API_BASE_URL}/places/${placeId}/settings/features`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(settings),
        });
        await handleApiError(response, 'Failed to update feature settings');
        return response.json();
      },
      onSuccess: (_, { placeId }) => {
        queryClient.invalidateQueries({ queryKey: ['place-feature-settings', placeId] });
      },
    });
  };

  const usePlaceRewardSettings = (placeId: number) => {
    return useQuery({
      queryKey: ['place-reward-settings', placeId],
      queryFn: async () => {
        const response = await fetch(`${API_BASE_URL}/places/${placeId}/reward-settings`, {
          headers: getAuthHeaders(),
        });
        await handleApiError(response, 'Failed to fetch reward settings');
        return response.json();
      },
      enabled: !!placeId,
    });
  };

  const useUpdateRewardSettings = () => {
    return useMutation({
      mutationFn: async ({ placeId, settings }: { placeId: number; settings: any }) => {
        const response = await fetch(`${API_BASE_URL}/places/${placeId}/reward-settings`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(settings),
        });
        await handleApiError(response, 'Failed to update reward settings');
        return response.json();
      },
      onSuccess: (_, { placeId }) => {
        queryClient.invalidateQueries({ queryKey: ['place-reward-settings', placeId] });
      },
    });
  };

  // Messaging Campaign API functions
  const getMessagingCustomers = async (placeIds: number[], filters?: {
    filter_by?: string;
    search?: string;
  }): Promise<MessagingCustomer[]> => {
    try {
      const params = new URLSearchParams();
      placeIds.forEach(id => params.append('place_ids', id.toString()));
      if (filters?.filter_by) params.append('filter_by', filters.filter_by);
      if (filters?.search) params.append('search', filters.search);
      
      const response = await fetch(`/api/v1/owner/campaigns/messaging/customers?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        await handleApiError(response, 'Failed to fetch messaging customers');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching messaging customers:', error);
      throw error;
    }
  };

  const addCampaignRecipients = async (campaignId: number, userIds: number[]): Promise<{ success: boolean; added_count: number }> => {
    try {
      const response = await fetch(`/api/v1/owner/campaigns/${campaignId}/recipients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ user_ids: userIds }),
      });
      
      if (!response.ok) {
        await handleApiError(response, 'Failed to add campaign recipients');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error adding campaign recipients:', error);
      throw error;
    }
  };

  const getCampaignRecipients = async (campaignId: number): Promise<CampaignRecipient[]> => {
    try {
      const response = await fetch(`/api/v1/owner/campaigns/${campaignId}/recipients`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        await handleApiError(response, 'Failed to fetch campaign recipients');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching campaign recipients:', error);
      throw error;
    }
  };

  const removeCampaignRecipient = async (campaignId: number, recipientId: number): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`/api/v1/owner/campaigns/${campaignId}/recipients/${recipientId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        await handleApiError(response, 'Failed to remove campaign recipient');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error removing campaign recipient:', error);
      throw error;
    }
  };

  const sendMessagingCampaign = async (campaignId: number, sendImmediately: boolean = false): Promise<{ success: boolean; sent_count: number; failed_count: number }> => {
    try {
      const response = await fetch(`/api/v1/owner/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ send_immediately: sendImmediately }),
      });
      
      if (!response.ok) {
        await handleApiError(response, 'Failed to send messaging campaign');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error sending messaging campaign:', error);
      throw error;
    }
  };

  const getMessagingCampaignStats = async (campaignId: number): Promise<MessagingStats> => {
    try {
      const response = await fetch(`/api/v1/owner/campaigns/${campaignId}/messaging-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        await handleApiError(response, 'Failed to fetch messaging campaign stats');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching messaging campaign stats:', error);
      throw error;
    }
  };

  // Messaging Campaign React Query hooks
  const useMessagingCustomers = (placeIds: number[], filters?: { filter_by?: string; search?: string }) => {
    return useQuery({
      queryKey: ['messaging-customers', placeIds, filters],
      queryFn: () => getMessagingCustomers(placeIds, filters),
      enabled: placeIds.length > 0,
    });
  };

  const useCampaignRecipients = (campaignId: number) => {
    return useQuery({
      queryKey: ['campaign-recipients', campaignId],
      queryFn: () => getCampaignRecipients(campaignId),
      enabled: !!campaignId,
    });
  };

  const useMessagingCampaignStats = (campaignId: number) => {
    return useQuery({
      queryKey: ['messaging-campaign-stats', campaignId],
      queryFn: () => getMessagingCampaignStats(campaignId),
      enabled: !!campaignId,
    });
  };

  const useAddCampaignRecipients = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ campaignId, userIds }: { campaignId: number; userIds: number[] }) =>
        addCampaignRecipients(campaignId, userIds),
      onSuccess: (_, { campaignId }) => {
        queryClient.invalidateQueries({ queryKey: ['campaign-recipients', campaignId] });
        queryClient.invalidateQueries({ queryKey: ['messaging-campaign-stats', campaignId] });
      },
    });
  };

  const useRemoveCampaignRecipient = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ campaignId, recipientId }: { campaignId: number; recipientId: number }) =>
        removeCampaignRecipient(campaignId, recipientId),
      onSuccess: (_, { campaignId }) => {
        queryClient.invalidateQueries({ queryKey: ['campaign-recipients', campaignId] });
        queryClient.invalidateQueries({ queryKey: ['messaging-campaign-stats', campaignId] });
      },
    });
  };

  const useSendMessagingCampaign = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ campaignId, sendImmediately }: { campaignId: number; sendImmediately?: boolean }) =>
        sendMessagingCampaign(campaignId, sendImmediately),
      onSuccess: (_, { campaignId }) => {
        queryClient.invalidateQueries({ queryKey: ['campaign-recipients', campaignId] });
        queryClient.invalidateQueries({ queryKey: ['messaging-campaign-stats', campaignId] });
        queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      },
    });
  };

  return {
    // Dashboard
    useDashboardStats,
    useDashboardOverview,
    
    // Places
    usePlaces,
    usePlace,
    useCreatePlace,
    useUpdatePlace,
    useDeletePlace,
    
    // Services
    usePlaceServices,
    useCreateService,
    useUpdateService,
    useDeleteService,
    
    // Employees
    usePlaceEmployees,
    useCreateEmployee,
    useUpdateEmployee,
    useDeleteEmployee,
    useUpdateEmployeeWorkingHours,
    useAssignEmployeeServices,
    useEmployeeServices,
    
    // Bookings
    usePlaceBookings,
    useCreateBooking,
    useUpdateBooking,
    useCancelBooking,
    useAcceptBooking,
    
    // Campaigns
    usePlaceCampaigns,
    useAllCampaigns,
    useCampaign,
    useCreateCampaign,
    useUpdateCampaign,
    useDeleteCampaign,
    useCampaignStats,
    
    // Messages
    usePlaceMessages,
    useAllMessages,
    useUnreadCount,
    useMarkMessageRead,
    useSendMessage,
    useReplyToMessage,
    useCreateMessage,
    useUpdateMessage,
    
    // Time-off Management
    useEmployeeTimeOff,
    usePlaceTimeOff,
    usePlaceTimeOffCalendar,
    useCreateTimeOff,
    useUpdateTimeOff,
    useDeleteTimeOff,
    useApproveTimeOff,
    useClosedPeriods,
    useCreateClosedPeriod,
    useUpdateClosedPeriod,
    useDeleteClosedPeriod,
    
    // Customers
    usePlaceCustomers,
    useCustomerDetails,
    useCustomerRewardHistory,
    useUpdateCustomerRewards,
    
    // Settings
    usePlaceFeatureSettings,
    useUpdateFeatureSettings,
    usePlaceRewardSettings,
    useUpdateRewardSettings,
    
    // Messaging Campaigns
    useMessagingCustomers,
    useMessagingCampaignCustomers,
    useCampaignRecipients,
    useMessagingCampaignStats,
    useAddCampaignRecipients,
    useRemoveCampaignRecipient,
    useSendMessagingCampaign,
  };
};
