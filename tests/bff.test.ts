import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DELETE, GET, POST } from '@/app/api/[...path]/route';

describe('server-side API bridge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.MG5_API_URL;
  });

  it('stores the backend token in HttpOnly cookie and removes it from the response body', async () => {
    process.env.MG5_API_URL = 'http://backend.test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      user: { id: 1, name: 'Admin', email: 'admin@example.com' },
      token: 'sensitive-token',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    const request = new NextRequest('http://localhost:8081/api/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:8081',
        'Sec-Fetch-Site': 'same-origin',
      },
      body: JSON.stringify({ email: 'admin@example.com', password: 'secret' }),
    });
    const response = await POST(request, { params: Promise.resolve({ path: ['auth', 'token'] }) });

    expect(await response.json()).toEqual({ user: { id: 1, name: 'Admin', email: 'admin@example.com' } });
    expect(response.headers.get('set-cookie')).toContain('mg5_session=sensitive-token');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('revokes the current token and clears the cookie on logout', async () => {
    process.env.MG5_API_URL = 'http://backend.test';
    const fetchMock = vi.fn().mockResolvedValue(new Response('Token deleted', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('http://localhost:8081/api/auth/token', {
      method: 'DELETE',
      headers: {
        cookie: 'mg5_session=sensitive-token',
        Origin: 'http://localhost:8081',
        'Sec-Fetch-Site': 'same-origin',
      },
    });

    const response = await DELETE(request, { params: Promise.resolve({ path: ['auth', 'token'] }) });
    const forwardedHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(forwardedHeaders.get('Authorization')).toBe('Bearer sensitive-token');
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('still clears the browser session when the backend is unavailable during logout', async () => {
    process.env.MG5_API_URL = 'http://backend.test';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const request = new NextRequest('http://localhost:8081/api/auth/token', {
      method: 'DELETE',
      headers: {
        cookie: 'mg5_session=sensitive-token',
        Origin: 'http://localhost:8081',
        'Sec-Fetch-Site': 'same-origin',
      },
    });

    const response = await DELETE(request, { params: Promise.resolve({ path: ['auth', 'token'] }) });
    expect(response.status).toBe(503);
    expect(response.headers.get('set-cookie')).toContain('Expires=Thu, 01 Jan 1970');
  });

  it('accepts a same-origin mutation', async () => {
    process.env.MG5_API_URL = 'http://backend.test';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      user: { id: 1, name: 'Admin', email: 'admin@example.com' },
      token: 'sensitive-token',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('http://localhost:8081/api/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:8081',
        'Sec-Fetch-Site': 'same-origin',
      },
      body: JSON.stringify({ email: 'admin@example.com', password: 'secret' }),
    });

    const response = await POST(request, { params: Promise.resolve({ path: ['auth', 'token'] }) });
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rejects a cross-origin mutation before contacting Laravel', async () => {
    process.env.MG5_API_URL = 'http://backend.test';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('http://localhost:8081/api/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://attacker.example',
        'Sec-Fetch-Site': 'cross-site',
      },
      body: JSON.stringify({ email: 'admin@example.com', password: 'secret' }),
    });

    const response = await POST(request, { params: Promise.resolve({ path: ['auth', 'token'] }) });
    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves multipart boundary, tenant header, status, and no-store for file uploads', async () => {
    process.env.MG5_API_URL = 'http://backend.test';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 9 }, meta: { duplicate_upload: false } }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const boundary = '----mg5-test-boundary';
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="account_id"\r\n\r\n4\r\n--${boundary}--\r\n`;
    const request = new NextRequest('http://localhost:8081/api/files', {
      method: 'POST',
      headers: {
        cookie: 'mg5_session=sensitive-token',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Tenant-Slug': 'clinic',
        Origin: 'http://localhost:8081',
        'Sec-Fetch-Site': 'same-origin',
      },
      body,
    });

    const response = await POST(request, { params: Promise.resolve({ path: ['files'] }) });
    const forwarded = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = forwarded.headers as Headers;
    expect(headers.get('Content-Type')).toBe(`multipart/form-data; boundary=${boundary}`);
    expect(headers.get('X-Tenant-Slug')).toBe('clinic');
    expect(new TextDecoder().decode(forwarded.body as ArrayBuffer)).toBe(body);
    expect(response.status).toBe(201);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('allows and forwards the tenant-aware dashboard summary query', async () => {
    process.env.MG5_API_URL = 'http://backend.test';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { period: { month: '2026-08' } },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('http://localhost:8081/api/dashboard/summary?month=2026-08', {
      method: 'GET',
      headers: {
        cookie: 'mg5_session=sensitive-token',
        'X-Tenant-Slug': 'clinic',
      },
    });

    const response = await GET(request, { params: Promise.resolve({ path: ['dashboard', 'summary'] }) });
    const forwarded = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = forwarded.headers as Headers;

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://backend.test/api/dashboard/summary?month=2026-08');
    expect(headers.get('Authorization')).toBe('Bearer sensitive-token');
    expect(headers.get('X-Tenant-Slug')).toBe('clinic');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ data: { period: { month: '2026-08' } } });
  });
});
