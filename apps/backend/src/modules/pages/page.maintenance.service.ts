import { randomUUID } from 'node:crypto';
import { canManageWorkspace, givePageBlocksTheirIds, Result, readStoredPageContent } from '@company-brain/shared';
import { Inject, Injectable } from '@nestjs/common';
import {
  PAGE_CONTENT_STORE_OUTCOME,
  PAGE_LIVE_DOCUMENT,
  PAGE_MAINTENANCE_BATCH_SIZE,
  PAGE_MAINTENANCE_REPOSITORY,
} from './constants/pages.constants';
import { PageMaintenanceAdminOnlyError, PageMaintenanceAlreadyRunningError } from './domain/page.error';
import { PagesService } from './pages.service';
import type { PageLiveDocument } from './types/page.types';
import type {
  PageBlocksFillOutcome,
  PageCollaborativeContentStore,
  PageFillStep,
  PageMaintenanceRepositoryContract,
  PageMaintenanceRow,
  PageMaintenanceViewer,
} from './types/page-maintenance.types';

const countSteps = (steps: readonly PageFillStep[]): PageBlocksFillOutcome => ({
  pagesGivenIds: steps.filter((step) => step === 'givenIds').length,
  pagesReindexed: steps.filter((step) => step === 'reindex').length,
  unreadablePages: steps.filter((step) => step === 'unreadable').length,
});

const addOutcomes = (left: PageBlocksFillOutcome, right: PageBlocksFillOutcome): PageBlocksFillOutcome => ({
  pagesGivenIds: left.pagesGivenIds + right.pagesGivenIds,
  pagesReindexed: left.pagesReindexed + right.pagesReindexed,
  unreadablePages: left.unreadablePages + right.unreadablePages,
});

/**
 * El mantenimiento de las páginas que ya existían antes de que cada bloque
 * tuviera id y se proyectara para buscarlo.
 */
@Injectable()
export class PageMaintenanceService {
  /**
   * Los espacios de trabajo con una corrida en curso. Vive en el proceso porque
   * el backend es uno solo: los documentos en vivo ya están en su memoria.
   */
  private readonly runningWorkspaceIds = new Set<string>();

  constructor(
    @Inject(PagesService) private readonly pagesService: PageCollaborativeContentStore,
    @Inject(PAGE_MAINTENANCE_REPOSITORY) private readonly maintenanceRepository: PageMaintenanceRepositoryContract,
    @Inject(PAGE_LIVE_DOCUMENT) private readonly liveDocument: PageLiveDocument,
  ) {}

  /**
   * Deja cada página del espacio de trabajo con un id en cada bloque, y con sus
   * bloques proyectados para buscarlos.
   *
   * Una página abierta en vivo se toma de su documento en vivo, que es lo que
   * dice ahora; una que nadie tiene abierta, de lo guardado. Si le faltaban
   * ids, se guarda con ellos por el mismo camino que un cambio cualquiera, y
   * ese guardado ya avisa a la búsqueda. Si no le faltaban, solo se le pide a
   * la búsqueda que la vuelva a proyectar. Correrlo dos veces no cambia nada
   * que la primera no haya hecho.
   */
  async fillPageBlocks(
    viewer: PageMaintenanceViewer,
  ): Promise<Result<PageBlocksFillOutcome, PageMaintenanceAdminOnlyError | PageMaintenanceAlreadyRunningError>> {
    if (!canManageWorkspace(viewer.role)) return Result.fail(new PageMaintenanceAdminOnlyError());
    if (this.runningWorkspaceIds.has(viewer.workspaceId)) return Result.fail(new PageMaintenanceAlreadyRunningError());
    this.runningWorkspaceIds.add(viewer.workspaceId);
    try {
      return Result.ok(await this.fillWorkspace(viewer));
    } finally {
      this.runningWorkspaceIds.delete(viewer.workspaceId);
    }
  }

  private async fillWorkspace(viewer: PageMaintenanceViewer): Promise<PageBlocksFillOutcome> {
    const runId = randomUUID();
    let outcome: PageBlocksFillOutcome = { pagesGivenIds: 0, pagesReindexed: 0, unreadablePages: 0 };
    let afterPageId: string | null = null;
    for (;;) {
      const batch = await this.maintenanceRepository.listActivePages(
        viewer.workspaceId,
        afterPageId,
        PAGE_MAINTENANCE_BATCH_SIZE,
      );
      if (batch.length === 0) return outcome;
      outcome = addOutcomes(outcome, await this.fillBatch(batch, viewer, runId));
      afterPageId = batch.at(-1)?.id ?? null;
    }
  }

  private async fillBatch(
    batch: readonly PageMaintenanceRow[],
    viewer: PageMaintenanceViewer,
    runId: string,
  ): Promise<PageBlocksFillOutcome> {
    const steps: PageFillStep[] = [];
    for (const page of batch) steps.push(await this.fillPage(page, viewer));
    const toReindex = batch.filter((_page, at) => steps[at] === 'reindex').map((page) => page.id);
    await this.maintenanceRepository.announceReindex(toReindex, runId);
    return countSteps(steps);
  }

  private async fillPage(page: PageMaintenanceRow, viewer: PageMaintenanceViewer): Promise<PageFillStep> {
    const stored = readStoredPageContent(page.content);
    if (stored === null) return 'unreadable';
    const current = this.liveDocument.readLoadedPageContent(page.id) ?? stored;
    const withIds = givePageBlocksTheirIds(current, randomUUID);
    const outcome = await this.pagesService.storeCollaborativeContent(page.id, viewer.userId, withIds);
    return outcome === PAGE_CONTENT_STORE_OUTCOME.stored ? 'givenIds' : 'reindex';
  }
}
