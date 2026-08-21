import { appConfig } from '@/lib/config/app';

const dateTimeFormatter = new Intl.DateTimeFormat(appConfig.locale, {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: appConfig.timezone,
});

const dateOnlyFormatter = new Intl.DateTimeFormat(appConfig.locale, {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

export function formatDateTime(value: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : dateTimeFormatter.format(date);
}

export function formatDateOnly(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Not available';
  const [year, month, day] = value.split('-').map((part) => Number(part));
  const date = new Date(Date.UTC(year!, month! - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month! - 1 || date.getUTCDate() !== day) return 'Not available';
  return dateOnlyFormatter.format(date);
}

export function todayInBusinessTimezone(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: appConfig.timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}
