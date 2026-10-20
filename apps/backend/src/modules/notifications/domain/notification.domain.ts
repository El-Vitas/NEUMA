import { blockRichTextSchema, listMentionedUserIds, NOTIFICATION_READ_RETENTION_DAYS } from '@neuma/shared';
import { MILLISECONDS_PER_DAY } from './notification.constants';
import type { TextMentionPlanInput } from './notification.domain.types';

/** The people a text block names with a `person` embed in its title. Other properties carry no rich text. */
export const listTextMentionedUserIds = (properties: unknown): string[] => {
  if (typeof properties !== 'object' || properties === null || !('title' in properties)) return [];
  const title = blockRichTextSchema.safeParse(properties.title);
  return title.success ? listMentionedUserIds(title.data) : [];
};

/** Who is told about a mention written in the text of a page: readers of the block who were not told before. */
export const planTextMentionRecipients = (input: TextMentionPlanInput): string[] =>
  input.mentionedUserIds.filter(
    (userId) =>
      userId !== input.actorId && input.readableUserIds.has(userId) && !input.alreadyNotifiedUserIds.has(userId),
  );

/** A notification read before this moment is deleted; one that was never read is kept. */
export const computeReadRetentionCutoff = (now: Date): Date =>
  new Date(now.getTime() - NOTIFICATION_READ_RETENTION_DAYS * MILLISECONDS_PER_DAY);
