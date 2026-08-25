import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  currentTorontoMonth,
  exactDecimalSign,
  formatDashboardMonth,
  isSelectableDashboardMonth,
  isStrictMonth,
  reconciliationLabels,
} from '@/features/dashboard/helpers';
import { dashboardSummaryQuery, getDashboardSummary } from '@/features/dashboard/service';

describe('dashboard service', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds the exact query and sends the tenant header and AbortSignal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { period: { month: '2026-08' } } }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await getDashboardSummary('clinic', '2026-08', controller.signal);

    expect(dashboardSummaryQuery('2026-08')).toBe('month=2026-08');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/dashboard/summary?month=2026-08');
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Headers).get('X-Tenant-Slug')).toBe('clinic');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('dashboard helpers', () => {
  it('derives the current civil month in America/Toronto', () => {
    expect(currentTorontoMonth(new Date('2026-09-01T02:00:00Z'))).toBe('2026-08');
    expect(currentTorontoMonth(new Date('2026-09-01T05:00:00Z'))).toBe('2026-09');
  });

  it('validates strict possible non-future months and formats their display label', () => {
    expect(isStrictMonth('2026-08')).toBe(true);
    ['0000-01', '2026-8', '2026-00', '2026-13', '2026-08-01', 'anything'].forEach((value) => expect(isStrictMonth(value)).toBe(false));
    expect(isSelectableDashboardMonth('2026-08', '2026-08')).toBe(true);
    expect(isSelectableDashboardMonth('2026-09', '2026-08')).toBe(false);
    expect(formatDashboardMonth('2026-08')).toBe('August 2026');
    expect(formatDashboardMonth('2026-13')).toBe('Not available');
  });

  it('maps every reconciliation status and detects exact signs without arithmetic', () => {
    expect(reconciliationLabels).toEqual({
      never_reconciled: 'Not reconciled',
      up_to_date: 'Up to date',
      activity_after_reconciliation: 'New activity since reconciliation',
      latest_attempt_invalid: 'Reconciliation needs attention',
    });
    expect(exactDecimalSign('100000000000000000000.0001')).toBe(1);
    expect(exactDecimalSign('-0.0001')).toBe(-1);
    expect(exactDecimalSign('-000.0000')).toBe(0);
    expect(exactDecimalSign('1.1')).toBeNull();
  });
});
