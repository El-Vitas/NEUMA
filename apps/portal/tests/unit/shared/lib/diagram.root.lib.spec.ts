import { describe, expect, it } from 'bun:test';
import { hideWhatIsHungOnTheRoot } from '@/shared/lib/diagram.root.lib';

const hangOnTheRoot = (name: string, value: unknown): void => {
  Object.defineProperty(document.documentElement, name, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
};

describe('what the interface hangs on the root of the page', () => {
  /**
   * The drawing engine turns a whole diagram into text to write one of its own
   * notes, and that diagram reaches the root of the page. What the interface
   * hangs there points back at itself, so the writing never ends and the
   * drawing dies with it.
   */
  it('is left out of anything that walks the root, and still readable by whoever hung it', () => {
    const bookkeeping: { self: unknown } = { self: null };
    bookkeeping.self = bookkeeping;
    hangOnTheRoot('__reactFiber$prueba', bookkeeping);
    hangOnTheRoot('__reactProps$prueba', bookkeeping);

    hideWhatIsHungOnTheRoot();

    expect(Object.keys(document.documentElement)).not.toContain('__reactFiber$prueba');
    expect(Object.keys(document.documentElement)).not.toContain('__reactProps$prueba');
    expect(() => JSON.stringify({ root: document.documentElement })).not.toThrow();
    expect(Object.getOwnPropertyDescriptor(document.documentElement, '__reactFiber$prueba')?.value).toBe(bookkeeping);
  });

  it('leaves alone what nobody hung there', () => {
    hangOnTheRoot('miPropiaNota', 'algo');

    hideWhatIsHungOnTheRoot();

    expect(Object.keys(document.documentElement)).toContain('miPropiaNota');
  });
});
