import { describe, expect, it } from 'bun:test';
import {
  readPageCover,
  readPageIcon,
  readPageTitle,
  readPageValues,
  toPageTitleText,
} from '@/modules/pages/domain/page.block.domain';

describe('what a page block says about the page', () => {
  it('reads the title out of the plain text of the block', () => {
    expect(readPageTitle({ title: [{ insert: 'Plan' }, { insert: ' anual' }] })).toBe('Plan anual');
  });

  it('reads no title from a block with none or with one it cannot read', () => {
    expect(readPageTitle({ title: [] })).toBe('');
    expect(readPageTitle({})).toBe('');
    expect(readPageTitle({ title: 'Plan' })).toBe('');
    expect(readPageTitle(null)).toBe('');
  });

  it('writes an empty title as an empty list', () => {
    expect(toPageTitleText('Plan')).toEqual([{ insert: 'Plan' }]);
    expect(toPageTitleText('')).toEqual([]);
  });

  it('reads the values of a row and leaves out an entry it does not understand', () => {
    expect(
      readPageValues({ title: [], values: { done: true, owner: ['a', 'b'], stale: { nested: 1 }, status: 'todo' } }),
    ).toEqual({
      done: true,
      owner: ['a', 'b'],
      status: 'todo',
    });
  });

  it('reads no values from a page that keeps none', () => {
    expect(readPageValues({ title: [] })).toBeNull();
    expect(readPageValues({ values: 'nope' })).toBeNull();
  });

  it('reads the icon and the cover out of the format', () => {
    expect(readPageIcon({ icon: { kind: 'emoji', value: '🚀' } })).toEqual({ kind: 'emoji', value: '🚀' });
    const assetId = '0198a1c2-7d3e-7b4a-9c5d-1e2f3a4b5c6d';
    expect(readPageCover({ cover: { assetId, position: 40 } })).toEqual({ assetId, position: 40 });
  });

  it('reads no icon and no cover from a format that has none or has them wrong', () => {
    expect(readPageIcon({})).toBeNull();
    expect(readPageIcon({ icon: { kind: 'mystery' } })).toBeNull();
    expect(readPageCover(null)).toBeNull();
    expect(readPageCover({ cover: 'red' })).toBeNull();
  });
});
