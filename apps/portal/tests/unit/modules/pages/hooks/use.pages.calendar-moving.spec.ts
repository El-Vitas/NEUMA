import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PageRow } from '@/modules/pages/collections/types/pages.schema.types';

const updatePageRowPropertiesAction = mock(
  (_input: unknown): Promise<unknown> => Promise.resolve({ data: { id: 'row-a' } }),
);
const errors: string[] = [];

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  updatePageRowPropertiesAction,
}));

mock.module('sonner', () => ({ toast: { error: (label: string) => errors.push(label) } }));

mock.module('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const { usePagesCalendarMoving } = await import('@/modules/pages/collections/hooks/use.pages.calendar-moving');

const row: PageRow = {
  id: 'row-a',
  lifecycle: 'ACTIVE',
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
    const { result } = renderHook(() => usePagesCalendarMoving('due', 'space-a'));

    act(() => result.current.moveTo('row-a', '2026-03-14'));

    expect(result.current.dateOf(row, '2026-03-01')).toBe('2026-03-14');
    await act(async () => settle());
  });

  it('puts the entry back where it was when the write fails', async () => {
    updatePageRowPropertiesAction.mockImplementationOnce(() => Promise.resolve({ serverError: 'nope' }));
    const { result } = renderHook(() => usePagesCalendarMoving('due', 'space-a'));

    await act(async () => {
      result.current.moveTo('row-a', '2026-03-14');
    });
    await waitFor(() => expect(errors).toHaveLength(1));

    expect(result.current.dateOf(row, '2026-03-01')).toBe('2026-03-01');
  });

  it('writes nothing when the view has no date property', () => {
    const { result } = renderHook(() => usePagesCalendarMoving(null, 'space-a'));

    act(() => result.current.moveTo('row-a', '2026-03-14'));

    expect(updatePageRowPropertiesAction).not.toHaveBeenCalled();
    expect(result.current.dateOf(row, '2026-03-01')).toBe('2026-03-01');
  });
});
