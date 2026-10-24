'use client';

import { useContext, useEffect, useRef } from 'react';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { PAGE_COLLECTION_NOTICES_CONTEXT } from '../constants/pages.collection-notices.context.constants';
import { readPageCollectionAction } from '../server/actions/pages.collections.actions';
import type { PagesCollectionFollowingInput } from '../types/pages.collection-following.types';
import type { PageSchema } from '../types/pages.schema.types';

/**
 * Follows the notices of a collection for a view: the rows that changed go to the controller, a change of the shape
 * sends the page to the server, and a change of the view itself is checked against what this one holds.
 */
export const usePagesCollectionFollowing = (input: PagesCollectionFollowingInput): void => {
  const { changesCursor, enabled, pageId, spaceId, view } = input;
  const notices = useContext(PAGE_COLLECTION_NOTICES_CONTEXT);
  const latest = useRef(input);
  useEffect(() => {
    latest.current = input;
  });
  const heldViewVersion = useRef(view.version);
  useEffect(() => {
    heldViewVersion.current = view.version;
  }, [view.version]);

  useEffect(() => {
    if (!enabled || changesCursor === null) return;
    const controller = latest.current.createController();

    const checkView = async (): Promise<void> => {
      const result = await callAction(() => readPageCollectionAction({ pageId, spaceId }));
      const schema = isActionSuccess<null | PageSchema>(result) ? result.data : null;
      const saved = schema?.views.find((candidate) => candidate.id === latest.current.view.id);
      const held = latest.current.view;
      const isSame =
        saved?.type === held.type && JSON.stringify(saved.configuration) === JSON.stringify(held.configuration);
      if (!isSame) {
        notices.requestRefresh('view');
        return;
      }
      latest.current.onViewReordered?.();
    };

    const unsubscribe = notices.subscribe((message) => {
      if (message.schemaVersion !== undefined) {
        notices.requestRefresh('schema');
        return;
      }
      controller.notify(message.rows);
      const changed = message.views.find(
        (candidate) => candidate.id === latest.current.view.id && candidate.version > heldViewVersion.current,
      );
      if (changed === undefined) return;
      heldViewVersion.current = changed.version;
      void checkView();
    });

    return () => {
      unsubscribe();
      controller.destroy();
    };
  }, [changesCursor, enabled, notices, pageId, spaceId]);
};
