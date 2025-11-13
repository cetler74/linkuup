export interface BookingRequest {
  salon_id: number;
  service_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // HH:MM
}

export interface Booking extends BookingRequest {
  id: number;
  duration: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
}

export interface AvailabilityResponse {
  available_slots: string[];
}
