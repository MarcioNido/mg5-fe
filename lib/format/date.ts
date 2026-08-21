import { appConfig } from '@/lib/config/app';

const dateTimeFormatter = new Intl.DateTimeFormat(appConfig.locale, {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: appConfig.timezone,
});

export function formatDateTime(value: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : dateTimeFormatter.format(date);
}
