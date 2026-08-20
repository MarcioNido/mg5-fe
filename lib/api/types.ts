export type User = {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Tenant = {
  id: number;
  name: string;
  slug: string;
};

export type LoginResponse = { user: User };
export type SessionResponse = { user: User };
export type TenantsResponse = { data: Tenant[] };

export type LaravelValidationErrors = Record<string, string[]>;

export type ApiErrorBody = {
  message?: string;
  errors?: LaravelValidationErrors;
};
