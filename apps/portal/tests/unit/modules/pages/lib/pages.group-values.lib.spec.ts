import { describe, expect, it } from 'bun:test';
import { toGroupPropertyValue } from '@/modules/pages/collections/lib/pages.group-values.lib';
import type { PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import { defaultConfig } from './pages.options.fixture';

const property = (key: string, type: PageSchemaProperty['type']): PageSchemaProperty => ({
  config: defaultConfig,
  key,
  label: key,
  options: null,
  required: false,
  type,
});

const properties = [
  property('status', 'STATUS'),
  property('due', 'DATE'),
  property('size', 'NUMBER'),
  property('done', 'CHECKBOX'),
];

describe('what a group is written as', () => {
  it('stays the text of the group for an option', () => {
    expect(toGroupPropertyValue(properties, 'status', 'a1b2c3d4')).toBe('a1b2c3d4');
  });

  it('becomes a date record for a day', () => {
    expect(toGroupPropertyValue(properties, 'due', '2026-03-14')).toEqual({ start: '2026-03-14' });
  });

  it('becomes a number for a number', () => {
    expect(toGroupPropertyValue(properties, 'size', '3')).toBe(3);
  });

  it('becomes a boolean for a checkbox', () => {
    expect(toGroupPropertyValue(properties, 'done', 'true')).toBe(true);
    expect(toGroupPropertyValue(properties, 'done', 'false')).toBe(false);
  });

  it('stays the text of the group when the property is not there', () => {
    expect(toGroupPropertyValue(properties, 'gone', 'x')).toBe('x');
  });
});
