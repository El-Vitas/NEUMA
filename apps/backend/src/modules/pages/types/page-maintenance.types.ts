import type { Prisma } from '@company-brain/db/generated';
import type { PageContent, UserRole } from '@company-brain/shared';
import type { PageContentStoreOutcome } from './page.types';

/** Quién pide el mantenimiento, y de qué espacio de trabajo. */
export interface PageMaintenanceViewer {
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

/** Una página activa tal como está guardada, para revisarla. */
export interface PageMaintenanceRow {
  readonly content: Prisma.JsonValue;
  readonly id: string;
}

/** Lo que se hizo con una página al rellenar. */
export type PageFillStep = 'givenIds' | 'reindex' | 'unreadable';

/** Lo que hizo el relleno de bloques. */
export interface PageBlocksFillOutcome {
  /** Páginas que tenían bloques sin id, y ahora los tienen. */
  readonly pagesGivenIds: number;
  /** Páginas que ya tenían todos sus ids y se volvieron a proyectar. */
  readonly pagesReindexed: number;
  /** Páginas guardadas en una forma que esta versión no lee; se dejan como están. */
  readonly unreadablePages: number;
}

/** Guardar lo que dice una página por el mismo camino que un cambio cualquiera, que ya avisa a la búsqueda. */
export interface PageCollaborativeContentStore {
  readonly storeCollaborativeContent: (
    pageId: string,
    userId: string,
    content: PageContent,
  ) => Promise<PageContentStoreOutcome>;
}

export interface PageMaintenanceRepositoryContract {
  /** Las páginas activas del espacio de trabajo, de a tandas, en orden de id. */
  readonly listActivePages: (
    workspaceId: string,
    afterPageId: string | null,
    take: number,
  ) => Promise<readonly PageMaintenanceRow[]>;
  /** Pide a quienes proyectan las páginas que las vuelvan a proyectar. */
  readonly announceReindex: (pageIds: readonly string[], runId: string) => Promise<void>;
}
