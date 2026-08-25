import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  latestReconciliation,
  listReconciliations,
  previewReconciliation,
  reconciliationHistoryQuery,
  storeReconciliation,
} from '@/features/reconciliation/service';

describe('reconciliation service', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds the fixed flat history query', () => {
    expect(reconciliationHistoryQuery(3)).toBe('page=3&per_page=15');
  });

  it('uses the public read endpoints, tenant header, and AbortSignal', async () => {
    const preview = { data: { statement_date: '2026-08-24', calculated_balance: '1250.4000' } };
    const history = { data: [{ difference: '-10.0000' }], links: {}, meta: {} };
    const latest = { data: null };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(preview), { headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(history), { headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(latest), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    expect((await previewReconciliation('clinic', 17, '2026-08-24', controller.signal)).data.calculated_balance).toBe('1250.4000');
    expect((await listReconciliations('clinic', 17, 2, controller.signal)).data[0]?.difference).toBe('-10.0000');
    expect((await latestReconciliation('clinic', 17, controller.signal)).data).toBeNull();

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      '/api/accounts/17/reconciliations/preview?statement_date=2026-08-24',
      '/api/accounts/17/reconciliations?page=2&per_page=15',
      '/api/accounts/17/reconciliations/latest',
    ]);
    fetchMock.mock.calls.forEach((call) => {
      const init = call[1] as RequestInit;
      expect((init.headers as Headers).get('X-Tenant-Slug')).toBe('clinic');
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });
  });

  it.each([200, 201])('posts a string balance and accepts HTTP %s', async (status) => {
    const response = { data: { id: 4, statement_date: '2026-08-24', entered_bank_balance: '001.2300', calculated_balance: '1.2300', difference: '0.0000', is_valid: true, reconciled_at: '2026-08-24T15:00:00Z' } };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await storeReconciliation('personal', 9, { statement_date: '2026-08-24', entered_bank_balance: '001.2300' });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/accounts/9/reconciliations');
    expect(init.method).toBe('POST');
    expect((init.headers as Headers).get('X-Tenant-Slug')).toBe('personal');
    expect(JSON.parse(init.body as string)).toEqual({ statement_date: '2026-08-24', entered_bank_balance: '001.2300' });
    expect(result.data.entered_bank_balance).toBe('001.2300');
  });
});
