import { describe, expect, it } from 'bun:test';
import { measureDrawnItems, readVisibleIndexes } from '@/modules/pages/collections/lib/pages.virtualization.lib';

const readWindow = (
  top: number,
  overrides: { readonly keepIndex?: number; readonly heights?: Map<number, number> } = {},
) =>
  readVisibleIndexes({
    count: 1000,
    estimateSize: 100,
    heights: overrides.heights ?? new Map(),
    keepIndex: overrides.keepIndex ?? null,
    overscan: 2,
    viewport: { height: 500, offset: 0, top },
  });

describe('lo que se dibuja de una lista larga', () => {
  it('draws the first items and leaves the room of the rest below', () => {
    const drawn = readWindow(0);

    expect(drawn.indexes[0]).toBe(0);
    expect(drawn.indexes.at(-1)).toBe(7);
    expect(drawn.before).toBe(0);
    expect(drawn.after).toBe((1000 - 8) * 100);
  });

  it('follows the scroll, with a margin on each side', () => {
    const drawn = readWindow(5000);

    expect(drawn.indexes[0]).toBe(48);
    expect(drawn.indexes.at(-1)).toBe(57);
    expect(drawn.before).toBe(4800);
  });

  it('keeps room for what is left out so the page does not jump', () => {
    const drawn = readWindow(5000);

    expect(drawn.before + drawn.indexes.length * 100 + drawn.after).toBe(100_000);
  });

  it('draws the item that must stay, even far from the ones in view', () => {
    const drawn = readWindow(0, { keepIndex: 600 });

    expect(drawn.indexes).toContain(600);
    expect(drawn.indexes.slice(0, 8)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('counts the measured height of an item instead of the estimate', () => {
    const drawn = readWindow(0, { heights: new Map([[0, 400]]) });

    expect(drawn.indexes.at(-1)).toBe(4);
    expect(drawn.after).toBe(400 * 0 + (1000 - 5) * 100);
  });

  it('subtracts where the list starts in the page from how far the page is scrolled', () => {
    const drawn = readVisibleIndexes({
      count: 1000,
      estimateSize: 100,
      heights: new Map(),
      keepIndex: null,
      overscan: 0,
      viewport: { height: 300, offset: 1000, top: 1000 },
    });

    expect(drawn.indexes[0]).toBe(0);
  });
});

describe('lo que miden los elementos dibujados', () => {
  const container = (heights: readonly number[]): HTMLElement => {
    const parent = document.createElement('div');
    const marker = document.createElement('div');
    parent.append(marker);
    for (const [index, height] of heights.entries()) {
      const item = document.createElement('div');
      item.dataset.index = String(index);
      item.getBoundingClientRect = () => ({ height }) as DOMRect;
      parent.append(item);
    }
    return marker;
  };

  it('reads the height of each drawn item by its index', () => {
    const measured = measureDrawnItems(container([40, 60]), new Map());

    expect([...(measured ?? [])]).toEqual([
      [0, 40],
      [1, 60],
    ]);
  });

  it('says nothing changed when every height is already known, so the layout does not draw again', () => {
    expect(
      measureDrawnItems(
        container([40, 60]),
        new Map([
          [0, 40],
          [1, 60.4],
        ]),
      ),
    ).toBeNull();
  });

  it('ignores an item that has no height yet, since it is not laid out', () => {
    expect(measureDrawnItems(container([0]), new Map())).toBeNull();
  });
});
