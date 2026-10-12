import { Injectable } from '@nestjs/common';
import { AgentActionOutcome, isUniqueViolation } from '@neuma/db';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { McpActionClosing, McpActionEntry, McpActionLog, McpLiveRequest } from '../../types/mcp.types';
import { McpRequestTakenError } from '../errors/mcp.request-taken.error';

/** Each agent write is recorded as pending before it runs and closed when it ends. */
@Injectable()
export class McpActionRepository implements McpActionLog {
  constructor(private readonly prisma: PrismaService) {}

  async start(entry: McpActionEntry): Promise<string> {
    try {
      const action = await this.prisma.models.AgentAction.create({
        blockIds: [...entry.blockIds],
        detail: { ...entry.detail },
        outcome: AgentActionOutcome.PENDING,
        pageId: entry.pageId,
        requestId: entry.requestId,
        tokenId: entry.tokenId,
        tool: entry.tool,
        userId: entry.userId,
        workspaceId: entry.workspaceId,
      });
      return action.id;
    } catch (error) {
      if (entry.requestId !== null && isUniqueViolation(error)) throw new McpRequestTakenError(entry.requestId);
      throw error;
    }
  }

  async finish(actionId: string, outcome: McpActionClosing, createdPageId?: string): Promise<void> {
    const updated = await this.prisma.models.AgentAction.where({ id: actionId }).update({
      finishedAt: new Date(),
      outcome,
      ...(createdPageId === undefined ? {} : { pageId: createdPageId }),
    });
    if (updated === null) throw new Error(`Agent action ${actionId} to close was not found`);
  }

  async findLiveRequest(tokenId: string, requestId: string): Promise<McpLiveRequest | null> {
    const action = await this.prisma.models.AgentAction.select('createdAt', 'id', 'outcome', 'pageId', 'tool')
      .where({ requestId, tokenId })
      .where((candidate) => candidate.outcome.in([AgentActionOutcome.PENDING, AgentActionOutcome.DONE]))
      .first();
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
