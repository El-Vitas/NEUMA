import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PageRow } from '@/modules/pages/collections/types/pages.schema.types';
import { COLLECTION_ACTION_STUBS, PAGE_ACTION_STUBS } from '../stubs/pages.actions.stubs';

const updatePageRowPropertiesAction = mock(
  (_input: unknown): Promise<unknown> => Promise.resolve({ data: { id: 'row-a' } }),
);
const errors: string[] = [];

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  ...COLLECTION_ACTION_STUBS,
  updatePageRowPropertiesAction,
}));
mock.module('@/modules/pages/server/actions/pages.actions', () => PAGE_ACTION_STUBS);

mock.module('sonner', () => ({ toast: { error: (label: string) => errors.push(label) } }));

mock.module('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const { usePagesTimelineMoving } = await import('@/modules/pages/collections/hooks/use.pages.timeline-moving');

const rangeRow: PageRow = {
  id: 'row-a',
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: null,
  propertyValues: { when: { end: '2026-09-18', start: '2026-09-14' } },
  spaceId: 'space-a',
  title: 'Una barra',
};

const twoPropertyRow: PageRow = {
  ...rangeRow,
  propertyValues: { begin: { start: '2026-09-14' }, due: { start: '2026-09-20' } },
};

/** The rows of a screen are one list for as long as the server does not draw them again. */
const rangeRows = [rangeRow];
const twoPropertyRows = [twoPropertyRow];

describe('mover y estirar una barra de la línea de tiempo', () => {
  beforeEach(() => {
    updatePageRowPropertiesAction.mockClear();
    errors.length = 0;
  });

  it('writes the new dates of a moved range in one write, and only the property that holds them', async () => {
    const { result } = renderHook(() => usePagesTimelineMoving('when', null, 'space-a', rangeRows));

    await act(async () => {
      result.current.change('row-a', 'MOVE', 3);
    });

    expect(updatePageRowPropertiesAction.mock.calls).toHaveLength(1);
    expect(updatePageRowPropertiesAction.mock.calls[0]?.[0]).toEqual({
      pageId: 'row-a',
      propertyValues: { when: { end: '2026-09-21', start: '2026-09-17' } },
      spaceId: 'space-a',
    });
  });

  it('writes both properties together when the end lives in another one', async () => {
    const { result } = renderHook(() => usePagesTimelineMoving('begin', 'due', 'space-a', twoPropertyRows));

    await act(async () => {
      result.current.change('row-a', 'MOVE', 7);
    });

    expect(updatePageRowPropertiesAction.mock.calls).toHaveLength(1);
    expect(updatePageRowPropertiesAction.mock.calls[0]?.[0]).toMatchObject({
      propertyValues: { begin: { start: '2026-09-21' }, due: { start: '2026-09-27' } },
    });
  });

  it('stretches only the end of a bar', async () => {
    const { result } = renderHook(() => usePagesTimelineMoving('when', null, 'space-a', rangeRows));

    await act(async () => {
      result.current.change('row-a', 'RESIZE_END', 2);
    });

    expect(updatePageRowPropertiesAction.mock.calls[0]?.[0]).toMatchObject({
      propertyValues: { when: { end: '2026-09-20', start: '2026-09-14' } },
    });
  });

  it('draws the bar where it was dropped before the server answers', async () => {
    let settle = (): void => undefined;
    updatePageRowPropertiesAction.mockImplementationOnce(
      () => new Promise((resolve) => (settle = () => resolve({ data: { id: 'row-a' } }))),
    );
    const { result } = renderHook(() => usePagesTimelineMoving('when', null, 'space-a', rangeRows));

    act(() => result.current.change('row-a', 'MOVE', 1));

    expect(result.current.periodOf(rangeRow)).toEqual({ end: '2026-09-19', start: '2026-09-15' });
    await act(async () => settle());
  });

  it('puts the bar back where it was when the write fails, and says so', async () => {
    updatePageRowPropertiesAction.mockImplementationOnce(() => Promise.resolve({ serverError: 'nope' }));
    const { result } = renderHook(() => usePagesTimelineMoving('when', null, 'space-a', rangeRows));

    await act(async () => {
      result.current.change('row-a', 'MOVE', 1);
    });
    await waitFor(() => expect(errors).toHaveLength(1));

    expect(result.current.periodOf(rangeRow)).toEqual({ end: '2026-09-18', start: '2026-09-14' });
  });

  it('reads the period of a row from its own dates when nothing moved', () => {
    const { result } = renderHook(() => usePagesTimelineMoving('begin', 'due', 'space-a', twoPropertyRows));

    expect(result.current.periodOf(twoPropertyRow)).toEqual({ end: '2026-09-20', start: '2026-09-14' });
  });

  it('writes nothing for a row that has no start', async () => {
    const empty: PageRow = { ...rangeRow, propertyValues: {} };
    const emptyRows = [empty];
    const { result } = renderHook(() => usePagesTimelineMoving('when', null, 'space-a', emptyRows));

    await act(async () => {
      result.current.change('row-a', 'MOVE', 1);
    });

    expect(updatePageRowPropertiesAction).not.toHaveBeenCalled();
  });
});
