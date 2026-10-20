import type { BlockPlainText, BlockRichText, BlockTextEmbed } from './block-content.types.js';

const HARD_BREAK_TEXT = ' ';

const readEmbedText = (embed: BlockTextEmbed): string => {
  if ('mention' in embed) return embed.mention.label;
  if ('person' in embed) return embed.person.label;
  if ('date' in embed) return embed.date.at;
  if ('hard_break' in embed) return HARD_BREAK_TEXT;
  return '';
};

/** Matches the page search: a mention or person reads as its label, a date as its day, a formula as nothing. */
export const extractPlainText = (richText: BlockRichText | BlockPlainText): string =>
  richText
    .map((segment) => (typeof segment.insert === 'string' ? segment.insert : readEmbedText(segment.insert)))
    .join('');
