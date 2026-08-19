import type { PageIcon, SpaceVisibility } from '@company-brain/shared';

export type { SpaceVisibility } from '@company-brain/shared';

export interface SpaceSummary {
  readonly icon: PageIcon | null;
  readonly id: string;
  readonly name: string;
  /** Where the space sits among the others, which people set by dragging it. */
  readonly order: number;
  readonly slug: string;
  readonly visibility: SpaceVisibility;
}

export type SpaceFieldErrorCode = 'tooShort' | 'tooLong';
