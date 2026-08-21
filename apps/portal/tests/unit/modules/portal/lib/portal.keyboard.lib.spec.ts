import { describe, expect, it } from 'bun:test';
import { isStartPageShortcut } from '@/modules/portal/lib/portal.keyboard.lib';

const pressing = (overrides: Partial<KeyboardEvent> & { readonly key: string }): KeyboardEvent =>
  ({ ctrlKey: false, metaKey: false, shiftKey: false, target: null, ...overrides }) as KeyboardEvent;

describe('isStartPageShortcut', () => {
  it('answers to the chord on either kind of keyboard', () => {
    expect(isStartPageShortcut(pressing({ ctrlKey: true, key: 'n', shiftKey: true }))).toBe(true);
    expect(isStartPageShortcut(pressing({ key: 'n', metaKey: true, shiftKey: true }))).toBe(true);
  });

  it('reads the letter whichever case the keyboard reports it in', () => {
    expect(isStartPageShortcut(pressing({ ctrlKey: true, key: 'N', shiftKey: true }))).toBe(true);
  });

  it('stays out of the way while somebody is writing', () => {
    const writing = document.createElement('textarea');

    expect(isStartPageShortcut(pressing({ ctrlKey: true, key: 'n', shiftKey: true, target: writing }))).toBe(false);
  });

  it('leaves the browser own new-window chord alone', () => {
    expect(isStartPageShortcut(pressing({ ctrlKey: true, key: 'n' }))).toBe(false);
  });
});
