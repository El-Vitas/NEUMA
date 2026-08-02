import { CURRENCY_FORMATTER, FORMAT_DATE_ONLY, FORMAT_WITH_TIME } from './constants/formatter.constants';

export const formatDate = (
  date: Date | string,
  options?: {
    locale?: string;
    includeTime?: boolean;
  },
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = options?.locale ?? 'es-CL';

  const includeTime = options?.includeTime ?? (typeof date === 'object' && typeof date !== 'string');

  return d.toLocaleDateString(locale, includeTime ? FORMAT_WITH_TIME : FORMAT_DATE_ONLY);
};

export const formatCurrency = (amount: number, _currency?: string): string => {
  return CURRENCY_FORMATTER.format(amount);
};

export const formatPrice = (price: number): string => {
  return formatCurrency(price);
};

export const generateId = (): string => crypto.randomUUID();
