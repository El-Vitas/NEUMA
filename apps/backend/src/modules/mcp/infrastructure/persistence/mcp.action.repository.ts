import { AgentActionOutcome } from '@company-brain/db';
import { Prisma } from '@company-brain/db/generated';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { MCP_UNIQUE_VIOLATION_CODE } from '../../constants/mcp.constants';
import type { McpActionClosing, McpActionEntry, McpActionLog, McpLiveRequest } from '../../types/mcp.types';
import { McpRequestTakenError } from '../errors/mcp.request-taken.error';

const isRequestTaken = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === MCP_UNIQUE_VIOLATION_CODE;

/** Donde queda anotada cada escritura de un agente: pendiente antes de escribir, cerrada al terminar. */
@Injectable()
export class McpActionRepository implements McpActionLog {
  constructor(private readonly prisma: PrismaService) {}

  async start(entry: McpActionEntry): Promise<string> {
    try {
      const action = await this.prisma.agentAction.create({
        data: {
          blockIds: [...entry.blockIds],
          detail: { ...entry.detail },
          outcome: AgentActionOutcome.PENDING,
          pageId: entry.pageId,
          requestId: entry.requestId,
          tokenId: entry.tokenId,
          tool: entry.tool,
          userId: entry.userId,
          workspaceId: entry.workspaceId,
        },
        select: { id: true },
      });
      return action.id;
    } catch (error) {
      if (entry.requestId !== null && isRequestTaken(error)) throw new McpRequestTakenError(entry.requestId);
      throw error;
    }
  }

  async finish(actionId: string, outcome: McpActionClosing, createdPageId?: string): Promise<void> {
    await this.prisma.agentAction.update({
      data: { finishedAt: new Date(), outcome, ...(createdPageId === undefined ? {} : { pageId: createdPageId }) },
      where: { id: actionId },
    });
  }

  async findLiveRequest(tokenId: string, requestId: string): Promise<McpLiveRequest | null> {
    const action = await this.prisma.agentAction.findFirst({
      select: { createdAt: true, id: true, outcome: true, pageId: true, tool: true },
      where: { outcome: { in: [AgentActionOutcome.PENDING, AgentActionOutcome.DONE] }, requestId, tokenId },
    });
    if (action === null) return null;
    return {
      actionId: action.id,
      isDone: action.outcome === AgentActionOutcome.DONE,
      pageId: action.pageId,
      startedAt: action.createdAt,
      tool: action.tool,
    };
  }
}
