import { describe, expect, it } from 'bun:test';
import { PAGE_COLUMN_ALIGNMENT, PAGE_ROW_HEIGHT, readPageViewConfiguration } from '@neuma/shared';
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

  it('parte el texto en tantas líneas como alto se haya pedido', () => {
    expect(readTableAppearance(PAGE_ROW_HEIGHT.MEDIUM, true).contentClass).toContain('line-clamp-3');
    expect(readTableAppearance(PAGE_ROW_HEIGHT.TALL, true).contentClass).toContain('line-clamp-6');
  });

  it('deja saltar de línea a la celda cuando el texto se parte', () => {
    expect(readTableAppearance(PAGE_ROW_HEIGHT.MEDIUM, true).cellClass).toContain('whitespace-normal');
    expect(readTableAppearance(PAGE_ROW_HEIGHT.MEDIUM, false).cellClass).toContain('whitespace-nowrap');
  });

  // The spacing lives on the cell because a table cell ignores an explicit height.
  it('da más aire a la celda alta que a la corta', () => {
    expect(readTableAppearance(PAGE_ROW_HEIGHT.TALL, false).cellClass).not.toBe(
      readTableAppearance(PAGE_ROW_HEIGHT.SHORT, false).cellClass,
    );
  });

  // Each side is set twice: on the cell text and on the full-width box inside it.
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

  it('deja de guardar la alineación cuando vuelve al principio', () => {
    const centered = setViewColumnAlignment([view], 'Table', 'status', PAGE_COLUMN_ALIGNMENT.CENTER);
    const back = setViewColumnAlignment(centered, 'Table', 'status', PAGE_COLUMN_ALIGNMENT.START);

    expect(configurationOf(back).columnAlignments).toEqual({});
  });
});
