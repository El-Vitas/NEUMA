export const APP_TIME_ZONE = 'America/Santiago';

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

export const CURRENCY_FORMATTER = new Intl.NumberFormat('es-CL', {
  currency: 'CLP',
  minimumFractionDigits: 0,
  style: 'currency',
});
