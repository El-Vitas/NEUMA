'use client';

import type { BlockRichText, CommentView, DiscussionView } from '@neuma/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { callAction, isActionSuccess, readActionFailureReason } from '@/shared/lib/action-result';
import { DISCUSSION_REFRESH_DEBOUNCE_MS, EMPTY_DISCUSSIONS } from '../constants/pages.discussions.constants';
import {
  removeDiscussionFrom,
  replaceCommentIn,
  summarizeDiscussions,
  upsertDiscussion,
} from '../lib/pages.discussions.lib';
import {
  editCommentAction,
  openDiscussionAction,
  readPageDiscussionsAction,
  removeCommentAction,
  reopenDiscussionAction,
  replyToDiscussionAction,
  resolveDiscussionAction,
} from '../server/actions/pages.discussions.actions';
import type { DiscussionsOutcome, DiscussionsStatus, PageDiscussionsApi } from '../types/pages.discussions.types';

const failed = (result: unknown): { readonly isOk: false; readonly reason: string } => ({
  isOk: false,
  reason: readActionFailureReason(result),
});

/**
 * The discussions of one page, read from the server. A change from this screen updates the list with what the server
 * answered; a change from anywhere else arrives as a refresh request, which the caller makes when the live channel
 * says a discussion changed.
 */
export const usePageDiscussions = (pageId: string | null): PageDiscussionsApi => {
  const [discussions, setDiscussions] = useState<readonly DiscussionView[]>(EMPTY_DISCUSSIONS);
  const [status, setStatus] = useState<DiscussionsStatus>('loading');
  const readCounterRef = useRef(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const read = useCallback(async (): Promise<void> => {
    if (pageId === null) return;
    readCounterRef.current += 1;
    const ticket = readCounterRef.current;
    const result = await callAction(() => readPageDiscussionsAction({ pageId }));
    if (ticket !== readCounterRef.current) return;
    if (isActionSuccess<readonly DiscussionView[]>(result)) {
      setDiscussions(result.data);
      setStatus('ready');
    } else setStatus('failed');
  }, [pageId]);

  /** The page is shown under a key of its own, so a new page starts from empty state; the first read is a callback. */
  useEffect(() => {
    const firstRead = setTimeout(() => void read(), 0);
    return () => {
      clearTimeout(firstRead);
      if (refreshTimerRef.current !== null) clearTimeout(refreshTimerRef.current);
    };
  }, [read]);

  /** Several changes in a burst (a reply and its notification) become one read. */
  const refresh = useCallback((): Promise<void> => {
    if (refreshTimerRef.current !== null) clearTimeout(refreshTimerRef.current);
    return new Promise<void>((resolve) => {
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        void read().then(resolve);
      }, DISCUSSION_REFRESH_DEBOUNCE_MS);
    });
  }, [read]);

  const keep = useCallback((updated: DiscussionView): DiscussionsOutcome<DiscussionView> => {
    setDiscussions((previous) => upsertDiscussion(previous, updated));
    return { isOk: true, value: updated };
  }, []);

  const open = useCallback(
    async (blockId: string, body: BlockRichText, quote?: string): Promise<DiscussionsOutcome<DiscussionView>> => {
      const result = await callAction(() =>
        openDiscussionAction({ blockId, body, ...(quote === undefined ? {} : { quote }) }),
      );
      return isActionSuccess<DiscussionView>(result) ? keep(result.data) : failed(result);
    },
    [keep],
  );

  const reply = useCallback(
    async (discussionId: string, body: BlockRichText): Promise<DiscussionsOutcome<DiscussionView>> => {
      const result = await callAction(() => replyToDiscussionAction({ body, discussionId }));
      return isActionSuccess<DiscussionView>(result) ? keep(result.data) : failed(result);
    },
    [keep],
  );

  const resolve = useCallback(
    async (discussionId: string): Promise<DiscussionsOutcome<DiscussionView>> => {
      const result = await callAction(() => resolveDiscussionAction({ discussionId }));
      return isActionSuccess<DiscussionView>(result) ? keep(result.data) : failed(result);
    },
    [keep],
  );

  const reopen = useCallback(
    async (discussionId: string): Promise<DiscussionsOutcome<DiscussionView>> => {
      const result = await callAction(() => reopenDiscussionAction({ discussionId }));
      return isActionSuccess<DiscussionView>(result) ? keep(result.data) : failed(result);
    },
    [keep],
  );

  const edit = useCallback(async (commentId: string, body: BlockRichText): Promise<DiscussionsOutcome<CommentView>> => {
    const result = await callAction(() => editCommentAction({ body, commentId }));
    if (!isActionSuccess<CommentView>(result)) return failed(result);
    setDiscussions((previous) => replaceCommentIn(previous, result.data));
    return { isOk: true, value: result.data };
  }, []);

  const remove = useCallback(
    async (commentId: string): Promise<DiscussionsOutcome<true>> => {
      const result = await callAction(() => removeCommentAction({ commentId }));
      if (!isActionSuccess<{ readonly discussionRemoved: boolean }>(result)) return failed(result);
      const discussionId = discussions.find((discussion) =>
        discussion.comments.some((comment) => comment.id === commentId),
      )?.id;
      if (result.data.discussionRemoved && discussionId !== undefined) {
        setDiscussions((previous) => removeDiscussionFrom(previous, discussionId));
      } else await read();
      return { isOk: true, value: true };
    },
    [discussions, read],
  );

  const summary = useMemo(() => summarizeDiscussions(discussions), [discussions]);

  return useMemo(
    () => ({ discussions, edit, open, refresh, remove, reopen, reply, resolve, status, summary }),
    [discussions, edit, open, refresh, remove, reopen, reply, resolve, status, summary],
  );
};
