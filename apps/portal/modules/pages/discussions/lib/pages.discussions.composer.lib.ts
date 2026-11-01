import type { BlockRichText } from '@neuma/shared';
import type { PagePersonOption } from '../../collections/types/pages.schema.types';
import { DISCUSSION_MENTION_TRIGGER, DISCUSSION_WHITESPACE } from '../constants/pages.discussions.constants';
import type {
  DiscussionDraft,
  DiscussionKeyAnswer,
  DiscussionKeyPress,
  DiscussionMention,
  DiscussionMentionInsertion,
  DiscussionMentionQuery,
  DiscussionMentionState,
  PlacedDiscussionMention,
} from '../types/pages.discussions.types';

const simplify = (text: string): string =>
  text
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** An `@` opens a mention only at the start of a word, so an email address is left alone. */
export const findMentionQuery = (text: string, caret: number): DiscussionMentionQuery | null => {
  const before = text.slice(0, caret);
  const start = before.lastIndexOf(DISCUSSION_MENTION_TRIGGER);
  if (start === -1) return null;
  const isAtWordStart = start === 0 || DISCUSSION_WHITESPACE.test(before.charAt(start - 1));
  const query = before.slice(start + 1);
  if (!isAtWordStart || DISCUSSION_WHITESPACE.test(query)) return null;
  return { query, start };
};

export const filterPersonOptions = (
  options: readonly PagePersonOption[],
  query: string,
  limit: number,
): readonly PagePersonOption[] => {
  const wanted = simplify(query.trim());
  return options
    .filter((option) => simplify(option.name).includes(wanted) || simplify(option.email).includes(wanted))
    .slice(0, limit);
};

export const insertMention = (
  draft: DiscussionDraft,
  found: DiscussionMentionQuery,
  person: PagePersonOption,
): DiscussionMentionInsertion => {
  const end = found.start + 1 + found.query.length;
  const token = `${DISCUSSION_MENTION_TRIGGER}${person.name} `;
  const text = `${draft.text.slice(0, found.start)}${token}${draft.text.slice(end)}`;
  const isKnown = draft.mentions.some((mention) => mention.userId === person.id && mention.label === person.name);
  const mentions = isKnown ? draft.mentions : [...draft.mentions, { label: person.name, userId: person.id }];
  return { caret: found.start + token.length, draft: { mentions, text } };
};

/** Each mention takes the first place its name stands that no other mention took. */
const placeMentions = (draft: DiscussionDraft): readonly PlacedDiscussionMention[] => {
  const placed: PlacedDiscussionMention[] = [];
  for (const mention of draft.mentions) {
    const token = `${DISCUSSION_MENTION_TRIGGER}${mention.label}`;
    let from = 0;
    for (;;) {
      const start = draft.text.indexOf(token, from);
      if (start === -1) break;
      const end = start + token.length;
      if (!placed.some((other) => start < other.end && end > other.start)) {
        placed.push({ end, mention, start });
        break;
      }
      from = end;
    }
  }
  return placed.toSorted((first, second) => first.start - second.start);
};

export const buildCommentBody = (draft: DiscussionDraft): BlockRichText => {
  const text = draft.text.trim();
  if (text.length === 0) return [];
  const trimmed = { mentions: draft.mentions, text };
  const body: BlockRichText = [];
  let cursor = 0;
  for (const { end, mention, start } of placeMentions(trimmed)) {
    if (start > cursor) body.push({ insert: text.slice(cursor, start) });
    body.push({ insert: { person: { label: mention.label, userId: mention.userId } } });
    cursor = end;
  }
  if (cursor < text.length) body.push({ insert: text.slice(cursor) });
  return body;
};

const answerOpenListKey = (press: DiscussionKeyPress, state: DiscussionMentionState): DiscussionKeyAnswer => {
  switch (press.key) {
    case 'ArrowDown':
      return { index: (state.selectedIndex + 1) % Math.max(state.optionsCount, 1), kind: 'move' };
    case 'ArrowUp':
      return { index: (state.selectedIndex - 1 + state.optionsCount) % Math.max(state.optionsCount, 1), kind: 'move' };
    case 'Enter':
    case 'Tab':
      return state.optionsCount > 0 ? { kind: 'choose' } : { kind: 'none' };
    case 'Escape':
      return { kind: 'close' };
    default:
      return { kind: 'none' };
  }
};

/** What a key press means in the box: pick a person from the open list, close it, or send with Ctrl or Cmd + Enter. */
export const answerDiscussionKey = (press: DiscussionKeyPress, state: DiscussionMentionState): DiscussionKeyAnswer => {
  if (state.isListOpen) {
    const answer = answerOpenListKey(press, state);
    if (answer.kind !== 'none') return answer;
  }
  return press.key === 'Enter' && (press.metaKey || press.ctrlKey) ? { kind: 'submit' } : { kind: 'none' };
};

export const readCommentDraft = (body: BlockRichText): DiscussionDraft => {
  const mentions: DiscussionMention[] = [];
  let text = '';
  for (const segment of body) {
    if (typeof segment.insert === 'string') {
      text += segment.insert;
      continue;
    }
    if (!('person' in segment.insert)) continue;
    const { label, userId } = segment.insert.person;
    text += `${DISCUSSION_MENTION_TRIGGER}${label}`;
    if (!mentions.some((mention) => mention.userId === userId && mention.label === label)) {
      mentions.push({ label, userId });
    }
  }
  return { mentions, text };
};
