import { describe, expect, it } from 'bun:test';
import { mapWithConcurrency } from '@/modules/pages/collections/lib/pages.bulk-concurrency.lib';

describe('mapWithConcurrency', () => {
  it('never runs more than the limit at once, and answers in the order of the items', async () => {
    let running = 0;
    let peak = 0;
    const items = Array.from({ length: 20 }, (_, index) => index);

    const answers = await mapWithConcurrency(items, 8, async (item) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 1));
      running -= 1;
      return item * 2;
    });

    expect(peak).toBe(8);
    expect(answers).toEqual(items.map((item) => item * 2));
  });

  it('tells how many are done after each one', async () => {
    const progress: number[] = [];

    await mapWithConcurrency(
      ['a', 'b', 'c'],
      2,
      async (item) => item,
      (done) => progress.push(done),
    );

    expect(progress).toEqual([1, 2, 3]);
  });

  it('handles no items', async () => {
    expect(await mapWithConcurrency([], 8, async (item: number) => item)).toEqual([]);
  });
});
