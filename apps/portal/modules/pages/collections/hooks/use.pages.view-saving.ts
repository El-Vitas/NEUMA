'use client';

import { readPageViewConfiguration } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { isActionSuccess } from '@/shared/lib/action-result';
import { updatePageViewConfigurationAction } from '../server/actions/pages.collections.actions';
import type { PageSchema, PageSchemaView } from '../types/pages.schema.types';
import type { PagesViewSaving } from '../types/pages.view-saving.types';

/**
 * Applied immediately, optimistically, and reverted if the server refuses. Only the active view is sent,
 * so a change elsewhere in the collection shape is not overwritten. Rows come back with the response.
 */
export const usePagesViewSaving = (schema: PageSchema, activeViewName: string, spaceId: string): PagesViewSaving => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const [views, setViews] = useState<readonly PageSchemaView[]>(schema.views);
  const [lastRead, setLastRead] = useState<readonly PageSchemaView[]>(schema.views);
  const [isSaving, startSaving] = useTransition();

  // Views can change elsewhere (the settings dialog); without resyncing, a save would overwrite that change.
  // Skipped while a save is in flight so the optimistic state is not clobbered.
  if (lastRead !== schema.views && !isSaving) {
    setLastRead(schema.views);
    setViews(schema.views);
  }

  const apply = (rewrite: (current: readonly PageSchemaView[]) => readonly PageSchemaView[]): void => {
    const before = views;
    const next = rewrite(before);
    const changed = next.find((view) => view.name === activeViewName);
    if (changed === undefined) return;
    setViews(next);
    startSaving(async () => {
      const saved = await updatePageViewConfigurationAction({
        configuration: { ...readPageViewConfiguration(changed.configuration) },
        pageId: schema.pageId,
        spaceId,
        viewName: activeViewName,
      });
      if (!isActionSuccess<PageSchema>(saved)) {
        setViews(before);
        toast.error(tErrors('generic'));
        return;
      }
      setViews(saved.data.views);
      toast.success(t('saved'));
    });
  };

  return { apply, isSaving, views };
};
