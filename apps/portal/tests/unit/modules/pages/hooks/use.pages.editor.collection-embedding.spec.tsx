import { describe, expect, it, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';

mock.module('next-intl', () => ({ useTranslations: () => (key: string) => key }));
mock.module('sonner', () => ({ toast: { error: () => undefined } }));

const sentIds: (string | undefined)[] = [];
const answers: unknown[] = [];

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  createPageCollectionAction: (input: { readonly id?: string }) => {
    sentIds.push(input.id);
    return Promise.resolve(answers.shift());
  },
  readPageCollectionAction: () => Promise.resolve({ data: null }),
}));

const { usePagesEditorCollectionEmbedding } = await import(
  '@/modules/pages/editor/structure/hooks/use.pages.editor.collection-embedding'
);

const creation = {
  parentId: '11111111-1111-4111-8111-111111111111',
  shape: {
    properties: [{ key: 'name', label: 'Name', options: null, required: false, type: 'RICH_TEXT' as const }],
    views: [{ configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' as const }],
  },
  spot: 1,
  title: 'Tasks',
};

const renderEmbedding = () =>
  renderHook(() =>
    usePagesEditorCollectionEmbedding({
      editorViewRef: { current: null },
      onInserted: () => undefined,
      spaceId: '22222222-2222-4222-8222-222222222222',
    }),
  );

describe('creating a collection from the editor', () => {
  it('sends an id the page can take and keeps it when the person tries again after a failure', async () => {
    sentIds.length = 0;
    answers.push({ serverError: 'offline' }, { serverError: 'offline' });
    const { result } = renderEmbedding();

    await act(async () => result.current.create(creation));
    await act(async () => result.current.create(creation));

    expect(sentIds[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(sentIds[1]).toBe(sentIds[0]);
  });

  it('takes a new id for the next collection once the first one was made', async () => {
    sentIds.length = 0;
    answers.push({ data: { id: 'page-1' } }, { data: { id: 'page-2' } });
    const { result } = renderEmbedding();

    await act(async () => result.current.create(creation));
    await act(async () => result.current.create(creation));

    expect(sentIds[1]).not.toBe(sentIds[0]);
  });
});
