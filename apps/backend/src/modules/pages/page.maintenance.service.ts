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

/** Backfills block ids and search projection for pages created before blocks had ids. */
@Injectable()
export class PageMaintenanceService {
  /** In-process because there is a single backend instance and live documents already live in its memory. */
  private readonly runningWorkspaceIds = new Set<string>();

  constructor(
    @Inject(PagesService) private readonly pagesService: PageCollaborativeContentStore,
    @Inject(PAGE_MAINTENANCE_REPOSITORY) private readonly maintenanceRepository: PageMaintenanceRepositoryContract,
    @Inject(PAGE_LIVE_DOCUMENT) private readonly liveDocument: PageLiveDocument,
  ) {}

  /**
   * Open pages are read from the live document, others from storage. Pages missing ids are saved
   * through the normal path, which notifies search; the rest are only re-projected. Idempotent.
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
