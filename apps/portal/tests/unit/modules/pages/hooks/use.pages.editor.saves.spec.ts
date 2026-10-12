import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { renderHook } from '@testing-library/react';
import type { PageContent } from '@/modules/pages/types/pages.types';

const sentTitles: string[] = [];
const sentContents: PageContent[] = [];
const arrivals: { readonly arrive: () => void; readonly fail: () => void }[] = [];

const travel = () =>
  new Promise<{ data: Record<string, never> }>((resolve, reject) => {
    arrivals.push({
      arrive: () => {
        resolve({ data: {} });
      },
      fail: () => {
        reject(new TypeError('Failed to fetch'));
      },
    });
  });

const renamePageAction = mock((input: { title: string }) => {
  sentTitles.push(input.title);
  return travel();
});
const replacePageContentAction = mock((input: { content: PageContent }) => {
  sentContents.push(input.content);
  return travel();
});

mock.module('@/modules/pages/server/actions/pages.actions', () => ({ renamePageAction, replacePageContentAction }));
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  updatePageRowPropertiesAction: mock(() => Promise.resolve({ data: {} })),
}));

const { usePagesEditorSaves } = await import('@/modules/pages/editor/hooks/use.pages.editor.saves');

const contentSaying = (words: string): PageContent => ({
  content: [{ content: [{ text: words, type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

const createPage = () => {
  const page = { content: contentSaying('A'), title: 'A' };
  const { result } = renderHook(() =>
    usePagesEditorSaves({
      hasEditableProperties: false,
      pageId: 'page-a',
      readContent: () => page.content,
      readPropertyValues: () => ({}),
      readTitle: () => page.title,
      spaceId: 'space-a',
      storedPropertyValues: null,
    }),
  );
  return { page, saves: result.current };
};

const letEverythingArrive = (): void => {
  for (const travelling of arrivals.splice(0)) travelling.arrive();
};

const loseEverythingOnTheWay = (): void => {
  for (const travelling of arrivals.splice(0)) travelling.fail();
};

describe('lo que se escribe mientras un guardado va en camino', () => {
  beforeEach(() => {
    sentTitles.length = 0;
    sentContents.length = 0;
    arrivals.length = 0;
    renamePageAction.mockClear();
    replacePageContentAction.mockClear();
  });

  // The first save's response must not clear the mark, or text typed afterwards would never be sent.
  it('sends a title typed while the previous one was on its way', async () => {
    const { page, saves } = createPage();

    saves.markTitleChanged();
    const first = saves.saveWhatIsPending();
    page.title = 'AB';
    saves.markTitleChanged();
    letEverythingArrive();
    await first;
    const second = saves.saveWhatIsPending();
    letEverythingArrive();
    await second;

    expect(sentTitles).toEqual(['A', 'AB']);
  });

  it('sends what the page says when it changed while the previous save was on its way', async () => {
    const { page, saves } = createPage();

    saves.markContentChanged();
    const first = saves.saveWhatIsPending();
    page.content = contentSaying('AB');
    saves.markContentChanged();
    letEverythingArrive();
    await first;
    const second = saves.saveWhatIsPending();
    letEverythingArrive();
    await second;

    expect(sentContents).toEqual([contentSaying('A'), contentSaying('AB')]);
  });

  it('sends nothing again once everything arrived', async () => {
    const { saves } = createPage();

    saves.markTitleChanged();
    const first = saves.saveWhatIsPending();
    letEverythingArrive();
    await first;

    expect(await saves.saveWhatIsPending()).toBe(true);
    expect(sentTitles).toEqual(['A']);
  });

  it('keeps waiting what was lost on the way, and sends it again on the next save', async () => {
    const { saves } = createPage();

    saves.markTitleChanged();
    saves.markContentChanged();
    const lost = saves.saveWhatIsPending();
    loseEverythingOnTheWay();

    expect(await lost).toBe(false);
    const retried = saves.saveWhatIsPending();
    letEverythingArrive();
    expect(await retried).toBe(true);
    expect(sentTitles).toEqual(['A', 'A']);
    expect(sentContents).toEqual([contentSaying('A'), contentSaying('A')]);
  });
});
