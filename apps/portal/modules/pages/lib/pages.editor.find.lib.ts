import type { Node as EditorNode } from 'prosemirror-model';
import { PluginKey, TextSelection, type Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { PAGE_EDITOR_TOGGLE_TYPE } from '../constants/pages.editor.blocks.constants';
import {
  PAGE_EDITOR_FIND_INITIAL_STATE,
  PAGE_EDITOR_FIND_PLUGIN_KEY,
  PAGE_EDITOR_FIND_REQUEST_SELECTOR,
} from '../constants/pages.editor.find.constants';
import { PAGE_EDITOR_HEADING_TYPE } from '../constants/pages.editor.heading.constants';
import type { PageEditorFindMatch, PageEditorFindSpan, PageEditorFindState } from '../types/pages.editor.find.types';
import { createPageEditorAskCommand } from './pages.editor.ask.lib';
import { readPageEditorFoldedRanges } from './pages.editor.heading-fold.lib';
import { foldPageLookingCharacter, foldPageLookingText } from './pages.looking.lib';

/** What the panel and the plugin that draws its matches both answer to. */
export const pageEditorFindKey = new PluginKey<PageEditorFindState>(PAGE_EDITOR_FIND_PLUGIN_KEY);

/** Asks for the search field, the way asking for the link field already works. */
export const askForThePageFind = createPageEditorAskCommand(PAGE_EDITOR_FIND_REQUEST_SELECTOR);

/** Every stretch of writing a block holds, at the position it stands in the page. */
const collectPageEditorFindSpans = (block: EditorNode, contentStart: number): readonly PageEditorFindSpan[] => {
  const spans: PageEditorFindSpan[] = [];
  block.descendants((node, offset) => {
    if (!node.isText || node.text === undefined) return;
    spans.push({ at: contentStart + offset, text: node.text });
  });
  return spans;
};

/**
 * One block read as a single stretch of folded text, and where in the page
 * each of its characters came from.
 *
 * A mark change breaks a block into more than one span of writing, and a
 * picture sitting between two words breaks it further still. Joined without
 * telling those apart, "wor" and "ld" either side of a picture would read as
 * "world" — a match nobody actually wrote — so a gap between two spans leaves
 * a character behind that nothing typed can ever answer to.
 */
const joinPageEditorFindSpans = (
  spans: readonly PageEditorFindSpan[],
): { readonly folded: string; readonly positions: readonly number[] } => {
  let folded = '';
  const positions: number[] = [];
  let expected: number | null = null;

  for (const span of spans) {
    if (expected !== null && span.at !== expected) {
      folded += String.fromCharCode(0);
      positions.push(expected);
    }
    for (let index = 0; index < span.text.length; index += 1) {
      const foldedCharacter = foldPageLookingCharacter(span.text[index] ?? '');
      folded += foldedCharacter;
      for (let unit = 0; unit < foldedCharacter.length; unit += 1) positions.push(span.at + index);
    }
    expected = span.at + span.text.length;
  }

  return { folded, positions };
};

const findPageEditorMatchesInBlock = (
  block: EditorNode,
  blockStart: number,
  foldedQuery: string,
): readonly PageEditorFindMatch[] => {
  const { folded, positions } = joinPageEditorFindSpans(collectPageEditorFindSpans(block, blockStart + 1));
  const matches: PageEditorFindMatch[] = [];
  let searchFrom = 0;

  while (searchFrom <= folded.length - foldedQuery.length) {
    const at = folded.indexOf(foldedQuery, searchFrom);
    if (at === -1) break;
    const from = positions[at];
    const to = positions[at + foldedQuery.length - 1];
    if (from !== undefined && to !== undefined) matches.push({ from, to: to + 1 });
    searchFrom = at + foldedQuery.length;
  }

  return matches;
};

/**
 * Every place in the page that answers to what is being looked for.
 *
 * A match never reaches across two blocks: a paragraph ending and the next one
 * beginning is not a place anybody meant when they typed a word.
 */
export const findPageEditorMatches = (document: EditorNode, query: string): readonly PageEditorFindMatch[] => {
  const foldedQuery = foldPageLookingText(query);
  if (foldedQuery.length === 0) return [];

  const matches: PageEditorFindMatch[] = [];
  document.descendants((node, offset) => {
    if (!node.isTextblock) return true;
    matches.push(...findPageEditorMatchesInBlock(node, offset, foldedQuery));
    return false;
  });
  return matches;
};

const isPageEditorPositionFolded = (document: EditorNode, position: number): boolean =>
  readPageEditorFoldedRanges(document).some((range) => range.from <= position && position < range.to);

/** The collapsed heading standing closest before a position, which is the one answering for it. */
const findLastPageEditorCollapsedHeadingBefore = (document: EditorNode, position: number): number | null => {
  let found: number | null = null;
  document.forEach((node, offset) => {
    if (node.type.name === PAGE_EDITOR_HEADING_TYPE && node.attrs.collapsed === true && offset < position) {
      found = offset;
    }
  });
  return found;
};

/**
 * Opens the fold that is actually standing between a reader and a position,
 * and no other.
 *
 * A heading standing before a position is not necessarily the one hiding it —
 * an earlier fold may have already ended at a heading of its own rank before
 * this position was ever reached. Only the nearest collapsed heading answers
 * for it, so it is opened and the position is asked again: a fold nested
 * inside another does not answer for anything on its own, and asking again is
 * how the heading that actually governs the position is found next.
 */
export const unfoldPageEditorHeadingsHiding = (transaction: Transaction, position: number): Transaction => {
  let next = transaction;
  while (isPageEditorPositionFolded(next.doc, position)) {
    const headingPosition = findLastPageEditorCollapsedHeadingBefore(next.doc, position);
    if (headingPosition === null) break;
    const heading = next.doc.nodeAt(headingPosition);
    if (heading === null) break;
    next = next.setNodeMarkup(headingPosition, undefined, { ...heading.attrs, collapsed: false });
  }
  return next;
};

/** Every closed toggle a position is standing inside of, from the outermost in. */
export const findPageEditorClosedTogglePositions = (document: EditorNode, position: number): readonly number[] => {
  if (position > document.content.size) return [];
  const resolved = document.resolve(position);
  const positions: number[] = [];
  for (let depth = resolved.depth; depth > 0; depth -= 1) {
    const node = resolved.node(depth);
    if (node.type.name === PAGE_EDITOR_TOGGLE_TYPE && node.attrs.open !== true) positions.push(resolved.before(depth));
  }
  return positions;
};

/**
 * Opens whatever is hiding a match and stands the writing on it.
 *
 * A match found is a match meant to be seen, so a fold that owns it gives it
 * back, the same way writing on a folded heading does.
 */
export const revealPageEditorFindMatch = (transaction: Transaction, match: PageEditorFindMatch): Transaction => {
  let next = unfoldPageEditorHeadingsHiding(transaction, match.from);
  for (const togglePosition of findPageEditorClosedTogglePositions(next.doc, match.from)) {
    next = next.setNodeAttribute(togglePosition, 'open', true);
  }
  const inside = next.doc.resolve(Math.min(match.to, next.doc.content.size));
  return next.setSelection(TextSelection.near(inside)).scrollIntoView();
};

/** What the search plugin remembers right now, or nothing being looked for at all. */
export const readPageEditorFindState = (view: EditorView): PageEditorFindState =>
  pageEditorFindKey.getState(view.state) ?? PAGE_EDITOR_FIND_INITIAL_STATE;

/**
 * Looks for something on the page, and stands the writing on the first place
 * it answers.
 *
 * Nothing here belongs to what was written, so it is left out of the undo
 * history — taking back a search would otherwise cost somebody their last real
 * edit.
 */
export const searchPageEditorFind = (view: EditorView, query: string): void => {
  const matches = findPageEditorMatches(view.state.doc, query);
  let transaction = view.state.tr.setMeta(pageEditorFindKey, { query, type: 'query' }).setMeta('addToHistory', false);
  const first = matches[0];
  if (first !== undefined) transaction = revealPageEditorFindMatch(transaction, first);
  view.dispatch(transaction);
};

/** Moves to the match one place ahead or behind the one being read, wrapping around the page. */
export const stepPageEditorFindMatch = (view: EditorView, offset: 1 | -1): void => {
  const current = readPageEditorFindState(view);
  const total = current.matches.length;
  if (total === 0) return;

  const from = current.currentIndex ?? (offset === 1 ? -1 : 0);
  const index = (from + offset + total) % total;
  const match = current.matches[index];
  if (match === undefined) return;

  let transaction = view.state.tr.setMeta(pageEditorFindKey, { index, type: 'goto' }).setMeta('addToHistory', false);
  transaction = revealPageEditorFindMatch(transaction, match);
  view.dispatch(transaction);
};

/** Forgets the search, and gives the writing its focus back. */
export const closePageEditorFind = (view: EditorView): void => {
  view.dispatch(view.state.tr.setMeta(pageEditorFindKey, { type: 'clear' }).setMeta('addToHistory', false));
  view.focus();
};

/**
 * Puts what was asked for in place of the match being read.
 *
 * It is one transaction, and it only ever touches the text inside the match —
 * never the block around it — so a replaced word stays the word it was, said
 * differently, rather than becoming a new block wearing the old one's place.
 */
export const replacePageEditorFindMatch = (
  view: EditorView,
  match: PageEditorFindMatch,
  replacement: string,
  index: number,
): void => {
  const transaction = view.state.tr.insertText(replacement, match.from, match.to);
  transaction.setMeta(pageEditorFindKey, { index, type: 'goto' });
  view.dispatch(transaction);
};

/** Puts what was asked for in place of every match, from the last back to the first. */
export const replaceAllPageEditorFindMatches = (
  view: EditorView,
  matches: readonly PageEditorFindMatch[],
  replacement: string,
  query: string,
): void => {
  if (matches.length === 0) return;
  let transaction = view.state.tr;
  for (const match of [...matches].reverse()) transaction = transaction.insertText(replacement, match.from, match.to);
  transaction.setMeta(pageEditorFindKey, { query, type: 'query' });
  view.dispatch(transaction);
};
