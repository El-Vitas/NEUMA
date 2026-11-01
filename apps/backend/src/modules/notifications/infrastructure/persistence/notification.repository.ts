import { Injectable } from '@nestjs/common';
import { and, or } from '@neuma/db';
import { blockRichTextSchema, NOTIFICATION_KIND_VALUES, type NotificationKind } from '@neuma/shared';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  NotificationListQuery,
  NotificationRecord,
  NotificationRepositoryContract,
  NotificationRow,
  NotificationSources,
} from '../../types/notification.types';

const isNotificationKind = (value: string): value is NotificationKind =>
  NOTIFICATION_KIND_VALUES.some((kind) => kind === value);

const toRecord = (row: NotificationRow): NotificationRecord => {
  if (!isNotificationKind(row.kind)) throw new Error(`Notification ${row.id} has an unknown kind ${row.kind}`);
  return {
    actorId: row.actorId,
    blockId: row.blockId,
    commentId: row.commentId,
    createdAt: row.createdAt,
    discussionId: row.discussionId,
    id: row.id,
    kind: row.kind,
    readAt: row.readAt,
    recipientId: row.recipientId,
  };
};

const distinct = (values: readonly (string | null)[]): string[] => [
  ...new Set(values.flatMap((value) => (value === null ? [] : [value]))),
];

@Injectable()
export class NotificationRepository implements NotificationRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest first, one page of candidates; the service drops those whose block the person can no longer read. */
  async list(query: NotificationListQuery): Promise<readonly NotificationRecord[]> {
    const { after } = query;
    const rows = await this.prisma.models.Notification.where({ recipientId: query.recipientId })
      .where((notification) => (query.unreadOnly ? notification.readAt.isNull() : notification.id.isNotNull()))
      .where((notification) =>
        after === null
          ? notification.id.isNotNull()
          : or(
              notification.createdAt.lt(after.at),
              and(notification.createdAt.eq(after.at), notification.id.lt(after.id)),
            ),
      )
      .orderBy([(notification) => notification.createdAt.desc(), (notification) => notification.id.desc()])
      .limit(query.size)
      .all();
    return rows.map(toRecord);
  }

  async listUnread(recipientId: string, max: number): Promise<readonly NotificationRecord[]> {
    const rows = await this.prisma.models.Notification.where({ recipientId })
      .where((notification) => notification.readAt.isNull())
      .orderBy([(notification) => notification.createdAt.desc(), (notification) => notification.id.desc()])
      .limit(max)
      .all();
    return rows.map(toRecord);
  }

  async findOwned(notificationId: string, recipientId: string): Promise<NotificationRecord | null> {
    const row = await this.prisma.models.Notification.where({ id: notificationId, recipientId }).first();
    return row === null ? null : toRecord(row);
  }

  async markRead(notificationId: string, readAt: Date): Promise<void> {
    await this.prisma.models.Notification.where({ id: notificationId })
      .where((notification) => notification.readAt.isNull())
      .updateAndCount({ readAt });
  }

  async markAllRead(recipientId: string, readAt: Date): Promise<number> {
    return this.prisma.models.Notification.where({ recipientId })
      .where((notification) => notification.readAt.isNull())
      .updateAndCount({ readAt });
  }

  async deleteReadBefore(cutoff: Date): Promise<number> {
    return this.prisma.models.Notification.where((notification) => notification.readAt.lt(cutoff)).deleteAndCount();
  }

  async readSources(records: readonly NotificationRecord[]): Promise<NotificationSources> {
    const [actors, comments, blocks] = await Promise.all([
      this.readActorNames(distinct(records.map((record) => record.actorId))),
      this.readCommentBodies(distinct(records.map((record) => record.commentId))),
      this.readBlockTexts(
        distinct(records.filter((record) => record.commentId === null).map((record) => record.blockId)),
      ),
    ]);
    return { actorNames: actors, blockTexts: blocks, commentBodies: comments };
  }

  private async readActorNames(userIds: readonly string[]): Promise<ReadonlyMap<string, string>> {
    if (userIds.length === 0) return new Map();
    const users = await this.prisma.models.User.select('id', 'name')
      .where((user) => user.id.in([...userIds]))
      .all();
    return new Map(users.map((user) => [user.id, user.name]));
  }

  private async readCommentBodies(commentIds: readonly string[]): Promise<NotificationSources['commentBodies']> {
    if (commentIds.length === 0) return new Map();
    const comments = await this.prisma.models.Comment.select('id', 'body')
      .where((comment) => comment.id.in([...commentIds]))
      .all();
    return new Map(
      comments.flatMap((comment) => {
        const body = blockRichTextSchema.safeParse(comment.body);
        return body.success ? [[comment.id, body.data] as const] : [];
      }),
    );
  }

  private async readBlockTexts(blockIds: readonly string[]): Promise<ReadonlyMap<string, string>> {
    if (blockIds.length === 0) return new Map();
    const blocks = await this.prisma.models.Block.select('id', 'text')
      .where((block) => block.id.in([...blockIds]))
      .all();
    return new Map(blocks.map((block) => [block.id, block.text]));
  }
}
