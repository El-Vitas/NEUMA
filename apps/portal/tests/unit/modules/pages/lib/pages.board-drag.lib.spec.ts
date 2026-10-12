import { describe, expect, it } from 'bun:test';
import {
  isBoardDropAllowed,
  readBoardGroupValue,
  resolveBoardKeyboardTarget,
} from '@/modules/pages/collections/lib/pages.board-drag.lib';
import type { PageViewGroup } from '@/modules/pages/collections/types/pages.schema.types';

const groups: PageViewGroup[] = [
  { color: null, key: 'todo', label: 'todo', rows: [] },
  { color: null, key: 'doing', label: 'doing', rows: [] },
  { color: null, key: 'unassigned', label: 'Unassigned', rows: [] },
];

describe('readBoardGroupValue', () => {
  it('reads a column as the value a row lands with', () => {
    expect(readBoardGroupValue('todo')).toBe('todo');
  });

  it('reads the column of rows without a value as no value at all', () => {
    expect(readBoardGroupValue('unassigned')).toBeNull();
  });
});

describe('isBoardDropAllowed', () => {
  it('allows a card onto another column', () => {
    expect(isBoardDropAllowed('todo', 'doing')).toBe(true);
  });

  it('refuses a card back onto the column it came from', () => {
    expect(isBoardDropAllowed('todo', 'todo')).toBe(false);
  });

  it('refuses a drop that says nothing about where it came from', () => {
    expect(isBoardDropAllowed(null, 'doing')).toBe(false);
  });
});

describe('resolveBoardKeyboardTarget', () => {
  it('moves a card to the next column', () => {
    expect(resolveBoardKeyboardTarget(groups, 'todo', 'FORWARD')).toBe('doing');
  });

  it('moves a card to the previous column', () => {
    expect(resolveBoardKeyboardTarget(groups, 'doing', 'BACKWARD')).toBe('todo');
  });

  it('stops at the last column instead of wrapping around', () => {
    expect(resolveBoardKeyboardTarget(groups, 'unassigned', 'FORWARD')).toBeNull();
  });

  it('stops at the first column instead of wrapping around', () => {
    expect(resolveBoardKeyboardTarget(groups, 'todo', 'BACKWARD')).toBeNull();
  });

  it('has nowhere to send a card from a column that is not there', () => {
    expect(resolveBoardKeyboardTarget(groups, 'nowhere', 'FORWARD')).toBeNull();
  });
});
