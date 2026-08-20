import { appConfig } from '@/lib/config/app';

export const formatCad = new Intl.NumberFormat(appConfig.locale, {
  style: 'currency',
  currency: appConfig.currency,
}).format;
