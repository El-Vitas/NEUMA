import type { PageFilterGroup, PageFilterOperator } from '@company-brain/shared';
import { PAGE_FILTER_GROUP_OPERATOR } from '@company-brain/shared';

/**
 * Los operadores que no comparan contra nada: preguntan si hay valor, no cuál.
 * Una condición con uno de ellos no lleva valor, y el que hubiera se descarta.
 */
export const PAGE_FILTER_OPERATORS_WITHOUT_VALUE: readonly PageFilterOperator[] = ['IS_EMPTY', 'IS_NOT_EMPTY'];

/** Lo que filtra una vista que no filtra: el grupo vacío que se lee cuando no hay nada guardado. */
export const EMPTY_PAGE_FILTER_GROUP: PageFilterGroup = {
  conditions: [],
  kind: 'GROUP',
  operator: PAGE_FILTER_GROUP_OPERATOR.AND,
};

/** Cuántos niveles ocupa un grupo recién abierto: él mismo, y la condición que se le va a poner dentro. */
export const PAGE_NESTED_FILTER_GROUP_LEVELS = 2;
