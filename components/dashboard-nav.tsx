import AccountBalanceRounded from '@mui/icons-material/AccountBalanceRounded';
import CategoryRounded from '@mui/icons-material/CategoryRounded';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import FactCheckRounded from '@mui/icons-material/FactCheckRounded';
import FileUploadRounded from '@mui/icons-material/FileUploadRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import RuleRounded from '@mui/icons-material/RuleRounded';
import type { ReactNode } from 'react';

import { routes } from '@/lib/config/routes';

export type NavigationItem = { label: string; href: string; icon: ReactNode };

export const navigation: NavigationItem[] = [
  { label: 'Dashboard', href: routes.dashboard, icon: <DashboardRounded /> },
  { label: 'Transactions', href: routes.transactions, icon: <ReceiptLongRounded /> },
  { label: 'Imports', href: routes.imports, icon: <FileUploadRounded /> },
  { label: 'Reconciliation', href: routes.reconciliation, icon: <FactCheckRounded /> },
  { label: 'Accounts', href: routes.accounts, icon: <AccountBalanceRounded /> },
  { label: 'Categories', href: routes.categories, icon: <CategoryRounded /> },
  { label: 'Rules', href: routes.rules, icon: <RuleRounded /> },
];
