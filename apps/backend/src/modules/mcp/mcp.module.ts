import { Module } from '@nestjs/common';
import { AccessTokensModule } from '../access-tokens/access-tokens.module';
import { MCP_PRINCIPAL_RESOLVER } from './constants/mcp.constants';
import { McpEnvironmentPrincipalResolver } from './mcp.principal.resolver';

@Module({
  exports: [MCP_PRINCIPAL_RESOLVER],
  imports: [AccessTokensModule],
  providers: [
    McpEnvironmentPrincipalResolver,
    { provide: MCP_PRINCIPAL_RESOLVER, useExisting: McpEnvironmentPrincipalResolver },
  ],
})
export class McpModule {}
