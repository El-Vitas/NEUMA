'use client';

import type { EditorView } from 'prosemirror-view';
import { type RefObject, useCallback, useState } from 'react';
import { PAGE_EDITOR_FIND_INITIAL_STATE } from '../constants/pages.editor.find.constants';
import {
  closePageEditorFind,
  readPageEditorFindState,
  replaceAllPageEditorFindMatches,
  replacePageEditorFindMatch,
  searchPageEditorFind,
  stepPageEditorFindMatch,
} from '../lib/pages.editor.find.lib';
import type { PageEditorFindState, PagesEditorFind } from '../types/pages.editor.find.types';

/**
 * The search panel's own state, kept apart from the plugin it reads: a panel
 * that has not been asked to open has nothing to show, however many matches
 * the plugin remembers from before.
 */
export const usePagesEditorFind = (editorViewRef: RefObject<EditorView | null>): PagesEditorFind => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [found, setFound] = useState<PageEditorFindState>(PAGE_EDITOR_FIND_INITIAL_STATE);

  /** What the plugin remembers, read again after anything that could have changed it. */
  const sync = useCallback((view: EditorView): void => setFound(readPageEditorFindState(view)), []);

  /**
   * Runs the same search again against a state the editor was just given.
   *
   * The query lives here, not in the plugin: a new editor state is born with a
   * plugin that has never heard of it, so an open search would otherwise go
   * silent the moment the state underneath it is replaced — the panel still
   * open, still holding what was typed, answering nothing. Asking again is
   * what puts the matches back.
   */
  const resume = useCallback(
    (view: EditorView): void => {
      if (isOpen && query.length > 0) searchPageEditorFind(view, query);
    },
    [isOpen, query],
  );

  const open = useCallback((): void => setIsOpen(true), []);

  const close = useCallback((): void => {
    setIsOpen(false);
    setQuery('');
    setReplacement('');
    const editorView = editorViewRef.current;
    if (editorView !== null) closePageEditorFind(editorView);
  }, [editorViewRef]);

  const search = useCallback(
    (nextQuery: string): void => {
      setQuery(nextQuery);
      const editorView = editorViewRef.current;
      if (editorView !== null) searchPageEditorFind(editorView, nextQuery);
    },
    [editorViewRef],
  );

  const goNext = useCallback((): void => {
    const editorView = editorViewRef.current;
    if (editorView !== null) stepPageEditorFindMatch(editorView, 1);
  }, [editorViewRef]);

  const goPrevious = useCallback((): void => {
    const editorView = editorViewRef.current;
    if (editorView !== null) stepPageEditorFindMatch(editorView, -1);
  }, [editorViewRef]);

  const replace = useCallback((): void => {
    const editorView = editorViewRef.current;
    const currentIndex = found.currentIndex;
    const match = currentIndex === null ? undefined : found.matches[currentIndex];
    if (editorView === null || match === undefined) return;
    replacePageEditorFindMatch(editorView, match, replacement, currentIndex ?? 0);
  }, [editorViewRef, found, replacement]);

  const replaceAll = useCallback((): void => {
    const editorView = editorViewRef.current;
    if (editorView !== null) replaceAllPageEditorFindMatches(editorView, found.matches, replacement, found.query);
  }, [editorViewRef, found, replacement]);

  return {
    close,
    found,
    goNext,
    goPrevious,
    isOpen,
    open,
    query,
    replace,
    replaceAll,
    replacement,
    resume,
    search,
    setReplacement,
    sync,
  };
};
