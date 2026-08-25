import { apiRequest } from '@/lib/api/client';

import type {
  LatestReconciliationResponse,
  ReconciliationHistoryResponse,
  ReconciliationPreviewResponse,
  ReconciliationResponse,
  StoreReconciliationInput,
} from './types';

export function previewReconciliation(tenantSlug: string, accountId: number, statementDate: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ statement_date: statementDate });
  return apiRequest<ReconciliationPreviewResponse>(`accounts/${accountId}/reconciliations/preview?${query}`, {
    tenantAware: true, tenantSlug, signal,
  });
}

export function reconciliationHistoryQuery(page: number) {
  return new URLSearchParams({ page: String(page), per_page: '15' }).toString();
}

export function listReconciliations(tenantSlug: string, accountId: number, page: number, signal?: AbortSignal) {
  return apiRequest<ReconciliationHistoryResponse>(`accounts/${accountId}/reconciliations?${reconciliationHistoryQuery(page)}`, {
    tenantAware: true, tenantSlug, signal,
  });
}

export function latestReconciliation(tenantSlug: string, accountId: number, signal?: AbortSignal) {
  return apiRequest<LatestReconciliationResponse>(`accounts/${accountId}/reconciliations/latest`, {
    tenantAware: true, tenantSlug, signal,
  });
}

export function storeReconciliation(tenantSlug: string, accountId: number, input: StoreReconciliationInput) {
  return apiRequest<ReconciliationResponse>(`accounts/${accountId}/reconciliations`, {
    method: 'POST', tenantAware: true, tenantSlug, body: input,
  });
}
