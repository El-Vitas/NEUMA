import type { SpaceVisibility } from '@company-brain/shared';

export type { SpaceVisibility } from '@company-brain/shared';

export interface SpaceSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly visibility: SpaceVisibility;
}

export interface SpaceMember {
  readonly email: string;
  readonly id: string;
  readonly name: string;
}

export type SpaceFieldErrorCode = 'tooShort' | 'tooLong';
