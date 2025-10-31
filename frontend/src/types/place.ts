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
  codigo: string;
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
  pais_morada?: string;
  rua?: string;
  porta?: string;
  cod_postal?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  owner_id?: number;
  booking_enabled?: boolean;
  is_active?: boolean;
  is_bio_diamond?: boolean;
  about?: string;
  updated_at?: string;
  services?: PlaceService[];
  images?: PlaceImage[];
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

export interface SearchFilters {
  search?: string;
  tipo?: string;
  cidade?: string;
  regiao?: string;
  is_bio_diamond?: boolean;
  booking_enabled?: boolean;
}

export interface SearchResults {
  places: Place[];
  total: number;
  pages: number;
  current_page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}
