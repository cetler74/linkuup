export interface User {
  id: number;
  email: string;
  name: string;
  token?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  id: number;
  email: string;
  name: string;
  token: string;
}

// Re-export all types for easier importing
export type { User, LoginRequest, RegisterRequest, AuthResponse };
