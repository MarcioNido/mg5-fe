import { appConfig } from '@/lib/config/app';

export const formatCad = new Intl.NumberFormat(appConfig.locale, {
  style: 'currency',
  currency: appConfig.currency,
}).format;

export function formatDecimalCurrency(value: string | null | undefined, currency: string = appConfig.currency) {
  if (!value || !/^-?\d+(?:\.\d{1,4})?$/.test(value)) return 'Not available';
  // Conversion is presentation-only. Financial state and decisions retain the decimal string.
  const normalizedCurrency = /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : appConfig.currency;
  try {
    return new Intl.NumberFormat(appConfig.locale, {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(Number(value));
  } catch {
    return new Intl.NumberFormat(appConfig.locale, {
      style: 'currency',
      currency: appConfig.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(Number(value));
  }
}
