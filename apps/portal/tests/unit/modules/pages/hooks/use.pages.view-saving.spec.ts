import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import type { PageSchema, PageSchemaView } from '@/modules/pages/collections/types/pages.schema.types';

interface SentOperations {
  readonly operations: readonly {
    readonly args: unknown;
    readonly command: string;
    readonly path: readonly string[];
  }[];
  readonly viewId: string;
}

const applyPageViewOperationsAction = mock((_input: unknown) =>
  Promise.resolve({ data: { configuration: {}, id: 'view-table', version: 1 } }),
);

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  applyPageViewOperationsAction,
  changePageRowRelationAction: async () => ({ data: 'CHANGED' }),
  listPageRelationCandidatesAction: async () => ({ data: [] }),
}));

mock.module('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const { usePagesViewSaving } = await import('@/modules/pages/collections/hooks/use.pages.view-saving');

const viewNamed = (name: string, configuration: Record<string, unknown>): PageSchemaView => ({
  configuration,
  id: `view-${name.toLowerCase()}`,
  isDefault: true,
  name,
  type: 'TABLE',
  version: 0,
});

const schemaWith = (views: readonly PageSchemaView[]): PageSchema => ({
  pageId: 'page-a',
  properties: [],
  spaceId: 'space-a',
  views,
});

const lastSent = (): SentOperations => {
  const [sent] = applyPageViewOperationsAction.mock.calls.at(-1) as [SentOperations];
  return sent;
};

describe('lo que una vista dice de sí misma, al guardarlo', () => {
  beforeEach(() => {
    applyPageViewOperationsAction.mockClear();
  });

  // The collection settings open beside the page and change the same views: a change must not carry the old value
  // of a key someone else just set, so only what changed travels.
  it('sends only the key that changed, and not what the collection said when it opened', () => {
    const { rerender, result } = renderHook(({ schema }) => usePagesViewSaving(schema, 'Table', 'space-a'), {
      initialProps: { schema: schemaWith([viewNamed('Table', {})]) },
    });

    rerender({ schema: schemaWith([viewNamed('Table', { groupBy: 'status' })]) });
    act(() => {
      result.current.apply((current) =>
        current.map((view) => ({ ...view, configuration: { ...view.configuration, rowHeight: 'TALL' } })),
      );
    });

    expect(applyPageViewOperationsAction).toHaveBeenCalledTimes(1);
    expect(lastSent().viewId).toBe('view-table');
    expect(lastSent().operations).toEqual([{ args: 'TALL', command: 'set', path: ['configuration', 'rowHeight'] }]);
  });

  it('sends nothing when nothing changed', () => {
    const { result } = renderHook(() => usePagesViewSaving(schemaWith([viewNamed('Table', {})]), 'Table', 'space-a'));

    act(() => {
      result.current.apply((current) => current);
    });

    expect(applyPageViewOperationsAction).not.toHaveBeenCalled();
  });

  it('leaves what is still travelling alone', () => {
    let settle = (): void => undefined;
    applyPageViewOperationsAction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          settle = () => resolve({ data: { configuration: {}, id: 'view-table', version: 1 } });
        }),
    );
    const { rerender, result } = renderHook(({ schema }) => usePagesViewSaving(schema, 'Table', 'space-a'), {
      initialProps: { schema: schemaWith([viewNamed('Table', {})]) },
    });

    act(() => {
      result.current.apply((current) =>
        current.map((view) => ({ ...view, configuration: { ...view.configuration, rowHeight: 'TALL' } })),
      );
    });
    rerender({ schema: schemaWith([viewNamed('Table', { rowHeight: 'SHORT' })]) });

    expect(result.current.views[0]?.configuration.rowHeight).toBe('TALL');
    act(() => settle());
  });
});
