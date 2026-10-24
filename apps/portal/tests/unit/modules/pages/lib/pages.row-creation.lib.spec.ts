import { describe, expect, it } from 'bun:test';
import { buildNewRowPropertyValues } from '@/modules/pages/collections/lib/pages.board-drag.lib';
import type { PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions, defaultConfig } from './pages.options.fixture';

const properties: PageSchemaProperty[] = [
  {
    config: defaultConfig,
    key: 'status',
    label: 'Status',
    options: asPropertyOptions('doing'),
    required: false,
    type: 'SELECT',
  },
  { config: defaultConfig, key: 'due', label: 'Due', options: null, required: false, type: 'DATE' },
  { config: defaultConfig, key: 'size', label: 'Size', options: null, required: false, type: 'NUMBER' },
];

describe('what a row created inside a column already holds', () => {
  it('is born with the value of the column it was created in', () => {
    expect(buildNewRowPropertyValues(properties, 'status', 'doing')).toEqual({ status: 'doing' });
  });

  it('is born with nothing when it was created among the rows without a value', () => {
    expect(buildNewRowPropertyValues(properties, 'status', 'unassigned')).toEqual({});
  });

  it('is born with a date record when the column is a day', () => {
    expect(buildNewRowPropertyValues(properties, 'due', '2026-03-14')).toEqual({ due: { start: '2026-03-14' } });
  });

  it('is born with a number when the column is a number', () => {
    expect(buildNewRowPropertyValues(properties, 'size', '3')).toEqual({ size: 3 });
  });
});
