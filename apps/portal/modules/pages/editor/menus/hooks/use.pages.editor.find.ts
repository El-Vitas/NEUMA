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

export const usePagesEditorFind = (editorViewRef: RefObject<EditorView | null>): PagesEditorFind => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [found, setFound] = useState<PageEditorFindState>(PAGE_EDITOR_FIND_INITIAL_STATE);

  const sync = useCallback((view: EditorView): void => setFound(readPageEditorFindState(view)), []);

  /** The query lives here because a replaced editor state starts with a fresh plugin that has lost it. */
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
