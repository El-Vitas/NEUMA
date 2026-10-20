import type { BlockPermissionEntry } from '@neuma/shared';
import type { z } from 'zod';
import type { ActionFailureReason } from '@/shared/types/action-failure.types';
import type { blockAccessSchema, blockPermissionsRequestSchema } from '../schemas/pages.sharing.schemas';

export type BlockAccess = z.infer<typeof blockAccessSchema>;

export type SharingEntry = BlockAccess['entries'][number];

export type SharingMember = BlockAccess['members'][number];

export type SharingPrincipal = SharingEntry['principal'];

export type SharingSource = NonNullable<BlockAccess['source']>;

export type BlockPermissionsRequest = z.infer<typeof blockPermissionsRequestSchema>;

/** What a block's access would be after a change, seen from the person making it. */
export type SharingVerdict = 'losesAccess' | 'losesManagement' | 'lockout' | 'safe';

export interface SharingAssessmentInput {
  readonly members: readonly SharingMember[];
  /** The declaration that would decide access; null means none, so the space does. */
  readonly permissions: readonly BlockPermissionEntry[] | null;
  readonly viewerId: string;
}

export interface SharingRestrictableBlock {
  readonly alive: boolean;
  readonly hasOwnPermissions?: boolean;
  readonly id: string;
}

/** What the share dialog knows about the server's answer, while it waits or when it failed. */
export type SharingAccessState =
  | { readonly kind: 'failed'; readonly reason: ActionFailureReason }
  | { readonly kind: 'loading' }
  | { readonly access: BlockAccess; readonly kind: 'ready' };

/** What the dialog is about to save: its own entries, or no declaration so the block follows what is above. */
export type SharingDraft =
  | { readonly kind: 'inherit' }
  | { readonly entries: readonly SharingEntry[]; readonly kind: 'own' };

/** Told to whoever opened the dialog once a change was saved, so a lock can be shown or taken away. */
export interface SharingChange {
  readonly blockId: string;
  readonly hasOwnPermissions: boolean;
}

/** A page has its own wording; a section of a page is a block. */
export type SharingScope = 'block' | 'page';
