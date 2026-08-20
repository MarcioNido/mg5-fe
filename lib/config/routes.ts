export const routes = {
  login: '/login',
  dashboard: '/dashboard',
  transactions: '/dashboard/transactions',
  imports: '/dashboard/imports',
  reconciliation: '/dashboard/reconciliation',
  accounts: '/dashboard/accounts',
  categories: '/dashboard/categories',
  rules: '/dashboard/rules',
} as const;

export const legacyRedirects: Readonly<Record<string, string>> = {
  '/dashboard/banking': routes.dashboard,
  '/dashboard/banking/': routes.dashboard,
  '/dashboard/transactions/list': routes.transactions,
  '/dashboard/transactions/list/': routes.transactions,
  '/dashboard/admin/categories/list': routes.categories,
  '/dashboard/admin/categories/list/': routes.categories,
  '/dashboard/admin/rules/list': routes.rules,
  '/dashboard/admin/rules/list/': routes.rules,
};
