import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { seconds, ThrottlerModule } from '@nestjs/throttler';

import { envSchema } from './common/config/env.schema';
import { DATABASE_HEALTH_CHECK } from './common/constants/health.constants';
import {
  BLOCK_WRITE_RATE_LIMIT,
  CREDENTIAL_RATE_LIMIT,
  EXPORT_RATE_LIMIT,
  MCP_RATE_LIMIT,
  PAGE_READ_RATE_LIMIT,
  PASSWORD_CHANGE_RATE_LIMIT,
  SEARCH_RATE_LIMIT,
  THROTTLER_NAMES,
  UPLOAD_RATE_LIMIT,
} from './common/constants/throttler.constants';
import { LoggerModule } from './common/infrastructure/logger.module';
import { AccessTokenPlaceRepository } from './common/infrastructure/persistence/access-token-place.repository';
import { DatabaseHealthRepository } from './common/infrastructure/persistence/database-health.repository';
import { WorkspaceContextService } from './common/infrastructure/persistence/workspace-context.service';
import { WorkspaceMemberRepository } from './common/infrastructure/persistence/workspace-member.repository';
import { StorageModule } from './common/infrastructure/storage/storage.module';
import { buildThrottlerKey } from './common/utils/throttler.utils';
import { HealthController } from './health/health.controller';
import { McpServerDependenciesAdapter } from './mcp.server-dependencies.adapter';
import { AccessTokensModule } from './modules/access-tokens/access-tokens.module';
import { AuthModule } from './modules/auth/auth.module';
import { BlocksModule } from './modules/blocks/blocks.module';
import { CommentsModule } from './modules/comments/comments.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { FilesModule } from './modules/files/files.module';
import { LinksModule } from './modules/links/links.module';
import { MCP_SERVER_DEPENDENCIES } from './modules/mcp/constants/mcp.constants';
import { McpDrawingValidatorAdapter } from './modules/mcp/infrastructure/adapters/mcp.drawing.validator';
import { McpActionRepository } from './modules/mcp/infrastructure/persistence/mcp.action.repository';
import { McpController } from './modules/mcp/mcp.controller';
import { McpModule } from './modules/mcp/mcp.module';
import type { McpServerDependencies } from './modules/mcp/types/mcp.types';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PageViewsModule } from './modules/page-views/page-views.module';
import { PageContentController } from './modules/pages/page.content.controller';
import { PageContentService } from './modules/pages/page.content.service';
import { PagesModule } from './modules/pages/pages.module';
import { SearchModule } from './modules/search/search.module';
import { SpacesModule } from './modules/spaces/spaces.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
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
          name: THROTTLER_NAMES.blockWritesBurst,
          ttl: seconds(BLOCK_WRITE_RATE_LIMIT.burstWindowSeconds),
          limit: BLOCK_WRITE_RATE_LIMIT.burstLimit,
        },
        {
          name: THROTTLER_NAMES.blockWrites,
          ttl: seconds(BLOCK_WRITE_RATE_LIMIT.windowSeconds),
          limit: BLOCK_WRITE_RATE_LIMIT.perUserLimit,
        },
        {
          name: THROTTLER_NAMES.pageReads,
          ttl: seconds(PAGE_READ_RATE_LIMIT.windowSeconds),
          limit: PAGE_READ_RATE_LIMIT.perUserLimit,
        },
        {
          name: THROTTLER_NAMES.mcpPerIp,
          ttl: seconds(MCP_RATE_LIMIT.windowSeconds),
          limit: MCP_RATE_LIMIT.perIpLimit,
        },
        {
          name: THROTTLER_NAMES.passwordChange,
          ttl: seconds(PASSWORD_CHANGE_RATE_LIMIT.windowSeconds),
          limit: PASSWORD_CHANGE_RATE_LIMIT.perUserLimit,
        },
        {
          name: THROTTLER_NAMES.search,
          ttl: seconds(SEARCH_RATE_LIMIT.windowSeconds),
          limit: SEARCH_RATE_LIMIT.perUserLimit,
        },
        {
          name: THROTTLER_NAMES.uploads,
          ttl: seconds(UPLOAD_RATE_LIMIT.windowSeconds),
          limit: UPLOAD_RATE_LIMIT.perUserLimit,
        },
      ],
      generateKey: (_context, tracker, throttlerName) =>
        throttlerName === THROTTLER_NAMES.global ? THROTTLER_NAMES.global : buildThrottlerKey(throttlerName, tracker),
    }),
    LoggerModule,
    PrismaModule,
    StorageModule.forRoot(),
    AuthModule,
    UsersModule,
    WorkspacesModule,
    SpacesModule,
    PagesModule,
    BlocksModule,
    CommentsModule,
    NotificationsModule,
    PageViewsModule,
    FavoritesModule,
    FilesModule,
    AccessTokensModule,
    McpModule,
    SearchModule,
    LinksModule,
  ],
  controllers: [HealthController, McpController, PageContentController],
  providers: [
    PageContentService,
    WorkspaceContextService,
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
