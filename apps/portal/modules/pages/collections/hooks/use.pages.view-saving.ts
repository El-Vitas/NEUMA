'use client';

import { diffPageViewConfigurations, readPageViewConfiguration, toPageViewEnvelope } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { isActionSuccess } from '@/shared/lib/action-result';
import { applyPageViewOperationsAction } from '../server/actions/pages.collections.actions';
import type { PageChangedView } from '../types/pages.query.types';
import type { PageSchema, PageSchemaViewDraft } from '../types/pages.schema.types';
import type { PagesViewSaving } from '../types/pages.view-saving.types';

/**
 * Applied immediately, optimistically, and reverted if the server refuses. The screen edits a whole configuration,
 * but only what changed is sent, as operations on the view: a change to one key never carries the old value of
 * another, so two people editing the same view do not undo each other (ADR 025).
 */
export const usePagesViewSaving = (schema: PageSchema, activeViewName: string, spaceId: string): PagesViewSaving => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const [views, setViews] = useState<readonly PageSchemaViewDraft[]>(schema.views);
  const [lastRead, setLastRead] = useState<readonly PageSchemaViewDraft[]>(schema.views);
  const [isSaving, startSaving] = useTransition();

  // Views can change elsewhere (the settings dialog); without resyncing, a save would overwrite that change.
  // Skipped while a save is in flight so the optimistic state is not clobbered.
  if (lastRead !== schema.views && !isSaving) {
    setLastRead(schema.views);
    setViews(schema.views);
  }

  const takeSaved = (saved: PageChangedView): void =>
    setViews((current) =>
      current.map((view) =>
        view.id === saved.id ? { ...view, configuration: saved.configuration, version: saved.version } : view,
      ),
    );

  const apply = (rewrite: (current: readonly PageSchemaViewDraft[]) => readonly PageSchemaViewDraft[]): void => {
    const before = views;
    const next = rewrite(before);
    const changed = next.find((view) => view.name === activeViewName);
    const stored = schema.views.find((view) => view.name === activeViewName);
    const original = before.find((view) => view.name === activeViewName);
    if (changed === undefined || stored === undefined || original === undefined) return;
    setViews(next);
    const operations = diffPageViewConfigurations(
      readPageViewConfiguration(original.configuration),
      readPageViewConfiguration(changed.configuration),
    );
    if (operations.length === 0) return;
    startSaving(async () => {
      const saved = await applyPageViewOperationsAction({
        operations: operations.map((operation) => {
          const { args, command, path } = toPageViewEnvelope(stored.id, operation);
          return { args, command, path: [...path] };
        }),
        pageId: schema.pageId,
        spaceId,
        viewId: stored.id,
      });
      if (!isActionSuccess<PageChangedView>(saved)) {
        setViews(before);
        toast.error(tErrors('generic'));
        return;
      }
      takeSaved(saved.data);
      toast.success(t('saved'));
    });
  };

  return { apply, isSaving, views };
};
