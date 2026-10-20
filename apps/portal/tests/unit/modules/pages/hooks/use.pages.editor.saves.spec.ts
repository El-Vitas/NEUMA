import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { renderHook } from '@testing-library/react';

const sentTitles: string[] = [];
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

mock.module('@/modules/pages/server/actions/pages.actions', () => ({ renamePageAction }));
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  updatePageRowPropertiesAction: mock(() => Promise.resolve({ data: {} })),
}));

const { usePagesEditorSaves } = await import('@/modules/pages/editor/hooks/use.pages.editor.saves');

const createPage = () => {
  const page = { title: 'A' };
  const { result } = renderHook(() =>
    usePagesEditorSaves({
      hasEditableProperties: false,
      pageId: 'page-a',
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
    arrivals.length = 0;
    renamePageAction.mockClear();
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
    const lost = saves.saveWhatIsPending();
    loseEverythingOnTheWay();

    expect(await lost).toBe(false);
    const retried = saves.saveWhatIsPending();
    letEverythingArrive();
    expect(await retried).toBe(true);
    expect(sentTitles).toEqual(['A', 'A']);
  });
});
