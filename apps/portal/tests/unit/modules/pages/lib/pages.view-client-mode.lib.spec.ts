import { describe, expect, it } from 'bun:test';
import { decideViewClientMode } from '@/modules/pages/collections/lib/pages.view-client-mode.lib';
import type { PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions, defaultConfig } from './pages.options.fixture';
import { buildView } from './pages.views.fixture';

const property = (key: string, type: PageSchemaProperty['type'], options?: readonly string[]): PageSchemaProperty => ({
  config: defaultConfig,
  key,
  label: key,
  options: options === undefined ? null : asPropertyOptions(...options),
  required: false,
  type,
});

const properties: readonly PageSchemaProperty[] = [
  property('title', 'TITLE'),
  property('status', 'SELECT', ['todo', 'done']),
  property('parent', 'RELATION'),
  property('total', 'FORMULA'),
];

describe('decideViewClientMode', () => {
  it('lets the browser do a small collection that asks for nothing only the server can answer', () => {
    const decision = decideViewClientMode({
      properties,
      quickFilter: null,
      search: '',
      view: buildView('Board', 'BOARD', { configuration: { groupBy: 'status' } }),
      visibleRowCount: 2000,
    });

    expect(decision).toEqual({ isClientMode: true });
  });

  it('leaves a big collection to the server', () => {
    const decision = decideViewClientMode({
      properties,
      quickFilter: null,
      search: '',
      view: buildView('Table', 'TABLE'),
      visibleRowCount: 10_001,
    });

    expect(decision).toEqual({ isClientMode: false, reason: 'too-many-rows' });
  });

  it('leaves a search to the server, which normalizes accents and case', () => {
    const decision = decideViewClientMode({
      properties,
      quickFilter: null,
      search: 'ana',
      view: buildView('Table', 'TABLE'),
      visibleRowCount: 10,
    });

    expect(decision).toEqual({ isClientMode: false, reason: 'search' });
  });

  it('leaves a sort by a formula to the server', () => {
    const decision = decideViewClientMode({
      properties,
      quickFilter: null,
      search: '',
      view: buildView('Table', 'TABLE', {
        configuration: { sorts: [{ direction: 'ASCENDING', propertyKey: 'total' }] },
      }),
      visibleRowCount: 10,
    });

    expect(decision).toEqual({ isClientMode: false, reason: 'server-only-property' });
  });

  it('leaves a quick filter by a relation to the server', () => {
    const decision = decideViewClientMode({
      properties,
      quickFilter: { kind: 'CONDITION', operator: 'IS_NOT_EMPTY', propertyKey: 'parent', value: null },
      search: '',
      view: buildView('Table', 'TABLE'),
      visibleRowCount: 10,
    });

    expect(decision).toEqual({ isClientMode: false, reason: 'server-only-property' });
  });

  it('leaves a filter by a relation inside a group of the view to the server', () => {
    const decision = decideViewClientMode({
      properties,
      quickFilter: null,
      search: '',
      view: buildView('Table', 'TABLE', {
        configuration: {
          filter: {
            conditions: [{ kind: 'CONDITION', operator: 'IS_NOT_EMPTY', propertyKey: 'parent', value: null }],
            kind: 'GROUP',
            operator: 'AND',
          },
        },
      }),
      visibleRowCount: 10,
    });

    expect(decision).toEqual({ isClientMode: false, reason: 'server-only-property' });
  });
});
