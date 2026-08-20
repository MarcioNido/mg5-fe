'use client';

import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { routes } from '@/lib/config/routes';

import { useAuth } from './auth-context';

export function SessionGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace(routes.login);
  }, [loading, router, user]);

  if (loading || !user) {
    return (
      <Stack minHeight="100vh" alignItems="center" justifyContent="center" spacing={2}>
        <CircularProgress size={30} />
        <Typography color="text.secondary">Restoring your secure session…</Typography>
      </Stack>
    );
  }

  return children;
}
