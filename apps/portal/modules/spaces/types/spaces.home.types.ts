import type { PageIcon } from '@company-brain/shared';

export interface SpaceHomePage {
  readonly icon: PageIcon | null;
  readonly id: string;
  readonly title: string;
}

export interface SpaceHomeActivity extends SpaceHomePage {
  readonly editedAt: Date;
  readonly editedBy: string | null;
}
