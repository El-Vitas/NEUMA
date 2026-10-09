import type { Result } from '@company-brain/shared';
import type { z } from 'zod';
import type {
  duplicatePageInputSchema,
  listTrashOutputSchema,
  managedPageOutputSchema,
  movePageInputSchema,
  restorePageInputSchema,
  trashPageInputSchema,
  updatePageInputSchema,
} from '../schemas/mcp.pages.schemas';
import type { McpActor, McpRefusal } from './mcp.collections.types';
import type { McpPerson } from './mcp.types';

export type McpUpdatePageInput = z.infer<typeof updatePageInputSchema>;
export type McpMovePageInput = z.infer<typeof movePageInputSchema>;
export type McpDuplicatePageInput = z.infer<typeof duplicatePageInputSchema>;
export type McpTrashPageInput = z.infer<typeof trashPageInputSchema>;
export type McpRestorePageInput = z.infer<typeof restorePageInputSchema>;
export type McpListTrashOutput = z.infer<typeof listTrashOutputSchema>;
export type McpManagedPageOutput = z.infer<typeof managedPageOutputSchema>;

export interface McpManagedPage {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}

export interface McpTrashedPage {
  readonly deletedAt: Date;
  readonly deletedBy: null | McpPerson;
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
  readonly trashedChildCount: number;
}

type McpPageAnswer<TValue> = Promise<Result<TValue, McpRefusal>>;

export interface McpPageStep {
  readonly apply: () => McpPageAnswer<McpManagedPage>;
  readonly name: string;
}

type McpOnPage = McpActor & { readonly pageId: string };

/** Same service as the portal, so the same rules apply. */
export interface McpPageManager {
  readonly duplicate: (
    input: McpOnPage & { readonly includeChildren: boolean; readonly title: string | null },
  ) => McpPageAnswer<McpManagedPage>;
  readonly listTrashed: (
    input: McpActor & { readonly search: string | null; readonly spaceId: string | null },
  ) => Promise<readonly McpTrashedPage[]>;
  readonly move: (
    input: McpOnPage & { readonly parentId: string | null; readonly spaceId: string | null },
  ) => McpPageAnswer<McpManagedPage>;
  readonly previewTrashCascade: (input: McpOnPage) => McpPageAnswer<{ readonly childPageCount: number }>;
  readonly rename: (input: McpOnPage & { readonly title: string }) => McpPageAnswer<McpManagedPage>;
  readonly restore: (
    input: McpOnPage & { readonly includeChildren: boolean },
  ) => McpPageAnswer<{ readonly restoredChildCount: number }>;
  readonly setLocked: (input: McpOnPage & { readonly locked: boolean }) => McpPageAnswer<McpManagedPage>;
  readonly setOwner: (input: McpOnPage & { readonly ownerId: string | null }) => McpPageAnswer<McpManagedPage>;
  readonly setVerification: (
    input: McpOnPage & { readonly expiresAt: string | null | undefined; readonly verified: boolean },
  ) => McpPageAnswer<McpManagedPage>;
  readonly trash: (input: McpOnPage) => McpPageAnswer<boolean>;
  readonly updateCover: (input: McpOnPage & { readonly cover: unknown }) => McpPageAnswer<McpManagedPage>;
  readonly updateIcon: (input: McpOnPage & { readonly icon: unknown }) => McpPageAnswer<McpManagedPage>;
}
