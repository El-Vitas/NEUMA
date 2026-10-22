import { Inject, Injectable } from '@nestjs/common';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { PAGE_TREE_DEFAULT_WINDOW, PAGE_TREE_REPOSITORY } from './constants/pages.constants';
import { PageAccessDeniedError } from './domain/page.error';
import { PageChangesRepository } from './infrastructure/persistence/page-changes.repository';
import type { PageOutlineReader, PageOutlineWindow } from './types/page-outline.types';
import type {
  PageLookupContent,
  PageLookupEntry,
  PageRecentEntry,
  PageTreeAncestor,
  PageTreeChildren,
  PageTreePath,
  PageTreeRepositoryContract,
} from './types/page-tree.types';

/** The page tree one parent at a time, with the permissions of whoever asks (ADR 030). */
@Injectable()
export class PageTreeService {
  constructor(
    @Inject(PAGE_TREE_REPOSITORY) private readonly treeRepository: PageTreeRepositoryContract,
    private readonly workspaceContextService: WorkspaceContextService,
    private readonly changesRepository: PageChangesRepository,
    private readonly prisma: PrismaService,
  ) {}

  /** Read before the rows it stands for: no commit after it can be missed by a client that holds both (ADR 026). */
  readWatermark(): Promise<string> {
    return this.changesRepository.readWatermark(this.prisma.runner);
  }

  async openReader(payload: TokenPayload): Promise<PageOutlineReader> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return { role: payload.role, userId: payload.sub, workspaceId: workspace.id };
  }

  listChildren(
    spaceId: string,
    parentId: string | null,
    reader: PageOutlineReader,
    window: PageOutlineWindow,
  ): Promise<PageTreeChildren> {
    return this.treeRepository.listChildren(spaceId, parentId, reader, window);
  }

  async readPath(pageId: string, reader: PageOutlineReader): Promise<PageTreePath> {
    const path = await this.treeRepository.readPath(pageId, reader, PAGE_TREE_DEFAULT_WINDOW);
    if (path === null) throw new PageAccessDeniedError();
    return path;
  }

  async listAncestors(pageId: string, reader: PageOutlineReader): Promise<readonly PageTreeAncestor[]> {
    const ancestors = await this.treeRepository.listAncestors(pageId, reader);
    if (ancestors === null) throw new PageAccessDeniedError();
    return ancestors;
  }

  lookup(pageIds: readonly string[], reader: PageOutlineReader): Promise<readonly PageLookupEntry[]> {
    return this.treeRepository.lookup(pageIds, reader);
  }

  lookupContent(pageIds: readonly string[], reader: PageOutlineReader): Promise<readonly PageLookupContent[]> {
    return this.treeRepository.lookupContent(pageIds, reader);
  }

  listRecent(spaceId: string, reader: PageOutlineReader, take: number): Promise<readonly PageRecentEntry[]> {
    return this.treeRepository.listRecent(spaceId, reader, take);
  }
}
