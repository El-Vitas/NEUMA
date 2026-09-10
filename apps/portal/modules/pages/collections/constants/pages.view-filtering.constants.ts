import type { PageFilterOperator } from '@company-brain/shared';

/**
 * Los operadores que no comparan contra nada: preguntan si hay valor, no cuál.
 * Una condición con uno de ellos no lleva valor, y el que hubiera se descarta.
 */
export const PAGE_FILTER_OPERATORS_WITHOUT_VALUE: readonly PageFilterOperator[] = ['IS_EMPTY', 'IS_NOT_EMPTY'];
