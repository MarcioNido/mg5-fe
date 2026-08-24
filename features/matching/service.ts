import { apiRequest } from '@/lib/api/client';

import type {
  ConfirmMatchResponse,
  MatchReviewFilters,
  MatchReviewsResponse,
  RejectMatchResponse,
} from './types';

export function matchReviewQuery(filters: MatchReviewFilters) {
  const params = new URLSearchParams({ page: String(filters.page), per_page: String(filters.perPage) });
  if (filters.accountId) params.set('account_id', filters.accountId);
  return params.toString();
}

export function listMatchReviews(tenantSlug: string, filters: MatchReviewFilters, signal?: AbortSignal) {
  return apiRequest<MatchReviewsResponse>(`match-suggestions?${matchReviewQuery(filters)}`, {
    tenantAware: true,
    tenantSlug,
    signal,
  });
}

export function confirmMatchSuggestion(tenantSlug: string, suggestionId: number) {
  return apiRequest<ConfirmMatchResponse>(`match-suggestions/${suggestionId}/confirm`, {
    method: 'POST', tenantAware: true, tenantSlug,
  });
}

export function rejectMatchSuggestion(tenantSlug: string, suggestionId: number) {
  return apiRequest<RejectMatchResponse>(`match-suggestions/${suggestionId}/reject`, {
    method: 'POST', tenantAware: true, tenantSlug,
  });
}
