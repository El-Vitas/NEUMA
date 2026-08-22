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
