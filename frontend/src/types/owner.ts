// Owner API campaign types
export interface Campaign {
  id: number;
  owner_id: number;
  name: string;
  description?: string;
  banner_message: string;
  campaign_type: 'price_reduction' | 'rewards_increase' | 'free_service' | 'messaging';
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
