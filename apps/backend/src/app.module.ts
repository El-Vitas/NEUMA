import { PageLifecycle } from '@company-brain/db';
import { USER_ROLE } from '@company-brain/shared';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { seconds, ThrottlerModule } from '@nestjs/throttler';

import { envSchema } from './common/config/env.schema';
import { PUBLIC_STATUS_RATE_LIMIT, THROTTLER_NAMES } from './common/constants/throttler.constants';
import { LoggerModule } from './common/infrastructure/logger.module';
import { StorageModule } from './common/infrastructure/storage/storage.module';
import { HealthController } from './health/health.controller';
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
  CollaborationContext,
  CollaborationPersistenceAdapter,
  CollaborationTokenAdapter,
} from './modules/collaboration/types/collaboration.types';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { FilesModule } from './modules/files/files.module';
import { LinksModule } from './modules/links/links.module';
import { MCP_PRINCIPAL_RESOLVER, MCP_SERVER_DEPENDENCIES } from './modules/mcp/constants/mcp.constants';
import { McpModule } from './modules/mcp/mcp.module';
import type { McpPrincipalResolver, McpServerDependencies } from './modules/mcp/types/mcp.types';
import { PagesModule } from './modules/pages/pages.module';
import { PagesService } from './modules/pages/pages.service';
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
          ttl: seconds(PUBLIC_STATUS_RATE_LIMIT.windowSeconds),
          limit: PUBLIC_STATUS_RATE_LIMIT.perIpLimit,
        },
        {
          name: THROTTLER_NAMES.global,
          ttl: seconds(PUBLIC_STATUS_RATE_LIMIT.windowSeconds),
          limit: PUBLIC_STATUS_RATE_LIMIT.globalLimit,
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
    FavoritesModule,
    FilesModule,
    McpModule,
    SearchModule,
    LinksModule,
  ],
  controllers: [CollaborationController, HealthController],
  providers: [
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
        const authorization: CollaborationAuthorizationAdapter = {
          authorize: async (context, pageId, mode): Promise<boolean> => {
            const page = await pagesService.getAccessible(pageId, context.workspaceId, context.userId, context.role);
            return (
              page.isOk() &&
              page.getValue().lifecycle === PageLifecycle.ACTIVE &&
              (mode === 'read' || context.role !== USER_ROLE.CLIENT)
            );
          },
        };
        return new CollaborationGateway(token, authorization, persistence);
      },
    },
    {
      inject: [PagesService, MCP_PRINCIPAL_RESOLVER, SearchService, SpacesService, WorkspacesService],
      provide: MCP_SERVER_DEPENDENCIES,
      useFactory: (
        pagesService: PagesService,
        principalResolver: McpPrincipalResolver,
        searchService: SearchService,
        spacesService: SpacesService,
        workspacesService: WorkspacesService,
      ): McpServerDependencies => ({
        pagesService,
        principalResolver,
        searchService,
        spacesService,
        workspacesService,
      }),
    },
  ],
})
export class AppModule {}
