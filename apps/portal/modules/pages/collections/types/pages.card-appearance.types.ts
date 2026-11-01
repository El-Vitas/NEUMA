import type { PageCardSize } from '@neuma/shared';

/** How the cards of the open view look: the files property their cover comes from, and how big they are. */
export interface PageCardAppearance {
  readonly coverProperty: null | string;
  readonly size: PageCardSize;
}
