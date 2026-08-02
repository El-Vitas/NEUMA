import { CHILE_TZ } from '../constants/date.constants';

export const formatChileDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('es-CL', { timeZone: CHILE_TZ });
};

export const formatChileDateInput = (date: Date = new Date()): string => {
  return date.toLocaleDateString('en-CA', { timeZone: CHILE_TZ });
};
