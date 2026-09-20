import type { PageColumnAlignment, PageRowHeight } from '@company-brain/shared';
import {
  PAGE_COLUMN_ALIGNMENT,
  PAGE_COLUMN_ALIGNMENT_VALUES,
  PAGE_ROW_HEIGHT,
  PAGE_ROW_HEIGHT_VALUES,
} from '@company-brain/shared';
import {
  PAGE_TABLE_ALIGNMENT_CLASSES,
  PAGE_TABLE_CONTROL_HEIGHT_CLASSES,
  PAGE_TABLE_LINE_CLAMP_CLASSES,
  PAGE_TABLE_ROW_PADDING_CLASSES,
} from '../constants/pages.table-appearance.constants';
import type { PageTableAppearance } from '../types/pages.table-appearance.types';

/**
 * Cómo se ve una tabla que pidió tanto alto y partir —o no— su texto.
 *
 * Se responde en dos piezas porque son dos sitios: el aire va en la celda, que
 * es lo que hace crecer la fila, y el corte del texto va dentro, sobre lo que
 * la celda dice. Ponerlo todo en la celda no funciona: una celda de tabla no
 * hace caso a una altura, y un texto no se corta por líneas si no se le dice
 * dónde.
 */
export const readTableAppearance = (rowHeight: PageRowHeight, wrapsText: boolean): PageTableAppearance => ({
  /**
   * La celda de una tabla no deja saltar de línea por su cuenta, así que
   * partir el texto empieza por permitírselo: sin esto, pedirlo no cambiaba
   * nada y la frase seguía cortada a lo ancho.
   */
  cellClass: `${PAGE_TABLE_ROW_PADDING_CLASSES[rowHeight] ?? PAGE_TABLE_ROW_PADDING_CLASSES[PAGE_ROW_HEIGHT.SHORT]} ${
    wrapsText ? 'whitespace-normal' : 'whitespace-nowrap'
  }`,
  controlClass:
    PAGE_TABLE_CONTROL_HEIGHT_CLASSES[rowHeight] ?? PAGE_TABLE_CONTROL_HEIGHT_CLASSES[PAGE_ROW_HEIGHT.SHORT],
  /** Sin partir, una línea y a otra cosa: es lo que deja leer la tabla de un vistazo. */
  contentClass: wrapsText
    ? `break-words ${PAGE_TABLE_LINE_CLAMP_CLASSES[rowHeight] ?? PAGE_TABLE_LINE_CLAMP_CLASSES[PAGE_ROW_HEIGHT.SHORT]}`
    : 'truncate',
});

/**
 * Hacia qué lado se pega una columna.
 *
 * Sin decir nada, al principio: es lo que hace cualquier tabla, y guardar «al
 * principio» sería guardar que nadie eligió.
 */
export const readAlignmentClass = (
  alignments: Readonly<Record<string, PageColumnAlignment>>,
  columnKey: string,
): string => PAGE_TABLE_ALIGNMENT_CLASSES[alignments[columnKey] ?? PAGE_COLUMN_ALIGNMENT.START];

/** El alto que nombra lo elegido en un desplegable, y el más corto cuando no nombra ninguno. */
export const readPageRowHeight = (chosen: string): PageRowHeight =>
  PAGE_ROW_HEIGHT_VALUES.find((candidate) => candidate === chosen) ?? PAGE_ROW_HEIGHT.SHORT;

/** El lado que nombra lo elegido, y el principio cuando no nombra ninguno. */
export const readPageColumnAlignment = (chosen: string): PageColumnAlignment =>
  PAGE_COLUMN_ALIGNMENT_VALUES.find((candidate) => candidate === chosen) ?? PAGE_COLUMN_ALIGNMENT.START;
