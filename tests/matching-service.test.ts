import { afterEach, describe, expect, it, vi } from 'vitest';

import { confirmMatchSuggestion, listMatchReviews, matchReviewQuery, rejectMatchSuggestion } from '@/features/matching/service';
import type { MatchReviewFilters } from '@/features/matching/types';

const filters: MatchReviewFilters = { page: 2, perPage: 10, accountId: '17' };

describe('matching review service', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds flat list parameters and omits an empty account', () => {
    expect(matchReviewQuery(filters)).toBe('page=2&per_page=10&account_id=17');
    expect(matchReviewQuery({ ...filters, accountId: '' })).toBe('page=2&per_page=10');
  });

  it('sends the tenant header, forwards abort, and preserves decimal strings', async () => {
    const payload = { data: [{ imported_transaction: { amount: '-125.4000' }, candidates: [{ confidence: '0.9250', transaction: { amount: '-125.4000' } }] }], links: {}, meta: {} };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    const response = await listMatchReviews('clinic', filters, controller.signal);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/match-suggestions?page=2&per_page=10&account_id=17');
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Headers).get('X-Tenant-Slug')).toBe('clinic');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(response.data[0]?.imported_transaction.amount).toBe('-125.4000');
    expect(response.data[0]?.candidates[0]?.confidence).toBe('0.9250');
  });

  it('posts confirm and reject to the public endpoints and accepts both reject resolutions', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { review_id: 81, suggestion_id: 33, resolution: 'matched', transaction: { amount: '-125.4000' } } }), { headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { review_id: 81, suggestion_id: 34, resolution: 'candidate_rejected', remaining_candidates: 1 } }), { headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { review_id: 81, suggestion_id: 35, resolution: 'imported_transaction_kept', remaining_candidates: 0 } }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    expect((await confirmMatchSuggestion('personal', 33)).data.resolution).toBe('matched');
    expect((await rejectMatchSuggestion('personal', 34)).data.resolution).toBe('candidate_rejected');
    expect((await rejectMatchSuggestion('personal', 35)).data.resolution).toBe('imported_transaction_kept');
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(['/api/match-suggestions/33/confirm', '/api/match-suggestions/34/reject', '/api/match-suggestions/35/reject']);
    fetchMock.mock.calls.forEach((call) => expect((call[1] as RequestInit).method).toBe('POST'));
  });
});
