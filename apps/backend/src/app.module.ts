import { PageLifecycle } from '@company-brain/db';
import { USER_ROLE } from '@company-brain/shared';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { seconds, ThrottlerModule } from '@nestjs/throttler';

import { envSchema } from './common/config/env.schema';
import { PORTAL_URL_KEY } from './common/constants/env.constants';
import {
  CREDENTIAL_RATE_LIMIT,
  EXPORT_RATE_LIMIT,
  MCP_RATE_LIMIT,
  THROTTLER_NAMES,
} from './common/constants/throttler.constants';
import { LoggerModule } from './common/infrastructure/logger.module';
import { AccessTokenPlaceRepository } from './common/infrastructure/persistence/access-token-place.repository';
import { OutboxRepository } from './common/infrastructure/persistence/outbox.repository';
import { WorkspaceContextService } from './common/infrastructure/persistence/workspace-context.service';
import { StorageModule } from './common/infrastructure/storage/storage.module';
import { HealthController } from './health/health.controller';
import { AccessTokensModule } from './modules/access-tokens/access-tokens.module';
import { AuthModule } from './modules/auth/auth.module';
import { TokenAdapter } from './modules/auth/infrastructure/adapters/token.adapter';
import { CollaborationController } from './modules/collaboration/collaboration.controller';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { CollaborationGateway } from './modules/collaboration/collaboration.service';
import { CollaborationTokenService } from './modules/collaboration/collaboration.token.service';
import {
  COLLABORATION_PAGE_SERVICE,
  COLLABORATION_TOKEN_SIGNER,
  COLLABORATION_WORKSPACE_SERVICE,
} from './modules/collaboration/constants/collaboration.constants';
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
import { LinksService } from './modules/links/links.service';
import { MCP_PRINCIPAL_RESOLVER, MCP_SERVER_DEPENDENCIES } from './modules/mcp/constants/mcp.constants';
import { McpController } from './modules/mcp/mcp.controller';
import { McpModule } from './modules/mcp/mcp.module';
import type { McpPrincipalResolver, McpServerDependencies } from './modules/mcp/types/mcp.types';
import { PageViewsModule } from './modules/page-views/page-views.module';
import { PAGE_LIVE_DOCUMENT, PAGE_MAINTENANCE_REPOSITORY } from './modules/pages/constants/pages.constants';
import { PageMaintenanceRepository } from './modules/pages/infrastructure/persistence/page-maintenance.repository';
import { PageContentController } from './modules/pages/page.content.controller';
import { PageContentService } from './modules/pages/page.content.service';
import { PageMaintenanceController } from './modules/pages/page.maintenance.controller';
import { PageMaintenanceService } from './modules/pages/page.maintenance.service';
import { PageOutlineService } from './modules/pages/page.outline.service';
import { PageSchemaService } from './modules/pages/page-schema.service';
import { PagesModule } from './modules/pages/pages.module';
import { PagesService } from './modules/pages/pages.service';
import type { PageLiveDocument } from './modules/pages/types/page.types';
import { SearchModule } from './modules/search/search.module';
import { SearchService } from './modules/search/search.service';
import { SpacesModule } from './modules/spaces/spaces.module';
import { SpacesService } from './modules/spaces/spaces.service';
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
    /** El contenido de una página se escribe dentro de su documento en vivo, quien sea que lo escriba. */
    {
      inject: [CollaborationGateway],
      provide: PAGE_LIVE_DOCUMENT,
      useFactory: (gateway: CollaborationGateway): PageLiveDocument => ({
        readLoadedPageContent: (pageId) => gateway.readLoadedPageContent(pageId),
        writePageContent: (writer, rewrite) =>
          gateway.writePageContent(
            {
              mode: 'write',
              pageId: writer.pageId,
              role: writer.role,
              userId: writer.userId,
              workspaceId: writer.workspaceId,
            },
            rewrite,
          ),
      }),
    },
    { provide: COLLABORATION_PAGE_SERVICE, useExisting: PagesService },
    { provide: COLLABORATION_TOKEN_SIGNER, useExisting: TokenAdapter },
    { provide: COLLABORATION_WORKSPACE_SERVICE, useExisting: WorkspacesService },
    CollaborationTokenService,
    {
      inject: [CollaborationRepository, PagesService, TokenAdapter],
      provide: CollaborationGateway,
      useFactory: (
        persistence: CollaborationPersistenceAdapter,
        pagesService: PagesService,
        tokenAdapter: TokenAdapter,
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
        /** Una página bloqueada se lee en vivo pero no se escribe: el editor lo respeta, y el servidor también. */
        const authorization: CollaborationAuthorizationAdapter = {
          authorize: async (context, pageId, mode): Promise<boolean> => {
            const page = await pagesService.getAccessible(pageId, context.workspaceId, context.userId, context.role);
            if (page.isFail() || page.getValue().lifecycle !== PageLifecycle.ACTIVE) return false;
            return mode === 'read' || (context.role !== USER_ROLE.CLIENT && page.getValue().lockedAt === null);
          },
        };
        const content: CollaborationContentAdapter = {
          load: (pageId) => pagesService.readStoredContent(pageId),
          store: async (context, pageContent) => {
            await pagesService.storeCollaborativeContent(context.pageId, context.userId, pageContent);
          },
        };
        return new CollaborationGateway(token, authorization, persistence, content);
      },
    },
    AccessTokenPlaceRepository,
    {
      inject: [
        PagesService,
        PageSchemaService,
        PageOutlineService,
        LinksService,
        AccessTokenPlaceRepository,
        MCP_PRINCIPAL_RESOLVER,
        SearchService,
        SpacesService,
        WorkspacesService,
        ConfigService,
      ],
      provide: MCP_SERVER_DEPENDENCIES,
      useFactory: (
        pagesService: PagesService,
        schemas: PageSchemaService,
        outline: PageOutlineService,
        backlinks: LinksService,
        placeReader: AccessTokenPlaceRepository,
        principalResolver: McpPrincipalResolver,
        searchService: SearchService,
        spacesService: SpacesService,
        workspacesService: WorkspacesService,
        configService: ConfigService,
      ): McpServerDependencies => ({
        backlinks,
        outline,
        pagesService,
        placeReader,
        portalUrl: configService.getOrThrow<string>(PORTAL_URL_KEY),
        principalResolver,
        schemas,
        searchService,
        spacesService,
        workspacesService,
      }),
    },
  ],
})
export class AppModule {}
