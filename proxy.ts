import { NextRequest, NextResponse } from 'next/server';

import { legacyRedirects, routes } from '@/lib/config/routes';

export const SESSION_COOKIE = 'mg5_session';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const legacyDestination = legacyRedirects[pathname];

  if (legacyDestination) {
    return NextResponse.redirect(new URL(legacyDestination, request.url), 308);
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === '/') {
    return NextResponse.redirect(new URL(hasSession ? routes.dashboard : routes.login, request.url));
  }

  if (pathname.startsWith('/dashboard') && !hasSession) {
    const loginUrl = new URL(routes.login, request.url);
    loginUrl.searchParams.set('returnTo', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === routes.login && hasSession) {
    return NextResponse.redirect(new URL(routes.dashboard, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/dashboard/:path*'],
};
