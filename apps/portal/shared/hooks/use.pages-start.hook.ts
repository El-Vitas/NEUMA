'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { describeANewCollection } from '@/modules/pages/collections/lib/pages.collections.lib';
import { createPageCollectionAction } from '@/modules/pages/collections/server/actions/pages.collections.actions';
import { createEmptyPageContent } from '@/modules/pages/editor/lib/pages.editor.lib';
import type { PagesStartResult } from '@/modules/pages/navigation/types/pages.start.types';
import { createPageAction } from '@/modules/pages/server/actions/pages.actions';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import { callAction, isActionSuccess, readActionFailureReason } from '@/shared/lib/action-result';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

/** Creates the page empty and opens it; the title is written in the page, not asked for in a form. */
export const usePagesStart = (): PagesStartResult => {
  const router = useRouter();
  const t = useTranslations('pages');
  const tErrors = useTranslations('errors');
  const [isStarting, startTransition] = useTransition();

  const openOrComplain = (started: unknown, spaceId: string): void => {
    if (!isActionSuccess<PageSummary>(started)) {
      toast.error(tErrors(`reasons.${readActionFailureReason(started)}`));
      return;
    }
    router.push(ROUTES.PORTAL_SPACE_PAGE(spaceId, started.data.id));
  };

  const startPage = (spaceId: string, parentId: string | null = null): void => {
    startTransition(async () => {
      const started = await callAction(() =>
        createPageAction({
          content: createEmptyPageContent(),
          parentId: parentId ?? undefined,
          spaceId,
          title: '',
        }),
      );
      openOrComplain(started, spaceId);
    });
  };

  const startCollection = (spaceId: string, parentId: string | null = null): void => {
    startTransition(async () => {
      const shape = describeANewCollection({
        firstProperty: t('collection.firstProperty'),
        firstView: t('collection.firstView'),
        titleProperty: t('collection.titleProperty'),
      });
      const started = await callAction(() =>
        createPageCollectionAction({
          content: createEmptyPageContent(),
          parentId: parentId ?? undefined,
          properties: shape.properties,
          spaceId,
          title: t('collection.newTitle'),
          views: shape.views,
        }),
      );
      openOrComplain(started, spaceId);
    });
  };

  return { isStarting, startCollection, startPage };
};
