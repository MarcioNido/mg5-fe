'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { UNAUTHORIZED_EVENT } from '@/lib/api/client';
import { ApiError } from '@/lib/api/error';
import { messageFromError } from '@/lib/api/ui-error';
import type { User } from '@/lib/api/types';
import { routes } from '@/lib/config/routes';

import { authService } from './auth-service';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  sessionError: string | null;
  retrySession: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionAttempt, setSessionAttempt] = useState(0);

  const clearSession = useCallback(() => {
    setUser(null);
    setLoading(false);
    setSessionError(null);
    router.replace(routes.login);
    router.refresh();
  }, [router]);

  useEffect(() => {
    let active = true;

    authService.session()
      .then(({ user: sessionUser }) => {
        if (active) {
          setUser(sessionUser);
          setSessionError(null);
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setUser(null);
        if (reason instanceof ApiError && reason.status === 401) {
          setSessionError(null);
          return;
        }
        setSessionError(reason instanceof ApiError && reason.status === 503
          ? 'Money Guru API is currently unavailable.'
          : messageFromError(reason, 'Unable to restore your secure session.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [sessionAttempt]);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, clearSession);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, clearSession);
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setUser(response.user);
    setLoading(false);
    setSessionError(null);
  }, []);

  const retrySession = useCallback(() => {
    setLoading(true);
    setSessionError(null);
    setSessionAttempt((value) => value + 1);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // The BFF clears its HttpOnly cookie even when Laravel cannot revoke the token.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, loading, sessionError, retrySession, login, logout }),
    [user, loading, sessionError, retrySession, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
