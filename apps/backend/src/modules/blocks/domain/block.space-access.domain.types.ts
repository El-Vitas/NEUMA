import type { SpaceVisibility } from '@neuma/db';
import type { UserRole } from '@neuma/shared';

export interface SpaceAccessFacts {
  readonly id: string;
  readonly ownerId: null | string;
  readonly visibility: SpaceVisibility;
  readonly workspaceId: string;
}

export interface SpaceAccessReader {
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface ListReadableSpacesInput {
  readonly memberships: readonly { readonly spaceId: string; readonly userId: string }[];
  readonly readers: readonly SpaceAccessReader[];
  readonly spaces: readonly SpaceAccessFacts[];
}
