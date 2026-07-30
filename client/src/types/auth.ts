export interface AuthUser {
  id: string;
  email: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface MeResponse {
  user: AuthUser;
}
