'use client';

import { useRef, useState } from 'react';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { listPageVersionsAction, readPageVersionAction } from '../server/actions/pages.history.actions';
import type {
  PageHistoryLoadStatus,
  PagesHistory,
  PageVersionDocument,
  PageVersionListing,
  PageVersionSummary,
} from '../types/pages.history.types';

interface IProps {
  readonly pageId: string;
  readonly spaceId: string;
}

/** Reads on demand, when the panel opens or the person asks for more: history grows while the page is open. */
export const usePagesHistory = ({ pageId, spaceId }: IProps): PagesHistory => {
  const [items, setItems] = useState<readonly PageVersionSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<null | number>(null);
  const [listStatus, setListStatus] = useState<PageHistoryLoadStatus>('idle');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [didLoadMoreFail, setDidLoadMoreFail] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<null | number>(null);
  const [document, setDocument] = useState<PageVersionDocument | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PageHistoryLoadStatus>('idle');
  const latestPreviewRequest = useRef(0);

  const select = (version: number): void => {
    latestPreviewRequest.current += 1;
    const request = latestPreviewRequest.current;
    setSelectedVersion(version);
    setDocument(null);
    setPreviewStatus('loading');
    void callAction(() => readPageVersionAction({ pageId, spaceId, version })).then((result) => {
      if (request !== latestPreviewRequest.current) return;
      if (!isActionSuccess<PageVersionDocument>(result)) {
        setPreviewStatus('error');
        return;
      }
      setDocument(result.data);
      setPreviewStatus('ready');
    });
  };

  const loadFirstPage = (): void => {
    setListStatus('loading');
    void callAction(() => listPageVersionsAction({ pageId, spaceId })).then((result) => {
      if (!isActionSuccess<PageVersionListing>(result)) {
        setListStatus('error');
        return;
      }
      setItems(result.data.items);
      setNextCursor(result.data.nextCursor);
      setListStatus('ready');
      const newest = result.data.items[0];
      if (newest !== undefined) select(newest.version);
    });
  };

  const loadMore = (): void => {
    if (nextCursor === null || isLoadingMore) return;
    setIsLoadingMore(true);
    void callAction(() => listPageVersionsAction({ cursor: nextCursor, pageId, spaceId })).then((result) => {
      setIsLoadingMore(false);
      setDidLoadMoreFail(!isActionSuccess<PageVersionListing>(result));
      if (!isActionSuccess<PageVersionListing>(result)) return;
      setItems((current) => [...current, ...result.data.items]);
      setNextCursor(result.data.nextCursor);
    });
  };

  return {
    didLoadMoreFail,
    document,
    hasMore: nextCursor !== null,
    isLoadingMore,
    items,
    listStatus,
    loadFirstPage,
    loadMore,
    previewStatus,
    select,
    selectedVersion,
  };
};
