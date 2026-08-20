import { apiRequest } from '@/lib/api/client';
import type { LoginResponse, SessionResponse } from '@/lib/api/types';

export const authService = {
  login(email: string, password: string) {
    return apiRequest<LoginResponse>('auth/token', {
      method: 'POST',
      body: { email, password },
    });
  },
  session() {
    return apiRequest<SessionResponse>('auth/my-account');
  },
  logout() {
    return apiRequest<void>('auth/token', { method: 'DELETE' });
  },
};
