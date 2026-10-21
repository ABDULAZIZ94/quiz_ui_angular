export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  token: string;
  refresh_token?: string;
  user: {
    id: string | number;
    username: string;
    email?: string;
  };
}

export type UserRole = 'users' | 'admin' | 'manager' | 'manage';

export interface User {
  id: string; // uid daripada Firebase
  username: string;
  email: string;
  role?: UserRole;
}