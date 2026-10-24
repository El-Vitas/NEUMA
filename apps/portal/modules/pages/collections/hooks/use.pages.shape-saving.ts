'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { toSavableView } from '../lib/pages.schema-editing.lib';
import { describeSchemaRejection, isSchemaRejected } from '../lib/pages.schema-rejection.lib';
import { updatePageCollectionAction } from '../server/actions/pages.collections.actions';
import type {
  PageSchema,
  PageSchemaProperty,
  PageSchemaSaveOutcome,
  PageSchemaViewDraft,
} from '../types/pages.schema.types';
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
      views: readonly PageSchemaViewDraft[],
      onSaved?: (saved: PageSchema) => void,
    ) => {
      startSaving(async () => {
        const saved = await callAction(() =>
          updatePageCollectionAction({
            pageId: schema.pageId,
            properties,
            spaceId,
            views: views.map(toSavableView),
          }),
        );
        if (!isActionSuccess<PageSchemaSaveOutcome>(saved)) {
          toast.error(tErrors('generic'));
          return;
        }
        if (isSchemaRejected(saved.data)) {
          toast.error(describeSchemaRejection(saved.data.rejection));
          return;
        }
        onSaved?.(saved.data);
        toast.success(t('saved'));
      });
    },
  };
};
