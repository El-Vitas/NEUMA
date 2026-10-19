import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import { PageLifecycle } from '@neuma/db';
import { USER_ROLE } from '@neuma/shared';
import { PinoLogger } from 'nestjs-pino';

import { envSchema } from './common/config/env.schema';
import { DATABASE_HEALTH_CHECK } from './common/constants/health.constants';
import {
  CREDENTIAL_RATE_LIMIT,
  EXPORT_RATE_LIMIT,
  MCP_RATE_LIMIT,
  THROTTLER_NAMES,
} from './common/constants/throttler.constants';
import { LoggerModule } from './common/infrastructure/logger.module';
import { AccessTokenPlaceRepository } from './common/infrastructure/persistence/access-token-place.repository';
import { DatabaseHealthRepository } from './common/infrastructure/persistence/database-health.repository';
import { OutboxRepository } from './common/infrastructure/persistence/outbox.repository';
import { WorkspaceContextService } from './common/infrastructure/persistence/workspace-context.service';
import { WorkspaceMemberRepository } from './common/infrastructure/persistence/workspace-member.repository';
import { StorageModule } from './common/infrastructure/storage/storage.module';
import { HealthController } from './health/health.controller';
import { McpServerDependenciesAdapter } from './mcp.server-dependencies.adapter';
import { AccessTokensModule } from './modules/access-tokens/access-tokens.module';
import { AuthModule } from './modules/auth/auth.module';
import { TokenAdapter } from './modules/auth/infrastructure/adapters/token.adapter';
import { BlocksModule } from './modules/blocks/blocks.module';
import { CollaborationController } from './modules/collaboration/collaboration.controller';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { CollaborationGateway } from './modules/collaboration/collaboration.service';
import { CollaborationTokenService } from './modules/collaboration/collaboration.token.service';
import {
  COLLABORATION_PAGE_SERVICE,
  COLLABORATION_TOKEN_SIGNER,
  COLLABORATION_WORKSPACE_SERVICE,
} from './modules/collaboration/constants/collaboration.constants';
import { CollaborationForbiddenError } from './modules/collaboration/infrastructure/errors/collaboration.forbidden.error';
import { CollaborationRepository } from './modules/collaboration/infrastructure/persistence/collaboration.repository';
import type {
  CollaborationAuthorizationAdapter,
  CollaborationContentAdapter,
  CollaborationContext,
  CollaborationPersistenceAdapter,
  CollaborationTokenAdapter,
} from './modules/collaboration/types/collaboration.types';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { FilesModule } from './modules/files/files.module';
import { LinksModule } from './modules/links/links.module';
import { MCP_SERVER_DEPENDENCIES } from './modules/mcp/constants/mcp.constants';
import { McpDrawingValidatorAdapter } from './modules/mcp/infrastructure/adapters/mcp.drawing.validator';
import { McpActionRepository } from './modules/mcp/infrastructure/persistence/mcp.action.repository';
import { McpController } from './modules/mcp/mcp.controller';
import { McpModule } from './modules/mcp/mcp.module';
import type { McpServerDependencies } from './modules/mcp/types/mcp.types';
import { PageViewsModule } from './modules/page-views/page-views.module';
import { PAGE_LIVE_DOCUMENT, PAGE_MAINTENANCE_REPOSITORY } from './modules/pages/constants/pages.constants';
import { PageLiveDocumentForbiddenError } from './modules/pages/infrastructure/errors/page.live-document.error';
import { PageMaintenanceRepository } from './modules/pages/infrastructure/persistence/page-maintenance.repository';
import { PageContentController } from './modules/pages/page.content.controller';
import { PageContentService } from './modules/pages/page.content.service';
import { PageMaintenanceController } from './modules/pages/page.maintenance.controller';
import { PageMaintenanceService } from './modules/pages/page.maintenance.service';
import { PagesModule } from './modules/pages/pages.module';
import { PagesService } from './modules/pages/pages.service';
import type { PageLiveDocument } from './modules/pages/types/page.types';
import { SearchModule } from './modules/search/search.module';
import { SpacesModule } from './modules/spaces/spaces.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { WorkspacesService } from './modules/workspaces/workspaces.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: THROTTLER_NAMES.perIp,
          ttl: seconds(CREDENTIAL_RATE_LIMIT.windowSeconds),
          limit: CREDENTIAL_RATE_LIMIT.perIpLimit,
        },
        {
          name: THROTTLER_NAMES.global,
          ttl: seconds(CREDENTIAL_RATE_LIMIT.windowSeconds),
          limit: CREDENTIAL_RATE_LIMIT.globalLimit,
        },
        {
          name: THROTTLER_NAMES.exports,
          ttl: seconds(EXPORT_RATE_LIMIT.windowSeconds),
          limit: EXPORT_RATE_LIMIT.perUserLimit,
        },
        {
          name: THROTTLER_NAMES.mcp,
          ttl: seconds(MCP_RATE_LIMIT.windowSeconds),
          limit: MCP_RATE_LIMIT.perTokenLimit,
        },
        {
          name: THROTTLER_NAMES.mcpPerIp,
          ttl: seconds(MCP_RATE_LIMIT.windowSeconds),
          limit: MCP_RATE_LIMIT.perIpLimit,
        },
      ],
      generateKey: (_context, tracker, throttlerName) =>
        throttlerName === THROTTLER_NAMES.global ? THROTTLER_NAMES.global : `${throttlerName}:${tracker}`,
    }),
    LoggerModule,
    PrismaModule,
    StorageModule.forRoot(),
    AuthModule,
    CollaborationModule,
    UsersModule,
    WorkspacesModule,
    SpacesModule,
    PagesModule,
    BlocksModule,
    PageViewsModule,
    FavoritesModule,
    FilesModule,
    AccessTokensModule,
    McpModule,
    SearchModule,
    LinksModule,
  ],
  controllers: [
    CollaborationController,
    HealthController,
    McpController,
    PageContentController,
    PageMaintenanceController,
  ],
  providers: [
    PageContentService,
    PageMaintenanceService,
    { provide: PAGE_MAINTENANCE_REPOSITORY, useClass: PageMaintenanceRepository },
    OutboxRepository,
    WorkspaceContextService,
    {
      inject: [CollaborationGateway],
      provide: PAGE_LIVE_DOCUMENT,
      useFactory: (gateway: CollaborationGateway): PageLiveDocument => ({
        readLoadedPageContent: (pageId) => gateway.readLoadedPageContent(pageId),
        writePageContent: async (writer, rewrite) => {
          try {
            return await gateway.writePageContent(
              {
                mode: 'write',
                pageId: writer.pageId,
                role: writer.role,
                userId: writer.userId,
                workspaceId: writer.workspaceId,
              },
              rewrite,
            );
          } catch (error) {
            if (error instanceof CollaborationForbiddenError) throw new PageLiveDocumentForbiddenError();
            throw error;
          }
        },
      }),
    },
    { provide: COLLABORATION_PAGE_SERVICE, useExisting: PagesService },
    { provide: COLLABORATION_TOKEN_SIGNER, useExisting: TokenAdapter },
    { provide: COLLABORATION_WORKSPACE_SERVICE, useExisting: WorkspacesService },
    CollaborationTokenService,
    {
      inject: [CollaborationRepository, PagesService, TokenAdapter, PinoLogger],
      provide: CollaborationGateway,
      useFactory: (
        persistence: CollaborationPersistenceAdapter,
        pagesService: PagesService,
        tokenAdapter: TokenAdapter,
        logger: PinoLogger,
      ): CollaborationGateway => {
        const token: CollaborationTokenAdapter = {
          verify: async (rawToken: string): Promise<CollaborationContext> => {
            const payload = await tokenAdapter.verifyCollaborationToken(rawToken);
            return {
              mode: payload.mode,
              pageId: payload.pageId,
              role: payload.role,
              userId: payload.sub,
              workspaceId: payload.workspaceId,
            };
          },
        };
        // A locked page can be read live but not written, enforced here as well as in the editor.
        const authorization: CollaborationAuthorizationAdapter = {
          authorize: async (context, pageId, mode): Promise<boolean> => {
            const page = await pagesService.readAccessState(pageId, context.workspaceId, context.userId, context.role);
            if (page?.lifecycle !== PageLifecycle.ACTIVE) return false;
            return mode === 'read' || (context.role !== USER_ROLE.CLIENT && page.lockedAt === null);
          },
        };
        // Live document saves first; if the page write fails, search and backlinks stay stale, so it is logged.
        const content: CollaborationContentAdapter = {
          load: (pageId) => pagesService.readStoredContent(pageId),
          store: async (context, pageContent) => {
            try {
              await pagesService.storeCollaborativeContent(context.pageId, context.userId, pageContent);
            } catch (error) {
              logger.error({ err: error, pageId: context.pageId }, 'page content fell behind its live document');
              throw error;
            }
          },
        };
        return new CollaborationGateway(token, authorization, persistence, content, logger);
      },
    },
    AccessTokenPlaceRepository,
    DatabaseHealthRepository,
    { provide: DATABASE_HEALTH_CHECK, useExisting: DatabaseHealthRepository },
    WorkspaceMemberRepository,
    McpActionRepository,
    McpDrawingValidatorAdapter,
    McpServerDependenciesAdapter,
    {
      inject: [McpServerDependenciesAdapter],
      provide: MCP_SERVER_DEPENDENCIES,
      useFactory: (adapter: McpServerDependenciesAdapter): McpServerDependencies => adapter.build(),
    },
  ],
})
export class AppModule {}
