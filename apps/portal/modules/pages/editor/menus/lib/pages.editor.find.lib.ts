import type { Node as EditorNode } from 'prosemirror-model';
import { PluginKey, TextSelection, type Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { foldPageLookingCharacter, foldPageLookingText } from '../../../links/lib/pages.looking.lib';
import { PAGE_EDITOR_TOGGLE_TYPE } from '../../blocks/constants/pages.editor.blocks.constants';
import { createPageEditorAskCommand } from '../../lib/pages.editor.ask.lib';
import { PAGE_EDITOR_HEADING_TYPE } from '../../text/constants/pages.editor.heading.constants';
import { readPageEditorFoldedRanges } from '../../text/lib/pages.editor.heading-fold.lib';
import {
  PAGE_EDITOR_FIND_INITIAL_STATE,
  PAGE_EDITOR_FIND_PLUGIN_KEY,
  PAGE_EDITOR_FIND_REQUEST_SELECTOR,
} from '../constants/pages.editor.find.constants';
import type { PageEditorFindMatch, PageEditorFindSpan, PageEditorFindState } from '../types/pages.editor.find.types';

export const pageEditorFindKey = new PluginKey<PageEditorFindState>(PAGE_EDITOR_FIND_PLUGIN_KEY);

export const askForThePageFind = createPageEditorAskCommand(PAGE_EDITOR_FIND_REQUEST_SELECTOR);

const collectPageEditorFindSpans = (block: EditorNode, contentStart: number): readonly PageEditorFindSpan[] => {
  const spans: PageEditorFindSpan[] = [];
  block.descendants((node, offset) => {
    if (!node.isText || node.text === undefined) return;
    spans.push({ at: contentStart + offset, text: node.text });
  });
  return spans;
};

/** A gap between two spans (an inline image) inserts a NUL so "wor" + "ld" around it does not match "world". */
const joinPageEditorFindSpans = (
  spans: readonly PageEditorFindSpan[],
): { readonly folded: string; readonly positions: readonly number[] } => {
  let folded = '';
  const positions: number[] = [];
  let expected: number | null = null;

  for (const span of spans) {
    if (expected !== null && span.at !== expected) {
      folded += String.fromCodePoint(0);
      positions.push(expected);
    }
    for (let index = 0; index < span.text.length; index += 1) {
      const foldedCharacter = foldPageLookingCharacter(span.text[index] ?? '');
      folded += foldedCharacter;
      positions.push(...Array.from({ length: foldedCharacter.length }, () => span.at + index));
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

/** Matches never span two blocks. */
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
 * Unfolds one collapsed heading at a time and re-checks, because an earlier collapsed heading may have ended before
 * the position and not be the one hiding it.
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

export const revealPageEditorFindMatch = (transaction: Transaction, match: PageEditorFindMatch): Transaction => {
  let next = unfoldPageEditorHeadingsHiding(transaction, match.from);
  for (const togglePosition of findPageEditorClosedTogglePositions(next.doc, match.from)) {
    next = next.setNodeAttribute(togglePosition, 'open', true);
  }
  const inside = next.doc.resolve(Math.min(match.to, next.doc.content.size));
  return next.setSelection(TextSelection.near(inside)).scrollIntoView();
};

export const readPageEditorFindState = (view: EditorView): PageEditorFindState =>
  pageEditorFindKey.getState(view.state) ?? PAGE_EDITOR_FIND_INITIAL_STATE;

/** Search transactions stay out of the undo history so undo never reverts a search instead of an edit. */
export const searchPageEditorFind = (view: EditorView, query: string): void => {
  const matches = findPageEditorMatches(view.state.doc, query);
  let transaction = view.state.tr.setMeta(pageEditorFindKey, { query, type: 'query' }).setMeta('addToHistory', false);
  const first = matches[0];
  if (first !== undefined) transaction = revealPageEditorFindMatch(transaction, first);
  view.dispatch(transaction);
};

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

export const closePageEditorFind = (view: EditorView): void => {
  view.dispatch(view.state.tr.setMeta(pageEditorFindKey, { type: 'clear' }).setMeta('addToHistory', false));
  view.focus();
};

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

export const replaceAllPageEditorFindMatches = (
  view: EditorView,
  matches: readonly PageEditorFindMatch[],
  replacement: string,
  query: string,
): void => {
  if (matches.length === 0) return;
  let transaction = view.state.tr;
  // Last to first, so earlier positions stay valid.
  for (const match of [...matches].reverse()) transaction = transaction.insertText(replacement, match.from, match.to);
  transaction.setMeta(pageEditorFindKey, { query, type: 'query' });
  view.dispatch(transaction);
};
