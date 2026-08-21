import type { PageIcon, SpaceVisibility } from '@company-brain/shared';

export type { SpaceVisibility } from '@company-brain/shared';

export interface SpaceSummary {
  /** What the space says it is for, in its own words. Null while nobody has said. */
  readonly description: string | null;
  readonly icon: PageIcon | null;
  readonly id: string;
  readonly name: string;
  /** Where the space sits among the others, which people set by dragging it. */
  readonly order: number;
  /** Who a `PRIVATE` space belongs to. Null for every other visibility. */
  readonly ownerId: string | null;
  readonly slug: string;
  readonly visibility: SpaceVisibility;
}

export type SpaceFieldErrorCode = 'tooShort' | 'tooLong';

/** How a space's visibility is drawn, in the words the badge component speaks. */
export type BadgeVariant = 'outline' | 'secondary' | 'warning';
