export interface SalonImage {
  id: number;
  salon_id: number;
  image_url: string;
  image_alt?: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

export interface Salon {
  id: number;
  nome: string;
  cidade: string;
  regiao: string;
  telefone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  rua?: string;
  porta?: string;
  cod_postal?: string;
  latitude?: number;
  longitude?: number;
  booking_enabled?: boolean;
  is_bio_diamond?: boolean;
  about?: string;
  services?: SalonService[];
  images?: SalonImage[];
  reviews?: {
    average_rating: number;
    total_reviews: number;
  };
}

export interface Service {
  id: number;
  name: string;
  category: string;
  description: string;
  is_bio_diamond: boolean;
  usage_count?: number; // For admin views
}

export interface SalonService {
  id: number;
  name: string;
  category: string;
  description: string;
  is_bio_diamond: boolean;
  price: number;
  duration: number;
}

export interface SearchFilters {
  search?: string;
  cidade?: string;
  regiao?: string;
  bio_diamond?: boolean;
}

export interface SearchResults {
  salons: Salon[];
  total: number;
  pages: number;
  current_page: number;
}
