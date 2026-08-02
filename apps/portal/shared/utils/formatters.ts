import { FORMAT_DATE_ONLY, FORMAT_WITH_TIME } from './constants/formatter.constants';

export const formatDate = (
  date: Date | string,
  options?: {
    locale?: string;
    includeTime?: boolean;
  },
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = options?.locale ?? 'en-US';

  const includeTime = options?.includeTime ?? (typeof date === 'object' && typeof date !== 'string');

  return d.toLocaleDateString(locale, includeTime ? FORMAT_WITH_TIME : FORMAT_DATE_ONLY);
};

export const formatCurrency = (amount: number, locale = 'en-US', currency = 'CLP'): string => {
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
};

export const formatPrice = (price: number, locale = 'en-US'): string => {
  return formatCurrency(price, locale);
};

export const generateId = (): string => crypto.randomUUID();
