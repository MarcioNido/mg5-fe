import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DELETE, POST } from '@/app/api/[...path]/route';

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
});
