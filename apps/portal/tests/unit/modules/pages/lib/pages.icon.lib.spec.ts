import { describe, expect, it } from 'bun:test';
import {
  findPageIconEmojiOptions,
  isPageEmojiIcon,
  isPageImageIcon,
  pickRandomPageEmojiIcon,
  resolvePageIconImageUrl,
} from '@/modules/pages/lib/pages.icon.lib';
import type { PageEmojiIcon, PageImageIcon } from '@/modules/pages/types/pages.icon.types';

describe('isPageEmojiIcon / isPageImageIcon', () => {
  it('tells an emoji icon apart from an image icon', () => {
    const emojiIcon: PageEmojiIcon = { kind: 'emoji', value: '🚀' };
    const imageIcon: PageImageIcon = { assetId: '11111111-1111-1111-1111-111111111111', kind: 'image' };

    expect(isPageEmojiIcon(emojiIcon)).toBe(true);
    expect(isPageEmojiIcon(imageIcon)).toBe(false);
    expect(isPageImageIcon(imageIcon)).toBe(true);
    expect(isPageImageIcon(emojiIcon)).toBe(false);
  });
});

describe('resolvePageIconImageUrl', () => {
  it('builds a page-asset route from the icon assetId', () => {
    const imageIcon: PageImageIcon = { assetId: '11111111-1111-1111-1111-111111111111', kind: 'image' };

    expect(resolvePageIconImageUrl(imageIcon)).toBe('/api/page-assets/11111111-1111-1111-1111-111111111111');
  });
});

describe('findPageIconEmojiOptions', () => {
  it('returns a bounded set of emoji when the query is empty', () => {
    const options = findPageIconEmojiOptions('');

    expect(options.length).toBeGreaterThan(0);
    expect(options.length).toBeLessThanOrEqual(40);
  });

  it('narrows the options once a query is typed', () => {
    const options = findPageIconEmojiOptions('rocket');

    expect(options.length).toBeGreaterThan(0);
    expect(options.every((entry) => entry.names.some((name) => name.includes('rocket')))).toBe(true);
  });
});

describe('pickRandomPageEmojiIcon', () => {
  it('always returns a usable emoji icon', () => {
    const icon = pickRandomPageEmojiIcon();

    expect(icon.kind).toBe('emoji');
    expect(icon.value.length).toBeGreaterThan(0);
  });
});
