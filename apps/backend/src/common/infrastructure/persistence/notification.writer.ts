import { Injectable } from '@nestjs/common';
import type { NeumaTransaction } from '@neuma/db';
import { PrismaService } from '../../../prisma/prisma.service';
import { COMMENT_EVENT_KIND, COMMENT_EVENTS_CHANNEL } from '../../constants/comment-events.constants';
import type { CommentEvent, DiscussionChangedEvent, NotificationDraft } from '../../types/comment-events.types';

/**
 * Creates notifications and says so on the live channel in the same transaction, so a person is told exactly when
 * the rows become visible and never about a transaction that rolled back.
 */
@Injectable()
export class NotificationWriter {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(drafts: readonly NotificationDraft[], transaction: NeumaTransaction): Promise<void> {
    for (const draft of drafts) {
      // The inbox pages by this date, so it is set here with the precision a JavaScript date keeps.
      const created = await transaction.orm.public.Notification.select('id').create({
        ...draft,
        createdAt: new Date(),
      });
      await this.announce(
        { kind: COMMENT_EVENT_KIND.notification, notificationId: created.id, recipientId: draft.recipientId },
        transaction,
      );
    }
  }

  async announceDiscussion(event: Omit<DiscussionChangedEvent, 'kind'>, transaction: NeumaTransaction): Promise<void> {
    await this.announce({ ...event, kind: COMMENT_EVENT_KIND.discussion }, transaction);
  }

  private async announce(event: CommentEvent, transaction: NeumaTransaction): Promise<void> {
    await transaction.execute(
      this.prisma.sql`SELECT pg_notify(${COMMENT_EVENTS_CHANNEL}, ${JSON.stringify(event)})::text`
        .affectedCount()
        .build(),
    );
  }
}
