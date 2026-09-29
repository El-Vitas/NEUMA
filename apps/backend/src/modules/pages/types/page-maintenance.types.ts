import type { Prisma } from '@company-brain/db/generated';
import type { UserRole } from '@company-brain/shared';

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
