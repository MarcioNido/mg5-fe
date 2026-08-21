import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTransaction, deleteTransaction, updateTransaction } from '@/features/transactions/service';

const input = { account_id: 4, transaction_date: '2026-08-20', amount: '-42.7500', description: 'Expense', notes: null, status: 'pending' as const, category_id: null, splits: [] };

describe('transaction mutations service', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('preserves amount strings and sends tenant slug for POST and PATCH', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ data: {} }), { headers: { 'Content-Type': 'application/json' } })));
    vi.stubGlobal('fetch', fetchMock);
    await createTransaction('personal', input);
    await updateTransaction('clinic', 91, { amount: '-42.7500' });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/transactions');
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).body).toBe(JSON.stringify(input));
    expect(((fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers).get('X-Tenant-Slug')).toBe('personal');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/transactions/91');
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).method).toBe('PATCH');
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).body).toBe(JSON.stringify({ amount: '-42.7500' }));
    expect(((fetchMock.mock.calls[1]?.[1] as RequestInit).headers as Headers).get('X-Tenant-Slug')).toBe('clinic');
  });

  it('sends tenant-aware DELETE and accepts 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 })); vi.stubGlobal('fetch', fetchMock);
    await expect(deleteTransaction('clinic', 91)).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/transactions/91');
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe('DELETE');
    expect(((fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers).get('X-Tenant-Slug')).toBe('clinic');
  });
});
