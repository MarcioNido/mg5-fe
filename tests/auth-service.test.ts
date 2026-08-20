import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { authService } from '@/features/auth/auth-service';
import { ApiError } from '@/lib/api/error';
import { DELETE } from '@/app/api/[...path]/route';

const user = { id: 1, name: 'MG5 Admin', email: 'admin@example.com' };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('authentication service', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.MG5_API_URL;
  });

  it('logs in successfully without handling a token in browser code', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ user }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(authService.login('admin@example.com', 'secret')).resolves.toEqual({ user });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/token', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'admin@example.com', password: 'secret' }),
    }));
  });

  it('surfaces Laravel validation errors for failed login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      message: 'The given data was invalid.',
      errors: { email: ['Invalid credentials'] },
    }, 422)));

    await expect(authService.login('admin@example.com', 'wrong')).rejects.toMatchObject({
      status: 422,
      message: 'Invalid credentials',
    } satisfies Partial<ApiError>);
  });

  it('recovers a session and logs out through the same client', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ user }))
      .mockResolvedValueOnce(new Response('', { status: 200, headers: { 'content-length': '0' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(authService.session()).resolves.toEqual({ user });
    await expect(authService.logout()).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/auth/token');
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ method: 'DELETE' }));
  });

  it('completes logout through the BFF when Laravel returns its current plain-text response', async () => {
    process.env.MG5_API_URL = 'http://backend.test';
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (input === '/api/auth/token') {
        const headers = new Headers(init?.headers);
        headers.set('Cookie', 'mg5_session=sensitive-token');
        headers.set('Origin', 'http://localhost:8081');
        headers.set('Sec-Fetch-Site', 'same-origin');
        const request = new NextRequest('http://localhost:8081/api/auth/token', {
          method: 'DELETE',
          headers,
        });
        return DELETE(request, { params: Promise.resolve({ path: ['auth', 'token'] }) });
      }

      expect(input).toBe('http://backend.test/api/auth/token');
      return new Response('Token deleted', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(authService.logout()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('emits the centralized session-expired event on 401', async () => {
    const listener = vi.fn();
    window.addEventListener('mg5:unauthorized', listener);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Unauthenticated.' }, 401)));

    await expect(authService.session()).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('mg5:unauthorized', listener);
  });
});
