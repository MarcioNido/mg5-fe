import type { ReactNode } from 'react';

import { DashboardShell } from '@/components/dashboard-shell';
import { SessionGate } from '@/features/auth/session-gate';
import { TenantProvider } from '@/features/tenants/tenant-context';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGate>
      <TenantProvider>
        <DashboardShell>{children}</DashboardShell>
      </TenantProvider>
    </SessionGate>
  );
}
