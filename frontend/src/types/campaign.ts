// Campaign types - Updated for messaging campaigns
export interface ActiveCampaign {
  id: number;
  name: string;
  banner_message: string;
  campaign_type: 'price_reduction' | 'rewards_increase' | 'free_service' | 'messaging';
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

// Messaging Campaign Types
export interface MessagingConfig {
  channels: ('email' | 'whatsapp')[];
  email_subject?: string;
  email_body?: string;
  whatsapp_message?: string;
  scheduled_send_time?: string;
  send_immediately: boolean;
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