'use client';

import type { EditorView } from 'prosemirror-view';
import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { usePagesDiscussionsContext } from '../../../discussions/hooks/use.pages.discussions.context';
import type { DiscussionsSummary } from '../../../discussions/types/pages.discussions.types';
import {
  createPageEditorCommentMarkCommand,
  createPageEditorCommentUnmarkCommand,
  summarizePageEditorDiscussions,
} from '../lib/pages.editor.block-comment.lib';
import type { PageEditorBlockRequest } from '../types/pages.editor.block-request.types';
import type { PagesEditorDiscussions } from '../types/pages.editor.discussions.types';

/**
 * Connects the discussions of the page to the editor: tells it where they are, and gives the commands that mark or
 * unmark the words a new or deleted discussion quotes.
 */
export const usePagesEditorDiscussions = (
  editorViewRef: RefObject<EditorView | null>,
  request: PageEditorBlockRequest | null,
): PagesEditorDiscussions => {
  const summary = usePagesDiscussionsContext()?.api.summary;
  const summaryRef = useRef(summary);

  useEffect(() => {
    summaryRef.current = summary;
    const editorView = editorViewRef.current;
    if (editorView === null || summary === undefined) return;
    editorView.dispatch(summarizePageEditorDiscussions(editorView.state, summary));
  }, [editorViewRef, summary]);

  const fragment = request?.kind === 'comments' ? request.fragment : undefined;

  const anchor = (discussionId: string): void => {
    const editorView = editorViewRef.current;
    if (editorView === null || fragment === undefined) return;
    createPageEditorCommentMarkCommand(discussionId, fragment)(editorView.state, editorView.dispatch);
  };

  const unanchor = (discussionId: string): void => {
    const editorView = editorViewRef.current;
    if (editorView === null) return;
    createPageEditorCommentUnmarkCommand(discussionId)(editorView.state, editorView.dispatch);
  };

  const readSummary = useCallback((): DiscussionsSummary | undefined => summaryRef.current, []);

  return { anchor, readSummary, unanchor };
};
