import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Result } from '@neuma/shared';
import { PinoLogger } from 'nestjs-pino';
import { BLOCK_WRITER } from './common/constants/block-writer.constants';
import { PORTAL_URL_KEY } from './common/constants/env.constants';
import type { DomainError } from './common/domain/domain.error';
import { AccessTokenPlaceRepository } from './common/infrastructure/persistence/access-token-place.repository';
import { WorkspaceMemberRepository } from './common/infrastructure/persistence/workspace-member.repository';
import type { BlockWriter } from './common/types/block-writer.types';
import { CommentsService } from './modules/comments/comments.service';
import { FilesService } from './modules/files/files.service';
import { LinksService } from './modules/links/links.service';
import { MCP_PRINCIPAL_RESOLVER } from './modules/mcp/constants/mcp.constants';
import { McpDrawingValidatorAdapter } from './modules/mcp/infrastructure/adapters/mcp.drawing.validator';
import { McpActionRepository } from './modules/mcp/infrastructure/persistence/mcp.action.repository';
import { createMcpObserver } from './modules/mcp/lib/mcp.observer.lib';
import type { McpCollectionService, McpRefusal, McpRowWriter } from './modules/mcp/types/mcp.collections.types';
import type { McpDiscussions } from './modules/mcp/types/mcp.discussions.types';
import type { McpPageManager } from './modules/mcp/types/mcp.page-management.types';
import type { McpFileUploader, McpPrincipalResolver, McpServerDependencies } from './modules/mcp/types/mcp.types';
import { PageContentService } from './modules/pages/page.content.service';
import { PageOutlineService } from './modules/pages/page.outline.service';
import { PageQueryService } from './modules/pages/page-query.service';
import { PageSchemaService } from './modules/pages/page-schema.service';
import { PageViewOperationsService } from './modules/pages/page-view-operations.service';
import { PagesService } from './modules/pages/pages.service';
import { SearchService } from './modules/search/search.service';
import { SpacesService } from './modules/spaces/spaces.service';
import { WorkspacesService } from './modules/workspaces/workspaces.service';

const toMcpResult = <Value>(result: Result<Value, DomainError>): Result<Value, McpRefusal> =>
  result.isFail()
    ? Result.fail({ code: result.getError().code, details: result.getError().message })
    : Result.ok(result.getValue());

/** Reuses the portal's services so agent actions go through the same rules as a person's. */
@Injectable()
export class McpServerDependenciesAdapter {
  constructor(
    private readonly actionLog: McpActionRepository,
    private readonly drawings: McpDrawingValidatorAdapter,
    @Inject(BLOCK_WRITER) private readonly blockWriter: BlockWriter,
    private readonly pagesService: PagesService,
    private readonly collections: PageSchemaService,
    private readonly queryService: PageQueryService,
    private readonly viewOperations: PageViewOperationsService,
    private readonly commentsService: CommentsService,
    private readonly content: PageContentService,
    private readonly filesService: FilesService,
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
      collections: this.buildCollections(),
      content: this.content,
      discussions: this.buildDiscussions(),
      drawings: this.drawings,
      files: this.buildFileUploader(),
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

  /** The portal's upload, so an agent's file is held to the same size, type, name and page access as a person's. */
  private buildFileUploader(): McpFileUploader {
    const { filesService } = this;
    return {
      upload: async (input) => {
        const stored = toMcpResult(await filesService.create(input));
        if (stored.isFail()) return Result.fail(stored.getError());
        const { id, mimeType, originalFilename, size } = stored.getValue();
        return Result.ok({ id, mimeType, originalFilename, size });
      },
    };
  }

  /** A relation asks for its way back only when it is being added; the columns already there never do. */
  private buildCollections(): McpCollectionService {
    const { collections, queryService, viewOperations } = this;
    return {
      applyViewOperations: async (input) => toMcpResult(await viewOperations.apply(input)),
      moveRow: async (input) => toMcpResult(await viewOperations.moveRow(input)),
      defineSchema: ({ properties, ...input }) =>
        collections.defineSchema({
          ...input,
          properties: properties.map((column) => ({ ...column, twoWay: column.twoWay === true })),
        }),
      getSchema: (pageId, workspaceId, userId, role) => collections.getSchema(pageId, workspaceId, userId, role),
      queryCollection: async (input) => {
        const answered = toMcpResult(await queryService.run(input));
        if (answered.isFail()) return Result.fail(answered.getError());
        const { attachedFiles, reducers, rows } = answered.getValue();
        return Result.ok({ attachedFiles, reducers, rows });
      },
      rewriteOption: (input) => collections.rewriteOption(input),
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

  /** A refusal keeps the code of the domain error and its message as detail, which the tools word for the agent. */
  private buildDiscussions(): McpDiscussions {
    const { commentsService } = this;
    return {
      getDiscussion: async (viewer, discussionId) =>
        toMcpResult(await commentsService.getDiscussion(viewer, discussionId)),
      listPageDiscussions: async (viewer, pageId, request) =>
        toMcpResult(await commentsService.listPageDiscussions(viewer, pageId, request)),
      openDiscussion: async (viewer, blockId, input) =>
        toMcpResult(await commentsService.openDiscussion(viewer, blockId, input)),
      removeComment: async (viewer, commentId) => toMcpResult(await commentsService.remove(viewer, commentId)),
      reply: async (viewer, discussionId, body) => toMcpResult(await commentsService.reply(viewer, discussionId, body)),
    };
  }

  private buildRowWriter(): McpRowWriter {
    const { pagesService } = this;
    return {
      changeRelations: async ({ changes, role, rowId, spaceId, userId, workspaceId }) => {
        const response = await this.blockWriter.applyTrusted(
          [
            {
              id: randomUUID(),
              operations: changes.map((change) => ({
                args: { property: change.propertyKey, targetId: change.targetId },
                command: change.kind === 'ADD' ? 'addRelation' : 'removeRelation',
                path: [],
                pointer: { id: rowId, table: 'block' },
              })),
              spaceId,
            },
          ],
          { role, userId, workspaceId },
        );
        const failure = response.transactions
          .map((outcome) => ('error' in outcome ? outcome.error : null))
          .find(Boolean);
        return failure === undefined || failure === null
          ? Result.ok(true)
          : Result.fail({ code: failure.code, details: failure.message });
      },
      create: (input) => pagesService.create({ ...input, createdById: input.userId }, input.role),
      rename: (pageId, title, userId, workspaceId, role) =>
        pagesService.rename(pageId, title, userId, workspaceId, role),
      updateProperties: (input) => pagesService.updateProperties(input),
    };
  }
}
