'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { isActionSuccess, isLockedActionFailure } from '@/shared/lib/action-result';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { createPageAction } from '../../../server/actions/pages.actions';
import type { PageSummary } from '../../../types/pages.types';
import type {
  PageEditorBlocksToPage,
  PageEditorPageDropParameters,
} from '../../menus/types/pages.editor.page-drop.types';
import {
  createPageEditorBlockLinkCommand,
  createPageEditorBlockRangeRemovalCommand,
  readPageEditorBlocksContent,
  readPageEditorBlocksTitle,
} from '../lib/pages.editor.block-page.lib';

/** Shared by dragging onto the tree and by the menu, so both build the page the same way. */
export const usePagesEditorBlocksToPage = ({
  editorViewRef,
  spaceId,
}: PageEditorPageDropParameters): ((request: PageEditorBlocksToPage) => void) => {
  const t = useTranslations('pages');
  const tErrors = useTranslations('errors');
  const router = useRouter();

  const announce = useCallback(
    (page: PageSummary): void => {
      router.refresh();
      toast.success(t('blocksMadePage', { page: page.title }), {
        action: {
          label: t('moveBlocksVisit'),
          onClick: () => router.push(ROUTES.PORTAL_SPACE_PAGE(spaceId, page.id)),
        },
      });
    },
    [router, spaceId, t],
  );

  return useCallback(
    ({ leaveLink, parentPageId, range }: PageEditorBlocksToPage): void => {
      const editorView = editorViewRef.current;
      const content = editorView === null ? null : readPageEditorBlocksContent(editorView.state, range);
      if (editorView === null || content === null) return;
      const title = readPageEditorBlocksTitle(editorView.state, range);

      void createPageAction({ content, parentId: parentPageId, spaceId, title }).then((result) => {
        if (!isActionSuccess(result)) {
          toast.error(isLockedActionFailure(result) ? tErrors('reasons.locked') : t('blocksMadePageError'));
          return;
        }
        const leaveBehind = leaveLink
          ? createPageEditorBlockLinkCommand({ label: result.data.title, pageId: result.data.id, range, spaceId })
          : createPageEditorBlockRangeRemovalCommand(range);
        leaveBehind(editorView.state, editorView.dispatch);
        announce(result.data);
      });
    },
    [announce, editorViewRef, spaceId, t, tErrors],
  );
};
