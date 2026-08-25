import { afterEach, describe, expect, it, vi } from 'vitest';

import { createRule, deleteRule, listRules, ruleQuery, updateRule } from '@/features/rules/service';

describe('rule service', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('builds stable trimmed filters', () => {
    expect(ruleQuery({ page: 2, perPage: 25, search: '  costco ', accountId: '4', categoryId: '9' })).toBe('page=2&per_page=25&search=costco&account_id=4&category_id=9');
    expect(ruleQuery({ page: 1, perPage: 25, search: ' ', accountId: '', categoryId: '' })).toBe('page=1&per_page=25');
  });
  it('uses tenant headers, forwards signals, sends public payloads, and accepts 204', async () => {
    const fetchMock = vi.fn().mockImplementation((_path, init: RequestInit) => Promise.resolve(init.method === 'DELETE' ? new Response(null, { status: 204 }) : new Response(JSON.stringify({ data: [], meta: {} }), { headers: { 'Content-Type': 'application/json' } })));
    vi.stubGlobal('fetch', fetchMock); const filters = { page: 1, perPage: 25 as const, search: '', accountId: '', categoryId: '' }; const input = { match_text: 'COSTCO', account_id: null, category_id: 9 }; const controller = new AbortController();
    await listRules('personal', filters, controller.signal); await createRule('clinic', input); await updateRule('clinic', 7, input); await expect(deleteRule('clinic', 7)).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/rules?page=1&per_page=25'); expect((fetchMock.mock.calls[0]?.[1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
    expect(((fetchMock.mock.calls[1]?.[1] as RequestInit).headers as Headers).get('X-Tenant-Slug')).toBe('clinic'); expect((fetchMock.mock.calls[1]?.[1] as RequestInit).body).toBe(JSON.stringify(input));
    expect((fetchMock.mock.calls[2]?.[1] as RequestInit).method).toBe('PATCH'); expect((fetchMock.mock.calls[3]?.[1] as RequestInit).method).toBe('DELETE');
  });
});

