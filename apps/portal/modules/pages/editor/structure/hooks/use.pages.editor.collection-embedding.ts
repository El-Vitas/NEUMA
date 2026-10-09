'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { isActionSuccess, readActionFailureReason } from '@/shared/lib/action-result';
import { readTheViewToShow } from '../../../collections/lib/pages.collections.lib';
import {
  createPageCollectionAction,
  readPageCollectionAction,
} from '../../../collections/server/actions/pages.collections.actions';
import type { PageEditorCollectionChoice } from '../../../collections/types/pages.collections.types';
import type { PageSchema } from '../../../collections/types/pages.schema.types';
import type { PageSummary } from '../../../types/pages.types';
import { createEmptyPageContent } from '../../lib/pages.editor.lib';
import { pageEditorSchema } from '../../lib/pages.editor.schema';
import { createPageCollectionInsertCommand } from '../lib/pages.editor.collection.lib';
import type {
  PageEditorCollectionCreation,
  PageEditorCollectionEmbeddingInput,
  PagesEditorCollectionEmbedding,
} from '../types/pages.editor.collection-embedding.types';

/**
 * Whether a page is a collection is only known by asking it, so the page is picked first and checked after.
 * With several views the user chooses one, and the insert position travels with the question because
 * the dialog takes the cursor away.
 */
export const usePagesEditorCollectionEmbedding = ({
  editorViewRef,
  onInserted,
  spaceId,
}: PageEditorCollectionEmbeddingInput): PagesEditorCollectionEmbedding => {
  const t = useTranslations('pages');
  const tErrors = useTranslations('errors');
  const [choice, setChoice] = useState<null | PageEditorCollectionChoice>(null);
  const [isAsking, startAsking] = useTransition();

  const insert = (pageId: string, viewName: null | string, spot: number): void => {
    const editorView = editorViewRef.current;
    if (editorView === null) return;
    const command = createPageCollectionInsertCommand(pageEditorSchema, { pageId, spaceId, viewName }, spot);
    command(editorView.state, editorView.dispatch);
    editorView.focus();
    onInserted();
  };

  const create = (input: PageEditorCollectionCreation): void => {
    startAsking(async () => {
      const made = await createPageCollectionAction({
        content: createEmptyPageContent(),
        parentId: input.parentId,
        properties: input.shape.properties,
        spaceId,
        title: input.title,
        views: input.shape.views,
      });
      if (!isActionSuccess<PageSummary>(made)) {
        toast.error(tErrors(`reasons.${readActionFailureReason(made)}`));
        return;
      }
      insert(made.data.id, input.shape.views[0]?.name ?? null, input.spot);
    });
  };

  const show = (pageId: string, spot: number): void => {
    startAsking(async () => {
      const asked = await readPageCollectionAction({ pageId, spaceId });
      if (!isActionSuccess<PageSchema | null>(asked)) {
        toast.error(tErrors(`reasons.${readActionFailureReason(asked)}`));
        return;
      }
      if (asked.data === null || asked.data.properties.length === 0) {
        toast.error(t('collection.notACollection'));
        return;
      }
      if (asked.data.views.length > 1) {
        setChoice({ pageId, spot, views: asked.data.views });
        return;
      }
      insert(pageId, readTheViewToShow(asked.data.views), spot);
    });
  };

  return {
    cancel: () => setChoice(null),
    choice,
    choosableViews: choice === null ? null : choice.views,
    create,
    chooseView: (viewName: string) => {
      if (choice === null) return;
      setChoice(null);
      insert(choice.pageId, viewName, choice.spot);
    },
    insert,
    isAsking,
    show,
  };
};
