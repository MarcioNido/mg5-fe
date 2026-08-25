import { apiRequest } from '@/lib/api/client';

import type { DashboardSummaryResponse } from './types';

export function dashboardSummaryQuery(month: string) {
  return new URLSearchParams({ month }).toString();
}

export function getDashboardSummary(tenantSlug: string, month: string, signal?: AbortSignal) {
  return apiRequest<DashboardSummaryResponse>(`dashboard/summary?${dashboardSummaryQuery(month)}`, {
    tenantAware: true,
    tenantSlug,
    signal,
  });
}
