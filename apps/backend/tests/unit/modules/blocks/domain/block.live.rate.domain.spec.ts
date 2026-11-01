import { describe, expect, it } from 'bun:test';
import { createMessageWindow, registerMessage } from '@/modules/blocks/domain/block.live.rate.domain';

const LIMIT = { maxMessages: 3, windowMs: 1000 };
const START = 10_000;

describe('registerMessage', () => {
  it('allows messages up to the limit inside one window', () => {
    let window = createMessageWindow(START);
    const outcomes: boolean[] = [];

    for (let index = 0; index < LIMIT.maxMessages + 2; index += 1) {
      const registered = registerMessage(window, START + index, LIMIT);
      window = registered.window;
      outcomes.push(registered.isAllowed);
    }

    expect(outcomes).toEqual([true, true, true, false, false]);
  });

  it('starts a fresh window once the previous one has passed', () => {
    const exhausted = { count: LIMIT.maxMessages, startedAt: START };

    const registered = registerMessage(exhausted, START + LIMIT.windowMs, LIMIT);

    expect(registered.isAllowed).toBe(true);
    expect(registered.window).toEqual({ count: 1, startedAt: START + LIMIT.windowMs });
  });
});
