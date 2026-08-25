import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE } from '@/proxy';

const publicOperations = new Set(['POST auth/token']);
const authenticatedOperations = new Set([
  'GET auth/my-account',
  'DELETE auth/token',
  'GET tenants',
]);

const tenantPathPatterns = [
  /^accounts(?:\/\d+(?:\/reconciliations(?:\/latest)?)?)?$/,
  /^balances\/\d+\/[^/]+$/,
  /^categories(?:\/\d+)?$/,
  /^dashboard\/summary$/,
  /^files(?:\/\d+)?$/,
  /^match-suggestions(?:\/\d+\/(?:confirm|reject))?$/,
  /^rules(?:\/\d+)?$/,
  /^transactions(?:\/\d+|\/(?:income|expense|balance)\/\d+\/\d+)?$/,
];

const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const NO_STORE = 'private, no-store';

function noStore<T extends NextResponse>(response: T): T {
  response.headers.set('Cache-Control', NO_STORE);
  return response;
}

function requestOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost ?? request.headers.get('host');
  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProtocol ?? request.nextUrl.protocol.replace(':', '');
  return host ? `${protocol}://${host}` : request.nextUrl.origin;
}

function isSameOriginMutation(request: NextRequest, method: string) {
  if (!mutationMethods.has(method)) return true;

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') return false;

  const origin = request.headers.get('origin');
  if (!origin) return true; // Preserve trusted server-to-server and test clients without browser metadata.

  try {
    return new URL(origin).origin === requestOrigin(request);
  } catch {
    return false;
  }
}

function isAllowed(method: string, path: string) {
  const operation = `${method} ${path}`;
  if (publicOperations.has(operation) || authenticatedOperations.has(operation)) return true;

  return tenantPathPatterns.some((pattern) => pattern.test(path))
    && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

function apiOrigin() {
  const configured = process.env.MG5_API_URL;
  if (!configured) throw new Error('MG5_API_URL is not configured.');
  return configured.replace(/\/$/, '');
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join('/');
  const method = request.method.toUpperCase();
  const isLogin = method === 'POST' && path === 'auth/token';
  const isLogout = method === 'DELETE' && path === 'auth/token';

  if (!isAllowed(method, path)) {
    return noStore(NextResponse.json({ message: 'API route not available.' }, { status: 404 }));
  }

  if (!isSameOriginMutation(request, method)) {
    return noStore(NextResponse.json({ message: 'Cross-origin mutation rejected.' }, { status: 403 }));
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isPublic = publicOperations.has(`${method} ${path}`);
  if (!isPublic && !token) {
    return noStore(NextResponse.json({ message: 'Unauthenticated.' }, { status: 401 }));
  }

  const headers = new Headers({ Accept: 'application/json' });
  const contentType = request.headers.get('content-type');
  const tenantSlug = request.headers.get('x-tenant-slug');
  if (contentType) headers.set('Content-Type', contentType);
  if (tenantSlug) headers.set('X-Tenant-Slug', tenantSlug);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const requestBody = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${apiOrigin()}/api/${path}${request.nextUrl.search}`, {
      method,
      headers,
      body: requestBody,
      cache: 'no-store',
    });
  } catch {
    const unavailableResponse = NextResponse.json(
      { message: 'The Money Guru API is currently unavailable.' },
      { status: 503 },
    );
    if (isLogout) unavailableResponse.cookies.delete(SESSION_COOKIE);
    return noStore(unavailableResponse);
  }

  let response: NextResponse;

  if (isLogin && backendResponse.ok) {
    const payload = await backendResponse.json() as { user: unknown; token?: string };
    if (!payload.token) {
      return noStore(NextResponse.json(
        { message: 'The API did not return a session token.' },
        { status: 502 },
      ));
    }
    response = NextResponse.json({ user: payload.user }, { status: backendResponse.status });
    response.cookies.set(SESSION_COOKIE, payload.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  } else if (isLogout && backendResponse.ok) {
    // Laravel currently returns plain text (`Token deleted`). The browser contract is bodyless.
    response = new NextResponse(null, { status: 204 });
  } else {
    const body = await backendResponse.arrayBuffer();
    response = new NextResponse(body, {
      status: backendResponse.status,
      headers: {
        'Content-Type': backendResponse.headers.get('content-type') ?? 'application/json',
      },
    });
  }

  if (isLogout || backendResponse.status === 401) {
    response.cookies.set(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }

  return noStore(response);
}

export const dynamic = 'force-dynamic';
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
