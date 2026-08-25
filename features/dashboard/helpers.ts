import { accountTypeLabels } from '@/features/accounts/types';
import { categoryTypeLabels } from '@/features/categories/types';
import { appConfig } from '@/lib/config/app';
import { formatDecimalCurrency } from '@/lib/format/money';

import type { DashboardAccount, DashboardCategoryGroup, ReconciliationStatus } from './types';

const MONTH_PATTERN = /^(?!0000)(\d{4})-(\d{2})$/;
const EXACT_DECIMAL_PATTERN = /^-?\d+\.\d{4}$/;

export const reconciliationLabels: Record<ReconciliationStatus, string> = {
  never_reconciled: 'Not reconciled',
  up_to_date: 'Up to date',
  activity_after_reconciliation: 'New activity since reconciliation',
  latest_attempt_invalid: 'Reconciliation needs attention',
};

export const reconciliationExplanations: Record<Exclude<ReconciliationStatus, 'up_to_date'>, string> = {
  never_reconciled: 'No bank balance has been confirmed for this account.',
  activity_after_reconciliation: 'Posted activity exists after the latest valid reconciled-through date.',
  latest_attempt_invalid: 'The latest comparison no longer agrees with MG5’s calculated balance.',
};

export function currentTorontoMonth(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: appConfig.timezone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}`;
}

export function isStrictMonth(value: string) {
  const match = MONTH_PATTERN.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

export function isSelectableDashboardMonth(value: string, maximumMonth: string) {
  return isStrictMonth(value) && isStrictMonth(maximumMonth) && value <= maximumMonth;
}

export function formatDashboardMonth(value: string) {
  if (!isStrictMonth(value)) return 'Not available';
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(appConfig.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year!, month! - 1, 1)));
}

export function exactDecimalSign(value: string): -1 | 0 | 1 | null {
  if (!EXACT_DECIMAL_PATTERN.test(value)) return null;
  const unsigned = value.startsWith('-') ? value.slice(1) : value;
  if (/^0+\.0{4}$/.test(unsigned)) return 0;
  return value.startsWith('-') ? -1 : 1;
}

export function formatDashboardMoney(value: string, currency: string) {
  if (exactDecimalSign(value) === null || !/^[A-Z]{3}$/.test(currency)) return 'Not available';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'Not available';
  return formatDecimalCurrency(value, currency);
}

export function accountTypeLabel(account: DashboardAccount) {
  return accountTypeLabels[account.type];
}

export function groupTypeLabel(group: DashboardCategoryGroup) {
  return categoryTypeLabels[group.category.type];
}
