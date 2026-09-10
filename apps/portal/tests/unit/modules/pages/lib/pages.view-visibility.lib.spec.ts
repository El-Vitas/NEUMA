import { describe, expect, it } from 'bun:test';
import {
  readShownCardProperties,
  readShownProperties,
} from '@/modules/pages/collections/lib/pages.view-visibility.lib';
import type { PageSchemaProperty, PageSchemaView } from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions } from './pages.options.fixture';

const status: PageSchemaProperty = {
  key: 'status',
  label: 'Status',
  options: asPropertyOptions('todo', 'done'),
  required: false,
  type: 'SELECT',
};
const dueDate: PageSchemaProperty = { key: 'dueDate', label: 'Due date', options: null, required: false, type: 'DATE' };
const properties = [status, dueDate];

const viewShowing = (visibleProperties: readonly string[] | null): PageSchemaView => ({
  configuration: visibleProperties === null ? {} : { visibleProperties: [...visibleProperties] },
  isDefault: true,
  name: 'Board',
  type: 'BOARD',
});

describe('readShownProperties', () => {
  it('shows everything when the view chose nothing', () => {
    expect(readShownProperties(viewShowing(null), properties)).toEqual(properties);
  });

  /** Somebody who put the due date first meant to read it first. */
  it('keeps the order the view chose, not the order the collection has', () => {
    expect(readShownProperties(viewShowing(['dueDate', 'status']), properties)).toEqual([dueDate, status]);
  });

  it('shows nothing when the view chose to show none', () => {
    expect(readShownProperties(viewShowing([]), properties)).toEqual([]);
  });

  it('leaves out a property the collection no longer has', () => {
    expect(readShownProperties(viewShowing(['status', 'removed']), properties)).toEqual([status]);
  });
});

describe('readShownCardProperties', () => {
  /** The column heading already says that value; repeating it on every card inside is noise. */
  it('leaves out of the card what the column already says', () => {
    const board: PageSchemaView = { configuration: { groupBy: 'status' }, isDefault: true, name: 'B', type: 'BOARD' };

    expect(readShownCardProperties(board, properties)).toEqual([dueDate]);
  });

  /**
   * Dejarla fuera es lo que se hace mientras nadie dijo nada. Quien la marcó a
   * mano la quiere ahí, y sacársela igual sería no hacerle caso.
   */
  it('shows the grouping property on the card when somebody asked for it by name', () => {
    const board: PageSchemaView = {
      configuration: { groupBy: 'status', visibleProperties: ['status', 'dueDate'] },
      isDefault: true,
      name: 'B',
      type: 'BOARD',
    };

    expect(readShownCardProperties(board, properties)).toEqual([status, dueDate]);
  });

  it('keeps everything else the view shows', () => {
    const board: PageSchemaView = {
      configuration: { groupBy: 'status', visibleProperties: ['dueDate'] },
      isDefault: true,
      name: 'B',
      type: 'BOARD',
    };

    expect(readShownCardProperties(board, properties)).toEqual([dueDate]);
  });
});
