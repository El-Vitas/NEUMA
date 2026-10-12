import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { PORTAL_URL_KEY } from './common/constants/env.constants';
import { AccessTokenPlaceRepository } from './common/infrastructure/persistence/access-token-place.repository';
import { WorkspaceMemberRepository } from './common/infrastructure/persistence/workspace-member.repository';
import { LinksService } from './modules/links/links.service';
import { MCP_PRINCIPAL_RESOLVER } from './modules/mcp/constants/mcp.constants';
import { McpDrawingValidatorAdapter } from './modules/mcp/infrastructure/adapters/mcp.drawing.validator';
import { McpActionRepository } from './modules/mcp/infrastructure/persistence/mcp.action.repository';
import { createMcpObserver } from './modules/mcp/lib/mcp.observer.lib';
import type { McpRowWriter } from './modules/mcp/types/mcp.collections.types';
import type { McpPageManager } from './modules/mcp/types/mcp.page-management.types';
import type { McpPrincipalResolver, McpServerDependencies } from './modules/mcp/types/mcp.types';
import { PageContentService } from './modules/pages/page.content.service';
import { PageOutlineService } from './modules/pages/page.outline.service';
import { PageSchemaService } from './modules/pages/page-schema.service';
import { PagesService } from './modules/pages/pages.service';
import { SearchService } from './modules/search/search.service';
import { SpacesService } from './modules/spaces/spaces.service';
import { WorkspacesService } from './modules/workspaces/workspaces.service';

/** Reuses the portal's services so agent actions go through the same rules as a person's. */
@Injectable()
export class McpServerDependenciesAdapter {
  constructor(
    private readonly actionLog: McpActionRepository,
    private readonly drawings: McpDrawingValidatorAdapter,
    private readonly pagesService: PagesService,
    private readonly collections: PageSchemaService,
    private readonly content: PageContentService,
    private readonly outline: PageOutlineService,
    private readonly backlinks: LinksService,
    private readonly people: WorkspaceMemberRepository,
    private readonly placeReader: AccessTokenPlaceRepository,
    @Inject(MCP_PRINCIPAL_RESOLVER) private readonly principalResolver: McpPrincipalResolver,
    private readonly searchService: SearchService,
    private readonly spacesService: SpacesService,
    private readonly workspacesService: WorkspacesService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {}

  build(): McpServerDependencies {
    return {
      actionLog: this.actionLog,
      backlinks: this.backlinks,
      collections: this.collections,
      content: this.content,
      drawings: this.drawings,
      observer: createMcpObserver(this.logger),
      outline: this.outline,
      pages: this.buildPageManager(),
      pagesService: this.pagesService,
      people: this.people,
      placeReader: this.placeReader,
      portalUrl: this.configService.getOrThrow<string>(PORTAL_URL_KEY),
      principalResolver: this.principalResolver,
      rows: this.buildRowWriter(),
      searchService: this.searchService,
      spacesService: this.spacesService,
      workspacesService: this.workspacesService,
    };
  }

  /** Agents supply no mutation id, so each change generates its own. */
  private buildPageManager(): McpPageManager {
    const { pagesService } = this;
    return {
      duplicate: ({ includeChildren, pageId, role, title, userId, workspaceId }) =>
        pagesService.duplicate(pageId, includeChildren, title, userId, workspaceId, role),
      listTrashed: ({ role, search, spaceId, userId, workspaceId }) =>
        pagesService.listTrashed(workspaceId, userId, role, spaceId, search),
      move: ({ pageId, parentId, role, spaceId, userId, workspaceId }) =>
        pagesService.move(pageId, parentId, spaceId, userId, workspaceId, randomUUID(), role),
      previewTrashCascade: ({ pageId, role, userId, workspaceId }) =>
        pagesService.previewTrashCascade(pageId, workspaceId, userId, role),
      rename: ({ pageId, role, title, userId, workspaceId }) =>
        pagesService.rename(pageId, title, userId, workspaceId, role),
      restore: ({ includeChildren, pageId, role, userId, workspaceId }) =>
        pagesService.restore(pageId, userId, workspaceId, randomUUID(), role, includeChildren),
      setLocked: ({ locked, pageId, role, userId, workspaceId }) =>
        pagesService.setLocked(pageId, locked, userId, workspaceId, role),
      setOwner: ({ ownerId, pageId, role, userId, workspaceId }) =>
        pagesService.setOwner(pageId, ownerId, userId, workspaceId, role),
      setVerification: ({ expiresAt, pageId, role, userId, verified, workspaceId }) =>
        pagesService.setVerification(pageId, verified, expiresAt, userId, workspaceId, role),
      trash: ({ pageId, role, userId, workspaceId }) =>
        pagesService.trash(pageId, userId, workspaceId, randomUUID(), role),
      updateCover: ({ cover, pageId, role, userId, workspaceId }) =>
        pagesService.updateCover(pageId, cover, userId, workspaceId, role),
      updateIcon: ({ icon, pageId, role, userId, workspaceId }) =>
        pagesService.updateIcon(pageId, icon, userId, workspaceId, role),
    };
  }

  private buildRowWriter(): McpRowWriter {
    const { pagesService } = this;
    return {
      create: (input) => pagesService.create({ ...input, createdById: input.userId }, input.role),
      rename: (pageId, title, userId, workspaceId, role) =>
        pagesService.rename(pageId, title, userId, workspaceId, role),
      updateProperties: (input) => pagesService.updateProperties(input),
    };
  }
}
