import { Inject, Injectable } from '@nestjs/common';
import { BlockAudienceRepository } from '../../common/infrastructure/persistence/block-audience.repository';
import type { BlockCommit } from '../../common/types/block-writer.types';
import { TEXT_MENTION_REPOSITORY } from './constants/notifications.constants';
import { listTextMentionedUserIds, planTextMentionRecipients } from './domain/notification.domain';
import type { TextMentionBlock, TextMentionRepositoryContract } from './types/notification.types';

/** Tells the people named with `@` in the text of a page, once per block, when the transaction that wrote it ends. */
@Injectable()
export class TextMentionService {
  constructor(
    @Inject(TEXT_MENTION_REPOSITORY) private readonly mentions: TextMentionRepositoryContract,
    private readonly audience: BlockAudienceRepository,
  ) {}

  async notifyAfterCommit(commit: BlockCommit): Promise<void> {
    const blocks = await this.mentions.findBlocks(commit.blockIds);
    for (const block of blocks) await this.notifyAboutBlock(block, commit.userId);
  }

  private async notifyAboutBlock(block: TextMentionBlock, actorId: string): Promise<void> {
    const mentionedUserIds = listTextMentionedUserIds(block.properties).filter((userId) => userId !== actorId);
    if (mentionedUserIds.length === 0) return;
    const workspaceId = await this.mentions.findWorkspaceIdOfSpace(block.spaceId);
    if (workspaceId === null) return;
    const [readableUserIds, alreadyNotifiedUserIds] = await Promise.all([
      this.audience.findReadersOf(block.id, mentionedUserIds, workspaceId),
      this.mentions.findNotifiedUserIds(block.id, mentionedUserIds),
    ]);
    const recipients = planTextMentionRecipients({
      actorId,
      alreadyNotifiedUserIds,
      mentionedUserIds,
      readableUserIds,
    });
    await this.mentions.createTextMentions(
      recipients.map((recipientId) => ({ actorId, blockId: block.id, recipientId })),
    );
  }
}
