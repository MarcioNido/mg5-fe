import { apiRequest } from '@/lib/api/client';

import type { ImportDetailResponse, ImportFilters, ImportHistoryResponse, UploadResponse } from './types';

export function uploadStatement(tenantSlug: string, accountId: string, file: File) {
  const body = new FormData();
  body.append('account_id', accountId);
  body.append('file', file);
  return apiRequest<UploadResponse>('files', {
    method: 'POST',
    tenantAware: true,
    tenantSlug,
    body,
  });
}

export function listImports(tenantSlug: string, filters: ImportFilters, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(filters.page), per_page: String(Math.min(filters.perPage, 50)) });
  if (filters.accountId) params.set('account_id', filters.accountId);
  if (filters.status) params.set('status', filters.status);
  return apiRequest<ImportHistoryResponse>(`files?${params}`, { tenantAware: true, tenantSlug, signal });
}

export function getImport(tenantSlug: string, id: number, signal?: AbortSignal) {
  return apiRequest<ImportDetailResponse>(`files/${id}`, { tenantAware: true, tenantSlug, signal });
}
