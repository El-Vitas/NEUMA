import { Module } from '@nestjs/common';
import { AccessTokensModule } from '../access-tokens/access-tokens.module';
import { PagesModule } from '../pages/pages.module';
import { SpacesModule } from '../spaces/spaces.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MCP_PRINCIPAL_RESOLVER } from './constants/mcp.constants';
import { McpEnvironmentPrincipalResolver } from './mcp.principal.resolver';

@Module({
  exports: [MCP_PRINCIPAL_RESOLVER],
  imports: [AccessTokensModule, PagesModule, SpacesModule, WorkspacesModule],
  providers: [
    McpEnvironmentPrincipalResolver,
    { provide: MCP_PRINCIPAL_RESOLVER, useExisting: McpEnvironmentPrincipalResolver },
  ],
})
export class McpModule {}
