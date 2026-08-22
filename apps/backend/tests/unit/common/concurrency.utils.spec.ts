import { describe, expect, it } from 'bun:test';
import { mapWithBoundedConcurrency } from '@/common/utils/concurrency.utils';

describe('mapWithBoundedConcurrency', () => {
  it('answers for every item, in the order they were given', async () => {
    const doubled = await mapWithBoundedConcurrency([1, 2, 3, 4, 5], 2, (value) => Promise.resolve(value * 2));

    expect(doubled).toEqual([2, 4, 6, 8, 10]);
  });

  /**
   * The point of the whole thing: each item opens its own transaction, and a
   * hundred of those at once takes every connection there is.
   */
  it('never has more than the allowed number in flight at once', async () => {
    let inFlight = 0;
    let mostAtOnce = 0;

    await mapWithBoundedConcurrency(
      Array.from({ length: 20 }, (_, at) => at),
      3,
      async () => {
        inFlight += 1;
        mostAtOnce = Math.max(mostAtOnce, inFlight);
        await Promise.resolve();
        inFlight -= 1;
      },
    );

    expect(mostAtOnce).toBeLessThanOrEqual(3);
  });

  it('has nothing to do with nothing', async () => {
    expect(await mapWithBoundedConcurrency([], 3, () => Promise.resolve(1))).toEqual([]);
  });
});
