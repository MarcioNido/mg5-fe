import { apiRequest } from '@/lib/api/client';

import type { Account, AccountInput, AccountResponse, AccountsResponse } from './types';

export function listAccounts(tenantSlug: string, signal?: AbortSignal) {
  return apiRequest<AccountsResponse>('accounts', {
    tenantAware: true,
    tenantSlug,
    signal,
  });
}

export function createAccount(tenantSlug: string, input: AccountInput) {
  return apiRequest<AccountResponse>('accounts', {
    method: 'POST',
    tenantAware: true,
    tenantSlug,
    body: input,
  });
}

export function updateAccount(tenantSlug: string, id: Account['id'], input: AccountInput) {
  return apiRequest<AccountResponse>(`accounts/${id}`, {
    method: 'PATCH',
    tenantAware: true,
    tenantSlug,
    body: input,
  });
}
