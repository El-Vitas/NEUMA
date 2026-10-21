'use client';

import { isTitlePageProperty } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { isActionSuccess, isLockedActionFailure } from '@/shared/lib/action-result';
import { buildRowPropertyValues } from '../../collections/lib/pages.properties.lib';
import type { PageSchemaProperty } from '../../collections/types/pages.schema.types';
import { createEmptyPageContent } from '../../editor/lib/pages.editor.lib';
import { createPageAction } from '../../server/actions/pages.actions';
import { readNewRowTitle } from '../lib/pages.templates.lib';
import type { PagesTemplateRowCreation, PageTemplateListing } from '../types/pages.templates.types';

interface IProps {
  readonly collectionId: string;
  readonly listing: PageTemplateListing;
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

/** The row starts from a template, with the default value of each column under whatever the template fills. */
export const usePagesTemplateRow = ({
  collectionId,
  listing,
  properties,
  spaceId,
}: IProps): PagesTemplateRowCreation => {
  const t = useTranslations('pages.templates');
  const tPages = useTranslations('pages');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [isCreating, startCreating] = useTransition();

  return {
    createRow: (templateId) =>
      startCreating(async () => {
        const created = await createPageAction({
          content: createEmptyPageContent(),
          defaultValues: buildRowPropertyValues(properties.filter((property) => !isTitlePageProperty(property.type))),
          parentId: collectionId,
          spaceId,
          templateId,
          title: readNewRowTitle(listing, templateId, tPages('untitled')),
        });
        if (!isActionSuccess(created)) {
          toast.error(isLockedActionFailure(created) ? tErrors('reasons.locked') : tErrors('generic'));
          return;
        }
        toast.success(t('rowCreated'));
        router.refresh();
      }),
    isCreating,
  };
};
