import { describe, expect, it } from 'bun:test';
import { PAGE_COLUMN_ALIGNMENT, PAGE_ROW_HEIGHT, readPageViewConfiguration } from '@company-brain/shared';
import {
  readAlignmentClass,
  readPageColumnAlignment,
  readPageRowHeight,
  readTableAppearance,
} from '@/modules/pages/collections/lib/pages.table-appearance.lib';
import {
  setViewColumnAlignment,
  setViewRowHeight,
  toggleViewWrapsText,
} from '@/modules/pages/collections/lib/pages.view-filtering.lib';
import type { PageSchemaView } from '@/modules/pages/collections/types/pages.schema.types';

const view: PageSchemaView = { configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' };
const configurationOf = (views: readonly PageSchemaView[]) => readPageViewConfiguration(views[0]?.configuration ?? {});

describe('cómo se ve la tabla', () => {
  it('corta el texto en una línea mientras nadie pida partirlo', () => {
    expect(readTableAppearance(PAGE_ROW_HEIGHT.SHORT, false).contentClass).toBe('truncate');
  });

  /** Partido sí, pero con tope: sin él, una fila con un párrafo dentro mediría media pantalla. */
  it('parte el texto en tantas líneas como alto se haya pedido', () => {
    expect(readTableAppearance(PAGE_ROW_HEIGHT.MEDIUM, true).contentClass).toContain('line-clamp-3');
    expect(readTableAppearance(PAGE_ROW_HEIGHT.TALL, true).contentClass).toContain('line-clamp-6');
  });

  /** Una celda de tabla no salta de línea por su cuenta: hay que permitírselo, o pedirlo no cambia nada. */
  it('deja saltar de línea a la celda cuando el texto se parte', () => {
    expect(readTableAppearance(PAGE_ROW_HEIGHT.MEDIUM, true).cellClass).toContain('whitespace-normal');
    expect(readTableAppearance(PAGE_ROW_HEIGHT.MEDIUM, false).cellClass).toContain('whitespace-nowrap');
  });

  /**
   * El aire va en la celda porque es lo que hace crecer la fila: una celda de
   * tabla no hace caso a una altura, así que pedir «alto» con un número no
   * cambiaba nada.
   */
  it('da más aire a la celda alta que a la corta', () => {
    expect(readTableAppearance(PAGE_ROW_HEIGHT.TALL, false).cellClass).not.toBe(
      readTableAppearance(PAGE_ROW_HEIGHT.SHORT, false).cellClass,
    );
  });

  /** Cada lado se dice dos veces: el texto de la celda y la caja que lleva dentro, que ocupa el ancho entero. */
  it('alinea al principio lo que nadie alineó', () => {
    expect(readAlignmentClass({}, 'status')).toContain('text-left');
    expect(readAlignmentClass({}, 'status')).toContain('justify-start');
  });

  it('alinea al final lo que se pidió al final', () => {
    expect(readAlignmentClass({ status: PAGE_COLUMN_ALIGNMENT.END }, 'status')).toContain('text-right');
    expect(readAlignmentClass({ status: PAGE_COLUMN_ALIGNMENT.END }, 'status')).toContain('justify-end');
  });

  it('no se cree cualquier cosa que llegue de un desplegable', () => {
    expect(readPageRowHeight('GIGANTE')).toBe(PAGE_ROW_HEIGHT.SHORT);
    expect(readPageColumnAlignment('DIAGONAL')).toBe(PAGE_COLUMN_ALIGNMENT.START);
  });
});

describe('guardar cómo se ve', () => {
  it('guarda el alto pedido', () => {
    expect(configurationOf(setViewRowHeight([view], 'Table', PAGE_ROW_HEIGHT.TALL)).rowHeight).toBe(
      PAGE_ROW_HEIGHT.TALL,
    );
  });

  /** Partir sin crecer no enseñaría las líneas de más, así que empezar a partir sube el alto. */
  it('sube el alto a medio al empezar a partir el texto', () => {
    const written = configurationOf(toggleViewWrapsText([view], 'Table'));

    expect(written.wrapsText).toBe(true);
    expect(written.rowHeight).toBe(PAGE_ROW_HEIGHT.MEDIUM);
  });

  it('no baja el alto al dejar de partir: quien lo subió puede quererlo alto igual', () => {
    const tall = setViewRowHeight([view], 'Table', PAGE_ROW_HEIGHT.TALL);
    const wrapped = toggleViewWrapsText(tall, 'Table');
    const unwrapped = configurationOf(toggleViewWrapsText(wrapped, 'Table'));

    expect(unwrapped.wrapsText).toBe(false);
    expect(unwrapped.rowHeight).toBe(PAGE_ROW_HEIGHT.TALL);
  });

  it('guarda hacia qué lado se pega una columna', () => {
    expect(
      configurationOf(setViewColumnAlignment([view], 'Table', 'status', PAGE_COLUMN_ALIGNMENT.CENTER)).columnAlignments,
    ).toEqual({ status: PAGE_COLUMN_ALIGNMENT.CENTER });
  });

  /** Al principio es lo que hace cualquier tabla: guardarlo sería guardar que nadie eligió. */
  it('deja de guardar la alineación cuando vuelve al principio', () => {
    const centered = setViewColumnAlignment([view], 'Table', 'status', PAGE_COLUMN_ALIGNMENT.CENTER);
    const back = setViewColumnAlignment(centered, 'Table', 'status', PAGE_COLUMN_ALIGNMENT.START);

    expect(configurationOf(back).columnAlignments).toEqual({});
  });
});
