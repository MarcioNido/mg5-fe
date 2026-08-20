import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { proxy, SESSION_COOKIE } from '@/proxy';

function request(path: string, authenticated = false) {
  return new NextRequest(`http://localhost:8081${path}`, {
    headers: authenticated ? { cookie: `${SESSION_COOKIE}=secret-value` } : undefined,
  });
}

describe('route protection and redirects', () => {
  it('redirects an unauthenticated dashboard request to login with a return path', () => {
    const response = proxy(request('/dashboard/transactions?status=pending'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:8081/login?returnTo=%2Fdashboard%2Ftransactions%3Fstatus%3Dpending');
  });

  it('routes the root according to session presence', () => {
    expect(proxy(request('/')).headers.get('location')).toBe('http://localhost:8081/login');
    expect(proxy(request('/', true)).headers.get('location')).toBe('http://localhost:8081/dashboard');
  });

  it.each([
    ['/dashboard/banking/', '/dashboard'],
    ['/dashboard/transactions/list/', '/dashboard/transactions'],
    ['/dashboard/admin/categories/list/', '/dashboard/categories'],
    ['/dashboard/admin/rules/list/', '/dashboard/rules'],
  ])('permanently redirects %s without looping', (legacy, canonical) => {
    const response = proxy(request(legacy, true));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(`http://localhost:8081${canonical}`);
    expect(proxy(request(canonical, true)).status).toBe(200);
  });
});
