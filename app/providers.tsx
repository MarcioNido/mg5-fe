'use client';

import type { ReactNode } from 'react';

import { AuthProvider } from '@/features/auth/auth-context';

import { ThemeProvider } from './theme';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
