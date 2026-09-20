import type { PageCalendarDay } from '@company-brain/shared';
import {
  listPageCalendarDays,
  PAGE_PROPERTY_TYPE,
  readPageCalendarMonth,
  shiftPageCalendarMonth,
} from '@company-brain/shared';
import { PAGE_CALENDAR_DATE_LENGTH, PAGE_CALENDAR_MONTH_LENGTH } from '../constants/pages.calendar.constants';
import type { PageCalendarCell } from '../types/pages.calendar.types';
import type { PageRow, PageSchemaProperty } from '../types/pages.schema.types';

/** Las propiedades por las que un calendario puede colocar sus filas: las que responden con una fecha. */
export const listDatePropertyKeys = (properties: readonly PageSchemaProperty[]): readonly string[] =>
  properties.filter((property) => property.type === PAGE_PROPERTY_TYPE.DATE).map((property) => property.key);

/**
 * El día que una fila dice, si dice alguno.
 *
 * Se queda con la fecha y descarta la hora: un calendario de meses coloca por
 * días, y dos filas del mismo día están en el mismo sitio aunque una sea de la
 * mañana y otra de la tarde.
 */
export const readRowDate = (row: PageRow, dateProperty: string): null | string => {
  const value = row.propertyValues?.[dateProperty];
  if (typeof value !== 'string' || value === '') return null;
  return value.slice(0, PAGE_CALENDAR_DATE_LENGTH);
};

/**
 * El mes que hay que enseñar: el pedido, y si no se pidió ninguno, aquel donde
 * caen las filas.
 *
 * Abrir un calendario en el mes de hoy cuando lo que se mira es de marzo deja
 * una rejilla vacía y a alguien preguntándose dónde están sus filas. Así que el
 * mes por defecto es el de la primera fila que tenga fecha, y solo cuando no hay
 * ninguna se cae en el de hoy.
 */
export const resolveCalendarMonth = (
  asked: null | string,
  rows: readonly PageRow[],
  dateProperty: null | string,
  today: string,
): string => {
  const pedido = asked === null ? null : readPageCalendarMonth(asked);
  if (pedido !== null) return pedido;
  const primera =
    dateProperty === null
      ? null
      : (rows.flatMap((row) => {
          const date = readRowDate(row, dateProperty);
          return date === null ? [] : [date];
        })[0] ?? null);
  return (primera ?? today).slice(0, PAGE_CALENDAR_MONTH_LENGTH);
};

/** El mes de al lado, que es a donde llevan las dos flechas. */
export const readNeighbourMonth = (month: string, direction: 'EARLIER' | 'LATER'): string =>
  shiftPageCalendarMonth(month, direction === 'EARLIER' ? -1 : 1);

/**
 * Los días del mes con lo que cae en cada uno.
 *
 * Las filas sin fecha no caen en ningún día y no se pierden: quien dibuja las
 * cuenta aparte, porque una fila que no se ve en ninguna parte es una fila que
 * parece borrada.
 */
export const buildCalendarCells = (
  month: string,
  rows: readonly PageRow[],
  dateOf: (row: PageRow) => null | string,
): readonly PageCalendarCell[] => {
  const byDate = new Map<string, PageRow[]>();
  for (const row of rows) {
    const date = dateOf(row);
    if (date === null) continue;
    const landed = byDate.get(date) ?? [];
    landed.push(row);
    byDate.set(date, landed);
  }
  return listPageCalendarDays(month).map((day: PageCalendarDay) => ({
    ...day,
    rows: byDate.get(day.date) ?? [],
  }));
};

/** Las filas que no dicen ninguna fecha, y que por eso no caen en ningún día. */
export const listRowsWithoutDate = (
  rows: readonly PageRow[],
  dateOf: (row: PageRow) => null | string,
): readonly PageRow[] => rows.filter((row) => dateOf(row) === null);
