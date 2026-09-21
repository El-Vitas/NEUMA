import { MILLISECONDS_IN_A_DAY } from '../constants/time.constants.js';
import type { PageDateBucket } from './page-view.types.js';
import { PAGE_DATE_BUCKET } from './page-view.types.js';

const DATE_LENGTH = 10;
const MONTH_LENGTH = 7;
/** El domingo es el día 0 en el reloj, y la semana empieza el lunes: hay que retroceder seis, no cero. */
const DAYS_BACK_FROM_SUNDAY = 6;

const readDate = (value: string): Date | null => {
  const date = new Date(`${value.slice(0, DATE_LENGTH)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const writeDate = (date: Date): string => date.toISOString().slice(0, DATE_LENGTH);

const readMondayOf = (date: Date): Date => {
  const weekday = date.getUTCDay();
  const daysBack = weekday === 0 ? DAYS_BACK_FROM_SUNDAY : weekday - 1;
  return new Date(date.getTime() - daysBack * MILLISECONDS_IN_A_DAY);
};

/**
 * El grupo al que va una fecha según el tramo que la vista pidió.
 *
 * El grupo se nombra por su principio —el día, el lunes de esa semana, el mes—
 * porque así el nombre ordena solo: puestos en fila, los nombres quedan en el
 * orden en que pasó el tiempo sin que nadie tenga que compararlos como fechas.
 *
 * Lo que no es una fecha no nombra ningún grupo, y quien reparte lo manda al de
 * las filas sin valor.
 */
export const readPageDateBucketKey = (value: string, bucket: PageDateBucket): null | string => {
  const date = readDate(value);
  if (date === null) return null;
  switch (bucket) {
    case PAGE_DATE_BUCKET.WEEK:
      return writeDate(readMondayOf(date));
    case PAGE_DATE_BUCKET.MONTH:
      return writeDate(date).slice(0, MONTH_LENGTH);
    default:
      return writeDate(date);
  }
};
