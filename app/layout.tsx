import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { appConfig } from '@/lib/config/app';

import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: appConfig.name, template: `%s | ${appConfig.name}` },
  description: 'Simple, trustworthy management finance for personal and clinic use.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#00A76F' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-CA">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
