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

export interface User {
  id: string | number;
  username: string;
  email?: string;
}
