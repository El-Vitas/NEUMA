import { Injectable } from '@nestjs/common';
import { NOTIFICATION_KIND } from '@neuma/shared';
import { NotificationWriter } from '../../../../common/infrastructure/persistence/notification.writer';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { TextMentionBlock, TextMentionRepositoryContract } from '../../types/notification.types';

/** Reads and writes what a mention in the text of a page needs, apart from the inbox, which only lists. */
@Injectable()
export class TextMentionRepository implements TextMentionRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationWriter: NotificationWriter,
  ) {}

  async findBlocks(blockIds: readonly string[]): Promise<readonly TextMentionBlock[]> {
    if (blockIds.length === 0) return [];
    return this.prisma.models.Block.select('id', 'properties', 'spaceId')
      .where((block) => block.id.in([...blockIds]))
      .where({ alive: true })
      .all();
  }

  async findWorkspaceIdOfSpace(spaceId: string): Promise<string | null> {
    const space = await this.prisma.models.Space.select('workspaceId').where({ id: spaceId }).first();
    return space?.workspaceId ?? null;
  }

  /** Who already has a mention of this block that came from its text, read or not. */
  async findNotifiedUserIds(blockId: string, userIds: readonly string[]): Promise<ReadonlySet<string>> {
    if (userIds.length === 0) return new Set();
    const rows = await this.prisma.models.Notification.select('recipientId')
      .where({ blockId, kind: NOTIFICATION_KIND.mention })
      .where((notification) => notification.discussionId.isNull())
      .where((notification) => notification.recipientId.in([...userIds]))
      .all();
    return new Set(rows.map((row) => row.recipientId));
  }

  async createTextMentions(
    drafts: readonly { actorId: string; blockId: string; recipientId: string }[],
  ): Promise<void> {
    if (drafts.length === 0) return;
    await this.prisma.transaction((transaction) =>
      this.notificationWriter.createMany(
        drafts.map((draft) => ({
          ...draft,
          commentId: null,
          discussionId: null,
          kind: NOTIFICATION_KIND.mention,
        })),
        transaction,
      ),
    );
  }
}
