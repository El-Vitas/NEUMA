import { describe, expect, it } from 'bun:test';
import { readFilterValueKind } from '@/modules/pages/collections/lib/pages.filter-value.lib';
import { listFilterOperatorsFor } from '@/modules/pages/collections/lib/pages.view-filtering.lib';
import type { PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions, defaultConfig } from './pages.options.fixture';

const property = (
  type: PageSchemaProperty['type'],
  options: PageSchemaProperty['options'] = null,
): PageSchemaProperty => ({ config: defaultConfig, key: 'p', label: 'P', options, required: false, type });

describe('what a condition asks for', () => {
  it('asks for nothing when it only looks at whether there is a value', () => {
    expect(readFilterValueKind(property('RICH_TEXT'), 'IS_EMPTY')).toBe('NONE');
  });

  it('asks for an option of the list for a select, a multi-select and a status', () => {
    const options = asPropertyOptions('a', 'b');

    expect(readFilterValueKind(property('SELECT', options), 'IS')).toBe('OPTION');
    expect(readFilterValueKind(property('MULTI_SELECT', options), 'CONTAINS')).toBe('OPTION');
    expect(readFilterValueKind(property('STATUS', options), 'IS_NOT')).toBe('OPTION');
  });

  it('asks for a group when the condition compares the group of a status', () => {
    expect(readFilterValueKind(property('STATUS', asPropertyOptions('a')), 'IS_IN_GROUP')).toBe('STATUS_GROUP');
  });

  it('asks for a member for a person and for who made or edited a row', () => {
    expect(readFilterValueKind(property('PERSON'), 'CONTAINS')).toBe('PERSON');
    expect(readFilterValueKind(property('CREATED_BY'), 'IS')).toBe('PERSON');
    expect(readFilterValueKind(property('EDITED_BY'), 'IS_NOT')).toBe('PERSON');
  });

  it('asks for a day, a number, a yes or no, or plain text', () => {
    expect(readFilterValueKind(property('DATE'), 'IS_BEFORE')).toBe('DATE');
    expect(readFilterValueKind(property('CREATED_TIME'), 'IS_AFTER')).toBe('DATE');
    expect(readFilterValueKind(property('NUMBER'), 'IS_GREATER_THAN')).toBe('NUMBER');
    expect(readFilterValueKind(property('UNIQUE_ID'), 'IS')).toBe('NUMBER');
    expect(readFilterValueKind(property('CHECKBOX'), 'IS')).toBe('BOOLEAN');
    expect(readFilterValueKind(property('URL'), 'CONTAINS')).toBe('TEXT');
  });
});

describe('which comparisons a property offers', () => {
  it('offers a status the comparison by group on top of the comparison by option', () => {
    expect(listFilterOperatorsFor(property('STATUS', asPropertyOptions('a')))).toEqual(
      expect.arrayContaining(['IS', 'IS_NOT', 'IS_IN_GROUP', 'IS_NOT_IN_GROUP', 'IS_EMPTY', 'IS_NOT_EMPTY']),
    );
  });

  it('offers a relation only whether it holds anything, since naming a row would need a picker', () => {
    expect(listFilterOperatorsFor(property('RELATION'))).toEqual(['IS_EMPTY', 'IS_NOT_EMPTY']);
  });

  it('offers files only whether there are any', () => {
    expect(listFilterOperatorsFor(property('FILES'))).toEqual(['IS_EMPTY', 'IS_NOT_EMPTY']);
  });
});
