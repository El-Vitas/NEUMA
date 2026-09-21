/**
 * Una semana cualquiera que empieza en lunes, solo para nombrar las columnas.
 *
 * Los nombres de los días los pone `Intl` en el idioma de quien mira, y para
 * pedírselos hace falta una fecha: sirve cualquiera, con tal de que sea una
 * semana entera empezando en lunes.
 */
/** Cuántos caracteres ocupan una fecha y un mes escritos como los escribe el calendario. */
export const PAGE_CALENDAR_DATE_LENGTH = 10;
export const PAGE_CALENDAR_MONTH_LENGTH = 7;

/**
 * Cuántos días mueve cada flecha: uno a los lados, una semana arriba y abajo.
 *
 * Es lo que esas teclas significan sobre una rejilla de siete columnas: la de
 * arriba lleva a la casilla de encima, que es el mismo día de la semana pasada.
 */
export const PAGE_CALENDAR_KEYBOARD_STEPS: Readonly<Record<string, number>> = {
  ArrowDown: 7,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
};

export const PAGE_CALENDAR_WEEKDAY_STARTS = [
  '2026-01-05',
  '2026-01-06',
  '2026-01-07',
  '2026-01-08',
  '2026-01-09',
  '2026-01-10',
  '2026-01-11',
] as const;
