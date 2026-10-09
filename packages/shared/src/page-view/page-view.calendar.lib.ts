import { MILLISECONDS_IN_A_DAY } from '../constants/time.constants.js';
import type { PageCalendarDay } from './page-view.types.js';

const MONTH_LENGTH = 7;
const DATE_LENGTH = 10;
/** Seis semanas enteras: es lo que ocupa el mes más largo que empieza en domingo. */
const DAYS_DRAWN = 42;
/** El domingo es el día 0 del reloj, y la semana empieza el lunes: hay que retroceder seis, no cero. */
const DAYS_BACK_FROM_SUNDAY = 6;

const writeDate = (date: Date): string => date.toISOString().slice(0, DATE_LENGTH);

/**
 * El mes que nombra un texto, o ninguno.
 *
 * Se nombra por el año y el mes —«2026-09»— porque así el nombre ordena solo y
 * se lee de un vistazo, sin tener que compararlo como fecha.
 */
export const readPageCalendarMonth = (value: string): null | string => {
  const month = value.slice(0, MONTH_LENGTH);
  const date = new Date(`${month}-01T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || writeDate(date).slice(0, MONTH_LENGTH) !== month ? null : month;
};

/**
 * El día que cae tantos días después —o antes— de otro.
 *
 * Sirve para mover una entrada sin arrastrarla: un día a cada lado, o una
 * semana entera arriba y abajo, que es lo que significan las flechas sobre una
 * rejilla de siete columnas.
 */
export const shiftPageCalendarDate = (date: string, days: number): string =>
  writeDate(new Date(new Date(`${date}T00:00:00.000Z`).getTime() + days * MILLISECONDS_IN_A_DAY));

/** El mes de antes o el de después, saltando de año cuando toca. */
export const shiftPageCalendarMonth = (month: string, months: number): string => {
  const date = new Date(`${month}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return writeDate(date).slice(0, MONTH_LENGTH);
};

/**
 * Los días con los que se dibuja un mes: seis semanas enteras empezando en
 * lunes.
 *
 * Siempre seis, aunque el mes quepa en cinco. Si la rejilla cambiara de alto de
 * un mes a otro, pasar de página movería todo lo que hay debajo del calendario,
 * y quien mira un día perdería el sitio cada vez que avanza.
 *
 * Los días de antes y de después del mes se dibujan igual —una semana partida
 * por la mitad no es una semana—, pero dicen que no son de este mes para que se
 * vean apagados.
 */
export const listPageCalendarDays = (month: string): readonly PageCalendarDay[] => {
  const first = new Date(`${month}-01T00:00:00.000Z`);
  const weekday = first.getUTCDay();
  const daysBack = weekday === 0 ? DAYS_BACK_FROM_SUNDAY : weekday - 1;
  const start = first.getTime() - daysBack * MILLISECONDS_IN_A_DAY;
  return Array.from({ length: DAYS_DRAWN }, (_unused, position) => {
    const date = writeDate(new Date(start + position * MILLISECONDS_IN_A_DAY));
    return { date, isOfTheMonth: date.slice(0, MONTH_LENGTH) === month };
  });
};
