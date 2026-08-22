import { Plugin as EditorPlugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import {
  PAGE_EDITOR_FIND_CURRENT_MATCH_STYLE_CLASS,
  PAGE_EDITOR_FIND_INITIAL_STATE,
  PAGE_EDITOR_FIND_MATCH_STYLE_CLASS,
} from '../constants/pages.editor.find.constants';
import type { PageEditorFindMatch, PageEditorFindMeta, PageEditorFindState } from '../types/pages.editor.find.types';
import { findPageEditorMatches, pageEditorFindKey } from './pages.editor.find.lib';

const isPageEditorFindMeta = (value: unknown): value is PageEditorFindMeta =>
  typeof value === 'object' && value !== null && 'type' in value;

/** Where a match stands once a new query, a jump, or the writing itself has moved it. */
const nextPageEditorFindCurrentIndex = (
  meta: PageEditorFindMeta | undefined,
  value: PageEditorFindState,
  matches: readonly PageEditorFindMatch[],
): number | null => {
  if (matches.length === 0) return null;
  if (meta?.type === 'goto') return Math.min(Math.max(meta.index, 0), matches.length - 1);
  if (meta?.type === 'query') return 0;
  return value.currentIndex !== null && value.currentIndex < matches.length ? value.currentIndex : 0;
};

const buildPageEditorFindDecorations = (state: PageEditorFindState): readonly Decoration[] =>
  state.matches.map((match, index) =>
    Decoration.inline(match.from, match.to, {
      class:
        index === state.currentIndex ? PAGE_EDITOR_FIND_CURRENT_MATCH_STYLE_CLASS : PAGE_EDITOR_FIND_MATCH_STYLE_CLASS,
    }),
  );

/**
 * Highlights every place on the page that answers to what is being looked for.
 *
 * Nothing here is written on the document — a search is not something the page
 * remembers once it is over, so it can only ever be a decoration, drawn fresh
 * from what the plugin itself remembers and gone the moment that is cleared.
 */
export const createPageEditorFindPlugin = (): EditorPlugin<PageEditorFindState> =>
  new EditorPlugin<PageEditorFindState>({
    key: pageEditorFindKey,
    props: {
      decorations: (state) => {
        const found = pageEditorFindKey.getState(state) ?? PAGE_EDITOR_FIND_INITIAL_STATE;
        return DecorationSet.create(state.doc, [...buildPageEditorFindDecorations(found)]);
      },
    },
    state: {
      apply: (transaction, value, _oldState, newState) => {
        const carried: unknown = transaction.getMeta(pageEditorFindKey);
        const meta = isPageEditorFindMeta(carried) ? carried : undefined;
        if (meta?.type === 'clear') return PAGE_EDITOR_FIND_INITIAL_STATE;
        if (meta === undefined && !transaction.docChanged) return value;

        const query = meta?.type === 'query' ? meta.query : value.query;
        const matches = query.length === 0 ? [] : findPageEditorMatches(newState.doc, query);
        return { currentIndex: nextPageEditorFindCurrentIndex(meta, value, matches), matches, query };
      },
      init: () => PAGE_EDITOR_FIND_INITIAL_STATE,
    },
  });
