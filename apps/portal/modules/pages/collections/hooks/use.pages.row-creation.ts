'use client';

import { isTitlePageProperty } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { isActionSuccess } from '@/shared/lib/action-result';
import { createEmptyPageContent } from '../../editor/lib/pages.editor.lib';
import { createPageAction } from '../../server/actions/pages.actions';
import type { PageSummary } from '../../types/pages.types';
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
  const [isCreating, startCreating] = useTransition();

  return {
    createRowIn: (placedValue: string, title: string, bandValue = '') =>
      startCreating(async () => {
        const created = await createPageAction({
          content: createEmptyPageContent(),
          parentId: collectionPageId,
          propertyValues: {
            // The title is sent separately, not as a property value.
            ...buildRowPropertyValues(properties.filter((property) => !isTitlePageProperty(property.type))),
            ...buildNewRowPropertyValues(placedByKey, placedValue),
            ...(bandedByKey === '' ? {} : buildNewRowPropertyValues(bandedByKey, bandValue)),
          },
          spaceId,
          title: title.trim(),
        });
        if (!isActionSuccess<PageSummary>(created)) {
          toast.error(tErrors('generic'));
          return;
        }
        toast.success(t('rowCreated'));
      }),
    isCreating,
  };
};
