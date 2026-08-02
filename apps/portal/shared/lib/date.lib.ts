import { APP_TIME_ZONE } from '../constants/date.constants';

export const formatChileDate = (date: Date = new Date(), locale = 'en-US'): string => {
  return date.toLocaleDateString(locale, { timeZone: APP_TIME_ZONE });
};

export const formatChileDateInput = (date: Date = new Date()): string => {
  return date.toLocaleDateString('en-CA', { timeZone: APP_TIME_ZONE });
};
