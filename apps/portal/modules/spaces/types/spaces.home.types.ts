import type { PageIcon } from '@company-brain/shared';

/** A page of the space as its entrance shows it: enough to recognise it and to reach it. */
export interface SpaceHomePage {
  readonly icon: PageIcon | null;
  readonly id: string;
  readonly title: string;
}

export interface SpaceHomeActivity extends SpaceHomePage {
  readonly editedAt: Date;
  readonly editedBy: string | null;
}
