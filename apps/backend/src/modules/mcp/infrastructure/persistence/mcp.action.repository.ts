import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { McpActionEntry, McpActionLog } from '../../types/mcp.types';

/** Donde queda anotada cada escritura de un agente. */
@Injectable()
export class McpActionRepository implements McpActionLog {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: McpActionEntry): Promise<void> {
    await this.prisma.agentAction.create({
      data: {
        blockIds: [...entry.blockIds],
        detail: { ...entry.detail },
        outcome: entry.outcome,
        pageId: entry.pageId,
        tokenId: entry.tokenId,
        tool: entry.tool,
        userId: entry.userId,
        workspaceId: entry.workspaceId,
      },
    });
  }
}
