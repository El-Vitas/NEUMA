import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PagePropertyValues } from '@/modules/pages/collections/types/pages.schema.types';

const updatePageRowPropertiesAction = mock(
  (_input: unknown): Promise<unknown> => Promise.resolve({ data: { id: 'row-a' } }),
);
const trashPageAction = mock((_input: unknown): Promise<unknown> => Promise.resolve({ data: { id: 'row-a' } }));
const restorePageAction = mock((_input: unknown): Promise<unknown> => Promise.resolve({ data: { id: 'row-a' } }));
const duplicatePageAction = mock((_input: unknown): Promise<unknown> => Promise.resolve({ data: { id: 'copy-a' } }));

const successes: { label: string; undo: (() => void) | undefined }[] = [];
const errors: string[] = [];

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  changePageRowRelationAction: async () => ({ data: 'CHANGED' }),
  listPageRelationCandidatesAction: async () => ({ data: [] }),
  updatePageRowPropertiesAction,
}));

mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  duplicatePageAction,
  restorePageAction,
  trashPageAction,
}));

mock.module('sonner', () => ({
  toast: {
    dismiss: () => undefined,
    error: (label: string) => errors.push(label),
    loading: () => 'progress-toast',
    success: (label: string, options?: { action?: { onClick: () => void } }) =>
      successes.push({ label, undo: options?.action?.onClick }),
  },
}));

mock.module('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values === undefined ? key : `${key}:${values.count}`,
}));

const { usePagesBulkEditing } = await import('@/modules/pages/collections/hooks/use.pages.bulk-editing');

const valuesByRow: Record<string, PagePropertyValues> = {
  'row-a': { status: 'TODO' },
  'row-b': { status: 'DOING' },
};

const renderBulkEditing = () => renderHook(() => usePagesBulkEditing('space-a', valuesByRow, () => undefined));

describe('hacer de una vez lo mismo con varias filas', () => {
  beforeEach(() => {
    updatePageRowPropertiesAction.mockClear();
    trashPageAction.mockClear();
    restorePageAction.mockClear();
    duplicatePageAction.mockClear();
    successes.length = 0;
    errors.length = 0;
  });

  it('counts and undoes only the rows that really went to the trash', async () => {
    trashPageAction.mockImplementation((input: unknown) => {
      const { pageId } = input as { pageId: string };
      return pageId === 'row-b' ? Promise.resolve({ serverError: 'nope' }) : Promise.resolve({ data: { id: pageId } });
    });
    const { result } = renderBulkEditing();

    await act(async () => {
      result.current.trashRows(['row-a', 'row-b']);
    });
    await waitFor(() => expect(successes).toHaveLength(1));

    expect(successes[0]?.label).toBe('bulkTrashed:1');

    act(() => successes[0]?.undo?.());
    await waitFor(() => expect(restorePageAction).toHaveBeenCalledTimes(1));
    expect(restorePageAction).toHaveBeenCalledWith({ pageId: 'row-a', spaceId: 'space-a' });
  });

  it('says how many rows could not be undone instead of reporting the undo as done', async () => {
    const { result } = renderBulkEditing();
    await act(async () => {
      result.current.setPropertyOnRows(['row-a', 'row-b'], 'status', 'DONE');
    });
    await waitFor(() => expect(successes).toHaveLength(1));

    updatePageRowPropertiesAction.mockImplementation((input: unknown) => {
      const { pageId } = input as { pageId: string };
      return pageId === 'row-b' ? Promise.resolve({ serverError: 'unexpected' }) : Promise.resolve({ data: null });
    });
    act(() => successes[0]?.undo?.());

    await waitFor(() => expect(errors).toContain('bulkUndoPartial:1'));
    expect(successes).toHaveLength(1);
    updatePageRowPropertiesAction.mockImplementation(() => Promise.resolve({ data: { id: 'row-a' } }));
  });

  it('tells how many rows could not be changed when only some of them were', async () => {
    updatePageRowPropertiesAction.mockImplementation((input: unknown) => {
      const { pageId } = input as { pageId: string };
      return pageId === 'row-b' ? Promise.resolve({ serverError: 'unexpected' }) : Promise.resolve({ data: null });
    });
    const { result } = renderBulkEditing();

    await act(async () => {
      result.current.setPropertyOnRows(['row-a', 'row-b'], 'status', 'DONE');
    });
    await waitFor(() => expect(successes).toHaveLength(1));

    expect(successes[0]?.label).toBe('bulkAssigned:1');
    expect(errors).toContain('bulkPartial:1');
    updatePageRowPropertiesAction.mockImplementation(() => Promise.resolve({ data: { id: 'row-a' } }));
  });

  it('gives every row back the value it had before', async () => {
    const { result } = renderBulkEditing();

    await act(async () => {
      result.current.setPropertyOnRows(['row-a', 'row-b'], 'status', 'DONE');
    });
    await waitFor(() => expect(successes).toHaveLength(1));

    updatePageRowPropertiesAction.mockClear();
    act(() => successes[0]?.undo?.());
    await waitFor(() => expect(updatePageRowPropertiesAction).toHaveBeenCalledTimes(2));

    const sent = updatePageRowPropertiesAction.mock.calls.map(
      ([input]) => input as { pageId: string; propertyValues: Record<string, unknown> },
    );
    expect(sent.find((one) => one.pageId === 'row-a')?.propertyValues.status).toBe('TODO');
    expect(sent.find((one) => one.pageId === 'row-b')?.propertyValues.status).toBe('DOING');
  });
});
