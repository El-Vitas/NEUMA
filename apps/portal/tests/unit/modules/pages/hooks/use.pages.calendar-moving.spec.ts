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

const { usePagesCalendarMoving } = await import('@/modules/pages/collections/hooks/use.pages.calendar-moving');

const row: PageRow = {
  id: 'row-a',
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: null,
  propertyValues: {},
  spaceId: 'space-a',
  title: 'Una entrada',
};

describe('llevar una entrada a otro día', () => {
  beforeEach(() => {
    updatePageRowPropertiesAction.mockClear();
    errors.length = 0;
  });

  it('shows the entry on the new day before the server answers', async () => {
    let settle = (): void => undefined;
    updatePageRowPropertiesAction.mockImplementationOnce(
      () => new Promise((resolve) => (settle = () => resolve({ data: { id: 'row-a' } }))),
    );
    const { result } = renderHook(() => usePagesCalendarMoving('due', 'space-a', [row]));

    act(() => result.current.moveTo('row-a', '2026-03-14'));

    expect(result.current.dateOf(row, '2026-03-01')).toBe('2026-03-14');
    await act(async () => settle());
  });

  it('writes the day as a date record', async () => {
    const { result } = renderHook(() => usePagesCalendarMoving('due', 'space-a', [row]));

    await act(async () => {
      result.current.moveTo('row-a', '2026-03-14');
    });

    expect(updatePageRowPropertiesAction.mock.calls[0]?.[0]).toEqual({
      pageId: 'row-a',
      propertyValues: { due: { start: '2026-03-14' } },
      spaceId: 'space-a',
    });
  });

  it('keeps the length of a range when it is moved', async () => {
    const ranged: PageRow = { ...row, propertyValues: { due: { end: '2026-03-03', start: '2026-03-01' } } };
    const { result } = renderHook(() => usePagesCalendarMoving('due', 'space-a', [ranged]));

    await act(async () => {
      result.current.moveTo('row-a', '2026-03-10');
    });

    expect(updatePageRowPropertiesAction.mock.calls[0]?.[0]).toMatchObject({
      propertyValues: { due: { end: '2026-03-12', start: '2026-03-10' } },
    });
  });

  it('lands a range by the day it was grabbed by, not by its first day', async () => {
    const ranged: PageRow = { ...row, propertyValues: { due: { end: '2026-03-04', start: '2026-03-02' } } };
    const { result } = renderHook(() => usePagesCalendarMoving('due', 'space-a', [ranged]));

    act(() => result.current.take('row-a', 2));
    await act(async () => {
      result.current.moveTo('row-a', '2026-03-10');
    });

    expect(updatePageRowPropertiesAction.mock.calls[0]?.[0]).toMatchObject({
      propertyValues: { due: { end: '2026-03-10', start: '2026-03-08' } },
    });
  });

  it('tells the dates the row has now, the length of a range included, before the server answers', async () => {
    let settle = (): void => undefined;
    updatePageRowPropertiesAction.mockImplementationOnce(
      () => new Promise((resolve) => (settle = () => resolve({ data: { id: 'row-a' } }))),
    );
    const ranged: PageRow = { ...row, propertyValues: { due: { end: '2026-03-03', start: '2026-03-01' } } };
    const { result } = renderHook(() => usePagesCalendarMoving('due', 'space-a', [ranged]));

    act(() => result.current.moveTo('row-a', '2026-03-10'));

    expect(result.current.valueOf(ranged)).toEqual({ end: '2026-03-12', start: '2026-03-10' });
    await act(async () => settle());
  });

  it('puts the entry back where it was when the write fails', async () => {
    updatePageRowPropertiesAction.mockImplementationOnce(() => Promise.resolve({ serverError: 'nope' }));
    const { result } = renderHook(() => usePagesCalendarMoving('due', 'space-a', [row]));

    await act(async () => {
      result.current.moveTo('row-a', '2026-03-14');
    });
    await waitFor(() => expect(errors).toHaveLength(1));

    expect(result.current.dateOf(row, '2026-03-01')).toBe('2026-03-01');
  });

  it('writes nothing when the view has no date property', () => {
    const { result } = renderHook(() => usePagesCalendarMoving(null, 'space-a', [row]));

    act(() => result.current.moveTo('row-a', '2026-03-14'));

    expect(updatePageRowPropertiesAction).not.toHaveBeenCalled();
    expect(result.current.dateOf(row, '2026-03-01')).toBe('2026-03-01');
  });
});
