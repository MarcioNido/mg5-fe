'use client';

import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { routes } from '@/lib/config/routes';

import { useAuth } from './auth-context';

export function SessionGate({ children }: { children: ReactNode }) {
  const { user, loading, sessionError, retrySession } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !sessionError) router.replace(routes.login);
  }, [loading, router, sessionError, user]);

  if (sessionError) {
    return (
      <Stack minHeight="100vh" alignItems="center" justifyContent="center" spacing={2} px={2}>
        <Alert
          severity="error"
          action={<Button color="inherit" onClick={retrySession}>Retry</Button>}
          sx={{ width: '100%', maxWidth: 560 }}
        >
          {sessionError}
        </Alert>
      </Stack>
    );
  }

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
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
