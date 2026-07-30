export interface AuthUser {
  id: string;
  email: string;
}

export interface ApiErrorBody {
  error: string;
  details?: unknown;
}

export interface HealthResponse {
  status: 'ok';
  database?: 'connected' | 'disconnected';
}

export interface MeResponse {
  user: AuthUser;
}
