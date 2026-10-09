import { describe, expect, it } from 'bun:test';
import { isOneOf } from './value-list.lib.js';

const COLORS = ['red', 'blue'] as const;

describe('isOneOf', () => {
  it('says whether a value is one of a fixed list', () => {
    expect(isOneOf(COLORS, 'red')).toBe(true);
    expect(isOneOf(COLORS, 'green')).toBe(false);
  });

  /** Un texto cualquiera, una vez confirmado, se usa como lo que es: sin forzarlo con un cast. */
  it('lets a confirmed value be used as one of the list', () => {
    const color: string = 'blue';
    const picked: (typeof COLORS)[number] | null = isOneOf(COLORS, color) ? color : null;

    expect(picked).toBe('blue');
  });
});
