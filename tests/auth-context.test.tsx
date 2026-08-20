import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
});
