import { describe, expect, it } from 'bun:test';
import { findPageDestinations } from '@/modules/pages/editor/menus/lib/pages.editor.destination.lib';
import type { PageDestination } from '@/modules/pages/editor/menus/types/pages.editor.destination.types';

const page = (id: string, label: string): PageDestination => ({ id, label, spaceId: 'space-1' });

const pages: readonly PageDestination[] = [
  page('1', 'Presupuesto anual'),
  page('2', 'Manual de ingeniería'),
  page('3', 'Tareas'),
];

describe('choosing where blocks go', () => {
  it('offers every page while nothing is typed', () => {
    expect(findPageDestinations(pages, '')).toEqual(pages);
    expect(findPageDestinations(pages, '   ')).toEqual(pages);
  });

  it('narrows to the pages whose name answers, whatever the casing', () => {
    expect(findPageDestinations(pages, 'PRESU').map((match) => match.label)).toEqual(['Presupuesto anual']);
    expect(findPageDestinations(pages, 'tare').map((match) => match.label)).toEqual(['Tareas']);
  });

  it('answers to a piece of the name, not only its beginning', () => {
    expect(findPageDestinations(pages, 'anual').map((match) => match.label)).toEqual([
      'Presupuesto anual',
      'Manual de ingeniería',
    ]);
  });

  it('says nothing matches instead of guessing', () => {
    expect(findPageDestinations(pages, 'contabilidad')).toEqual([]);
  });
});
