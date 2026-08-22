'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { createEmptyPageContent } from '@/modules/pages/editor/lib/pages.editor.lib';
import type { PagesStartResult } from '@/modules/pages/navigation/types/pages.start.types';
import { createPageAction } from '@/modules/pages/server/actions/pages.actions';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import { isActionSuccess, readActionFailureReason } from '@/shared/lib/action-result';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

/**
 * Starts a page and takes whoever asked for it there.
 *
 * The page is made empty and opened, instead of being asked for in a form and
 * made afterwards: a page is something one writes in, and its name is one of the
 * things written in it. Nothing is required first, so nothing is left unwritten
 * either — the page is called nothing until somebody calls it something.
 */
export const usePagesStart = (): PagesStartResult => {
  const router = useRouter();
  const tErrors = useTranslations('errors');
  const [isStarting, startTransition] = useTransition();

  const startPage = (spaceId: string, parentId: string | null = null): void => {
    startTransition(async () => {
      const started = await createPageAction({
        content: createEmptyPageContent(),
        parentId: parentId ?? undefined,
        spaceId,
        title: '',
      });
      if (!isActionSuccess<PageSummary>(started)) {
        toast.error(tErrors(`reasons.${readActionFailureReason(started)}`));
        return;
      }
      router.push(ROUTES.PORTAL_SPACE_PAGE(spaceId, started.data.id));
    });
  };

  return { isStarting, startPage };
};
