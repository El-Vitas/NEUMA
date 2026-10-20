import type { BlockRichText } from '../block/block-content.types.js';

const readPersonUserId = (segment: BlockRichText[number]): string | null =>
  typeof segment.insert !== 'string' && 'person' in segment.insert ? segment.insert.person.userId : null;

const readSegmentText = (segment: BlockRichText[number]): string => {
  if (typeof segment.insert === 'string') return segment.insert;
  return 'person' in segment.insert ? segment.insert.person.label : '';
};

/** The people a comment names with a `person` embed, each once, in the order they first appear. */
export const listMentionedUserIds = (body: BlockRichText): string[] => [
  ...new Set(body.flatMap((segment) => readPersonUserId(segment) ?? [])),
];

export const isCommentBodyEmpty = (body: BlockRichText): boolean =>
  body.every((segment) => readSegmentText(segment).trim().length === 0);

/** What a notification shows of a comment: its text, with each mention as its label, cut at `maxLength`. */
export const readCommentExcerpt = (body: BlockRichText, maxLength: number): string => {
  const text = body.map(readSegmentText).join('').trim();
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}…`;
};
