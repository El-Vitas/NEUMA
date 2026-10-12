import type { PageIcon, SpaceVisibility } from '@neuma/shared';

export type { SpaceVisibility } from '@neuma/shared';

export interface SpaceSummary {
  readonly description: string | null;
  readonly icon: PageIcon | null;
  readonly id: string;
  readonly name: string;
  readonly order: number;
  /** Null unless the visibility is `PRIVATE`. */
  readonly ownerId: string | null;
  readonly slug: string;
  readonly visibility: SpaceVisibility;
}

export type SpaceFieldErrorCode = 'tooShort' | 'tooLong';

export type BadgeVariant = 'outline' | 'secondary' | 'warning';
