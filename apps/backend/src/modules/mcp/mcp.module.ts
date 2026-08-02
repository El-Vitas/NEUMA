import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TokenAdapter } from '../auth/infrastructure/adapters/token.adapter';
import { PagesModule } from '../pages/pages.module';
import { SpacesModule } from '../spaces/spaces.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MCP_PRINCIPAL_RESOLVER, MCP_TOKEN_VERIFIER } from './constants/mcp.constants';
import { McpAuthenticatedPrincipalResolver } from './mcp.principal.resolver';

@Module({
  exports: [MCP_PRINCIPAL_RESOLVER],
  imports: [AuthModule, PagesModule, SpacesModule, WorkspacesModule],
  providers: [
    McpAuthenticatedPrincipalResolver,
    { provide: MCP_PRINCIPAL_RESOLVER, useExisting: McpAuthenticatedPrincipalResolver },
    { provide: MCP_TOKEN_VERIFIER, useExisting: TokenAdapter },
  ],
})
export class McpModule {}
