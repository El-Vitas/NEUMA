import { AgentActionOutcome } from '@company-brain/db';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { McpActionClosing, McpActionEntry, McpActionLog } from '../../types/mcp.types';

/** Donde queda anotada cada escritura de un agente: pendiente antes de escribir, cerrada al terminar. */
@Injectable()
export class McpActionRepository implements McpActionLog {
  constructor(private readonly prisma: PrismaService) {}

  async start(entry: McpActionEntry): Promise<string> {
    const action = await this.prisma.agentAction.create({
      data: {
        blockIds: [...entry.blockIds],
        detail: { ...entry.detail },
        outcome: AgentActionOutcome.PENDING,
        pageId: entry.pageId,
        tokenId: entry.tokenId,
        tool: entry.tool,
        userId: entry.userId,
        workspaceId: entry.workspaceId,
      },
      select: { id: true },
    });
    return action.id;
  }

  async finish(actionId: string, outcome: McpActionClosing): Promise<void> {
    await this.prisma.agentAction.update({
      data: { finishedAt: new Date(), outcome },
      where: { id: actionId },
    });
  }
}
