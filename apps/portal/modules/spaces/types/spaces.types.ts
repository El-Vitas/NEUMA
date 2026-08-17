import type { SpaceVisibility } from '@company-brain/shared';

export type { SpaceVisibility } from '@company-brain/shared';

export interface SpaceSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly visibility: SpaceVisibility;
}

export type SpaceFieldErrorCode = 'tooShort' | 'tooLong';
