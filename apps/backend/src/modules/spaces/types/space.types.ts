import type { SpaceVisibility } from '@company-brain/shared';

export interface CreateSpaceInput {
  readonly name: string;
  readonly slug: string;
  readonly visibility: SpaceVisibility;
  readonly workspaceId: string;
}

export interface SpaceSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly visibility: SpaceVisibility;
}
