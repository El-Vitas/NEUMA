import { APP_TIME_ZONE } from '@/shared/constants/date.constants';

export const FORMAT_WITH_TIME: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: APP_TIME_ZONE,
};

export const FORMAT_DATE_ONLY: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: APP_TIME_ZONE,
};
