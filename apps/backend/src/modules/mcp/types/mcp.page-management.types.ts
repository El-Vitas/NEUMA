import type { Result, UserRole } from '@company-brain/shared';
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
import type { McpRefusal } from './mcp.collections.types';
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

/**
 * Lo que el agente hace con una página entera, por el mismo servicio que el
 * portal: así valen las mismas reglas —quién puede, qué está bloqueado, a dónde
 * se puede mover— sin repetirlas. En el orden de argumentos del servicio.
 */
export interface McpPageManager {
  readonly duplicate: (
    pageId: string,
    includeChildren: boolean,
    title: string | null,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => McpPageAnswer<McpManagedPage>;
  readonly listTrashed: (
    workspaceId: string,
    userId: string,
    role: UserRole,
    spaceId: string | null,
    search: string | null,
  ) => Promise<readonly McpTrashedPage[]>;
  readonly move: (
    pageId: string,
    parentId: string | null,
    targetSpaceId: string | null,
    userId: string,
    workspaceId: string,
    mutationId: string,
    role: UserRole,
  ) => McpPageAnswer<McpManagedPage>;
  readonly previewTrashCascade: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => McpPageAnswer<{ readonly childPageCount: number }>;
  readonly rename: (
    pageId: string,
    title: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => McpPageAnswer<McpManagedPage>;
  readonly restore: (
    pageId: string,
    userId: string,
    workspaceId: string,
    mutationId: string,
    role: UserRole,
    includeChildren?: boolean,
  ) => McpPageAnswer<{ readonly restoredChildCount: number }>;
  readonly setLocked: (
    pageId: string,
    locked: boolean,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => McpPageAnswer<McpManagedPage>;
  readonly setOwner: (
    pageId: string,
    ownerId: string | null,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => McpPageAnswer<McpManagedPage>;
  readonly setVerification: (
    pageId: string,
    verified: boolean,
    expiresAt: string | null | undefined,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => McpPageAnswer<McpManagedPage>;
  readonly trash: (
    pageId: string,
    userId: string,
    workspaceId: string,
    mutationId: string,
    role: UserRole,
  ) => McpPageAnswer<boolean>;
  readonly updateCover: (
    pageId: string,
    cover: unknown,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => McpPageAnswer<McpManagedPage>;
  readonly updateIcon: (
    pageId: string,
    icon: unknown,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => McpPageAnswer<McpManagedPage>;
}
