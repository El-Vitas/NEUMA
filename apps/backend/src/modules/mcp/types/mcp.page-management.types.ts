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

/** Una página tras cambiarla entera: lo que hace falta para decir dónde quedó. */
export interface McpManagedPage {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}

/** Una página en la papelera, como la ve quien la puede restaurar. */
export interface McpTrashedPage {
  readonly deletedAt: Date;
  /** Quién la mandó a la papelera, si sigue en el espacio de trabajo. */
  readonly deletedBy: null | McpPerson;
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
  /** Cuántas páginas de abajo se fueron con ella. */
  readonly trashedChildCount: number;
}

type McpPageAnswer<TValue> = Promise<Result<TValue, McpRefusal>>;

/** Un cambio a una página entera, con el nombre que se le dice al agente cuando quedó hecho. */
export interface McpPageStep {
  readonly apply: () => McpPageAnswer<McpManagedPage>;
  readonly name: string;
}

/** Quién actúa sobre qué página. */
type McpOnPage = McpActor & { readonly pageId: string };

/**
 * Lo que el agente hace con una página entera, por el mismo servicio que el
 * portal: así valen las mismas reglas —quién puede, qué está bloqueado, a dónde
 * se puede mover— sin repetirlas. Cada cambio dice por su nombre qué es cada
 * cosa: dos ids en el orden equivocado no se confunden en silencio.
 */
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
