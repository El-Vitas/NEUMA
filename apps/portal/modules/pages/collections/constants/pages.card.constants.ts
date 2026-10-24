import type { PageCardSize } from '@neuma/shared';

/** Whole class names, written out, because Tailwind reads the sources and cannot see a class built from pieces. */
export const PAGE_CARD_GRID_CLASSES: Readonly<Record<PageCardSize, string>> = {
  LARGE: 'grid-cols-[repeat(auto-fill,minmax(22rem,1fr))]',
  MEDIUM: 'grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]',
  SMALL: 'grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]',
};

export const PAGE_CARD_COVER_HEIGHT_CLASSES: Readonly<Record<PageCardSize, string>> = {
  LARGE: 'h-52',
  MEDIUM: 'h-36',
  SMALL: 'h-24',
};

export const PAGE_CARD_COVER_IMAGE_MIME_PREFIX = 'image/';
