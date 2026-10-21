import { describe, expect, it } from 'bun:test';
import { toRequestedProperty } from '@/modules/pages/collections/lib/pages.schema-request.lib';
import { defaultConfig } from './pages.options.fixture';

describe('what the server is sent for a property', () => {
  it('leaves out every null, since the server reads an absent field as the neutral one', () => {
    const requested = toRequestedProperty({
      config: defaultConfig,
      key: 'status',
      label: 'Status',
      options: [{ color: null, group: 'TO_DO', id: 'abc12345', value: 'Todo' }],
      required: true,
      type: 'STATUS',
    });

    expect(requested).toEqual({
      key: 'status',
      label: 'Status',
      options: [{ group: 'TO_DO', id: 'abc12345', value: 'Todo' }],
      required: true,
      type: 'STATUS',
    });
  });

  it('sends an option that is new without an id of its own', () => {
    const requested = toRequestedProperty({
      key: 'priority',
      label: 'Priority',
      options: [{ color: 'RED', id: null, value: 'Urgent' }],
      required: false,
      type: 'SELECT',
    });

    expect(requested.options).toEqual([{ color: 'RED', value: 'Urgent' }]);
  });

  it('sends only the configuration the type uses', () => {
    const requested = toRequestedProperty({
      config: { ...defaultConfig, allowsMultiple: true, decimals: 2, numberFormat: 'PERCENT', prefix: 'X' },
      key: 'progress',
      label: 'Progress',
      options: null,
      required: false,
      type: 'NUMBER',
    });

    expect(requested.config).toEqual({ decimals: 2, numberFormat: 'PERCENT' });
  });

  it('sends the way back of a relation that is new, and the target it points to', () => {
    const requested = toRequestedProperty({
      config: { ...defaultConfig, targetCollectionId: 'collection-2' },
      key: 'parts',
      label: 'Parts',
      options: null,
      required: false,
      twoWay: true,
      type: 'RELATION',
    });

    expect(requested.twoWay).toBe(true);
    expect(requested.config).toEqual({ targetCollectionId: 'collection-2' });
  });

  it('sends no configuration for a type that has nothing to set', () => {
    const requested = toRequestedProperty({
      config: defaultConfig,
      key: 'notes',
      label: 'Notes',
      options: null,
      required: false,
      type: 'RICH_TEXT',
    });

    expect(requested).toEqual({ key: 'notes', label: 'Notes', required: false, type: 'RICH_TEXT' });
  });
});
