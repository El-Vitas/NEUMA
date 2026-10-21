import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import type { PageSchema, PageSchemaView } from '@/modules/pages/collections/types/pages.schema.types';

const updatePageViewConfigurationAction = mock((_input: unknown) =>
  Promise.resolve({ data: { pageId: 'page-a', properties: [], spaceId: 'space-a', views: [] } }),
);

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  changePageRowRelationAction: async () => ({ data: 'CHANGED' }),
  listPageRelationCandidatesAction: async () => ({ data: [] }),
  updatePageViewConfigurationAction,
}));

mock.module('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const { usePagesViewSaving } = await import('@/modules/pages/collections/hooks/use.pages.view-saving');

const viewNamed = (name: string, configuration: Record<string, unknown>): PageSchemaView => ({
  configuration,
  isDefault: true,
  name,
  type: 'TABLE',
});

const schemaWith = (views: readonly PageSchemaView[]): PageSchema => ({
  pageId: 'page-a',
  properties: [],
  spaceId: 'space-a',
  views,
});

describe('lo que una vista dice de sí misma, al guardarlo', () => {
  beforeEach(() => {
    updatePageViewConfigurationAction.mockClear();
  });

  // The collection settings open beside the page and change the same views: saving a filter from the opening snapshot
  // would wipe a grouping just set.
  it('keeps what the collection says now, not what it said when it opened', () => {
    const { rerender, result } = renderHook(({ schema }) => usePagesViewSaving(schema, 'Table', 'space-a'), {
      initialProps: { schema: schemaWith([viewNamed('Table', {})]) },
    });

    rerender({ schema: schemaWith([viewNamed('Table', { groupBy: 'status' })]) });
    act(() => {
      result.current.apply((current) =>
        current.map((view) => ({ ...view, configuration: { ...view.configuration, filter: null } })),
      );
    });

    expect(updatePageViewConfigurationAction).toHaveBeenCalledTimes(1);
    const [sent] = updatePageViewConfigurationAction.mock.calls[0] as [{ configuration: Record<string, unknown> }];
    expect(sent.configuration.groupBy).toBe('status');
  });

  it('leaves what is still travelling alone', () => {
    let settle = (): void => undefined;
    updatePageViewConfigurationAction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          settle = () => resolve({ data: { pageId: 'page-a', properties: [], spaceId: 'space-a', views: [] } });
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
