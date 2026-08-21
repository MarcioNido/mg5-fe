import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  session: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

vi.mock('@/features/auth/auth-service', () => ({
  authService: {
    login: vi.fn(),
    session: mocks.session,
    logout: mocks.logout,
  },
}));

import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { SessionGate } from '@/features/auth/session-gate';
import { ApiError } from '@/lib/api/error';
import { proxy, SESSION_COOKIE } from '@/proxy';

function LogoutHarness() {
  const { logout } = useAuth();
  const [completed, setCompleted] = useState(false);

  return (
    <>
      <button type="button" onClick={() => void logout().then(() => setCompleted(true))}>Log out</button>
      {completed && <span>Logout completed</span>}
    </>
  );
}

describe('authentication context logout', () => {
  beforeEach(() => {
    mocks.session.mockResolvedValue({ user: { id: 1, name: 'Admin', email: 'admin@example.com' } });
    mocks.logout.mockRejectedValue(new Error('Laravel unavailable'));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('resolves after clearing local state when token revocation fails', async () => {
    render(<AuthProvider><LogoutHarness /></AuthProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByText('Logout completed')).toBeVisible();
    expect(mocks.replace).toHaveBeenCalledWith('/login');
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it('keeps a cookie-backed protected route on a recoverable 503 and retries session recovery', async () => {
    mocks.session
      .mockRejectedValueOnce(new ApiError(503, 'The Money Guru API is currently unavailable.'))
      .mockResolvedValueOnce({ user: { id: 1, name: 'Admin', email: 'admin@example.com' } });
    const loginRequest = new NextRequest('http://localhost:8081/login', {
      headers: { cookie: `${SESSION_COOKIE}=existing-session` },
    });
    expect(proxy(loginRequest).headers.get('location')).toBe('http://localhost:8081/dashboard');

    render(<AuthProvider><SessionGate><div>Protected dashboard</div></SessionGate></AuthProvider>);

    expect(await screen.findByText('Money Guru API is currently unavailable.')).toBeVisible();
    expect(mocks.replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Protected dashboard')).toBeVisible();
    expect(mocks.session).toHaveBeenCalledTimes(2);
  });

  it('still redirects an invalid 401 session to login', async () => {
    mocks.session.mockRejectedValue(new ApiError(401, 'Your session has expired.'));
    render(<AuthProvider><SessionGate><div>Protected dashboard</div></SessionGate></AuthProvider>);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('Money Guru API is currently unavailable.')).not.toBeInTheDocument();
  });
});
