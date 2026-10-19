import type { BlockContent, BlockRichText } from '@neuma/shared';
import { BLOCK_TYPE } from '@neuma/shared';
import { BLOCK_LINK_KIND } from './block.operation.constants';
import type { BlockLinkDiff, BlockLinkDraft, BlockLinkTarget, StoredBlockLink } from './block.transaction.domain.types';

const readMentionTargets = (richText: BlockRichText): BlockLinkTarget[] =>
  richText.flatMap(({ insert }) =>
    typeof insert !== 'string' && 'mention' in insert
      ? [{ kind: BLOCK_LINK_KIND.mention, targetBlockId: insert.mention.pageId }]
      : [],
  );

const readTitleMentions = (content: BlockContent): BlockLinkTarget[] => {
  switch (content.type) {
    case BLOCK_TYPE.paragraph:
    case BLOCK_TYPE.heading:
    case BLOCK_TYPE.bulletedListItem:
    case BLOCK_TYPE.numberedListItem:
    case BLOCK_TYPE.toDo:
    case BLOCK_TYPE.toggle:
      return readMentionTargets(content.properties.title);
    default:
      return [];
  }
};

const readReferenceTarget = (content: BlockContent): BlockLinkTarget[] => {
  switch (content.type) {
    case BLOCK_TYPE.subpage:
      return [{ kind: BLOCK_LINK_KIND.subpage, targetBlockId: content.properties.pageId }];
    case BLOCK_TYPE.synced:
      return [{ kind: BLOCK_LINK_KIND.synced, targetBlockId: content.properties.blockId }];
    case BLOCK_TYPE.collection:
      return [{ kind: BLOCK_LINK_KIND.collection, targetBlockId: content.properties.pageId }];
    default:
      return [];
  }
};

const toLinkKey = (target: BlockLinkTarget): string => `${target.kind}:${target.targetBlockId}`;

/**
 * Where a block points: mentions in its rich text, the page of a subpage, the source of a synced block and the
 * collection of an inline collection. A block that points at itself links nothing.
 */
export const extractBlockLinkTargets = (blockId: string, content: BlockContent): BlockLinkTarget[] => {
  const targets = [...readTitleMentions(content), ...readReferenceTarget(content)].filter(
    (target) => target.targetBlockId !== blockId,
  );
  return [...new Map(targets.map((target) => [toLinkKey(target), target])).values()];
};

const toDraftKey = (link: BlockLinkDraft): string =>
  [link.sourceBlockId, link.targetBlockId, link.kind, link.sourcePageId].join('|');

/**
 * What to delete and insert so the stored links of the touched sources equal the wanted ones. A link whose page
 * changed counts as another link, so it is replaced.
 */
export const diffBlockLinks = (
  stored: readonly StoredBlockLink[],
  wanted: readonly BlockLinkDraft[],
): BlockLinkDiff => {
  const storedKeys = new Set(stored.map(toDraftKey));
  const wantedKeys = new Set(wanted.map(toDraftKey));
  return {
    deleteIds: stored.filter((link) => !wantedKeys.has(toDraftKey(link))).map((link) => link.id),
    drafts: wanted.filter((link) => !storedKeys.has(toDraftKey(link))),
  };
};
