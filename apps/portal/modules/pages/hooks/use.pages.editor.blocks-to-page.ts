'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { isActionSuccess } from '@/shared/lib/action-result';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import {
  createPageEditorBlockLinkCommand,
  createPageEditorBlockRangeRemovalCommand,
  readPageEditorBlocksContent,
  readPageEditorBlocksTitle,
} from '../lib/pages.editor.block-page.lib';
import { createPageAction } from '../server/actions/pages.actions';
import type { PageEditorBlocksToPage, PageEditorPageDropParameters } from '../types/pages.editor.page-drop.types';
import type { PageSummary } from '../types/pages.types';

/**
 * Blocks becoming a page of their own.
 *
 * One answer for both ways of asking — dragging them onto the tree, or asking
 * the menu — so the page is built the same way whichever gesture started it:
 * the blocks travel whole, the new page is named after their first line, and
 * what is left where they were is either a link to them or nothing at all.
 */
export const usePagesEditorBlocksToPage = ({
  editorViewRef,
  spaceId,
}: PageEditorPageDropParameters): ((request: PageEditorBlocksToPage) => void) => {
  const t = useTranslations('pages');
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
          toast.error(t('blocksMadePageError'));
          return;
        }
        const leaveBehind = leaveLink
          ? createPageEditorBlockLinkCommand({ label: result.data.title, pageId: result.data.id, range, spaceId })
          : createPageEditorBlockRangeRemovalCommand(range);
        leaveBehind(editorView.state, editorView.dispatch);
        announce(result.data);
      });
    },
    [announce, editorViewRef, spaceId, t],
  );
};
