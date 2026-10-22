'use client';

import { isTitlePageProperty } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useContext, useTransition } from 'react';
import { toast } from 'sonner';
import { ACTION_LOCKED_REASON } from '@/shared/constants/action-failure.constants';
import { createEmptyPageContent } from '../../editor/lib/pages.editor.lib';
import { PAGE_VIEW_WRITES_CONTEXT } from '../constants/pages.view-writes.context.constants';
import { buildNewRowPropertyValues } from '../lib/pages.board-drag.lib';
import { buildRowPropertyValues } from '../lib/pages.properties.lib';
import type { PagesRowCreation, PagesRowCreationInput } from '../types/pages.row-creation.types';

/**
 * The row starts with the values its placement implies (board column, calendar day) plus the collection's
 * defaults, because the server rejects a row missing required properties. A title is always sent.
 */
export const usePagesRowCreation = ({
  collectionPageId,
  placedByKey,
  properties,
  spaceId,
  bandedByKey = '',
}: PagesRowCreationInput): PagesRowCreation => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const writes = useContext(PAGE_VIEW_WRITES_CONTEXT);
  const [isCreating, startCreating] = useTransition();

  return {
    createRowIn: (placedValue: string, title: string, bandValue = '') =>
      startCreating(async () => {
        const settled = await writes.write(
          {
            content: createEmptyPageContent(),
            // The title is sent separately, not as a property value. Under the default template of the collection.
            defaultValues: buildRowPropertyValues(properties.filter((property) => !isTitlePageProperty(property.type))),
            id: crypto.randomUUID(),
            kind: 'create',
            parentId: collectionPageId,
            propertyValues: {
              ...buildNewRowPropertyValues(properties, placedByKey, placedValue),
              ...(bandedByKey === '' ? {} : buildNewRowPropertyValues(properties, bandedByKey, bandValue)),
            },
            spaceId,
            title: title.trim(),
          },
          title.trim(),
        );
        if (settled.kind === 'rejected') {
          toast.error(settled.message === ACTION_LOCKED_REASON ? tErrors('reasons.locked') : tErrors('generic'));
          return;
        }
        toast.success(t(settled.kind === 'queued' ? 'rowQueued' : 'rowCreated'));
      }),
    isCreating,
  };
};
