'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { isActionSuccess } from '@/shared/lib/action-result';
import { toSavableView } from '../lib/pages.schema-editing.lib';
import { updatePageCollectionAction } from '../server/actions/pages.collections.actions';
import type { PageSchema, PageSchemaProperty, PageSchemaView } from '../types/pages.schema.types';
import type { PagesShapeSaving } from '../types/pages.shape-saving.types';

/**
 * For changes that belong to the option values, visible in every view, so the whole collection is sent.
 * Views are sent as given so unsent view changes are not lost. No explicit refresh: the action already
 * invalidates the cache and returns the rebuilt page.
 */
export const usePagesShapeSaving = (schema: PageSchema, spaceId: string): PagesShapeSaving => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const [isSaving, startSaving] = useTransition();

  return {
    isSaving,
    save: (
      properties: readonly PageSchemaProperty[],
      views: readonly PageSchemaView[],
      onSaved?: (saved: PageSchema) => void,
    ) => {
      startSaving(async () => {
        const saved = await updatePageCollectionAction({
          pageId: schema.pageId,
          properties,
          spaceId,
          views: views.map(toSavableView),
        });
        if (!isActionSuccess<PageSchema>(saved)) {
          toast.error(tErrors('generic'));
          return;
        }
        onSaved?.(saved.data);
        toast.success(t('saved'));
      });
    },
  };
};
