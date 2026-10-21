'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { isActionSuccess, isLockedActionFailure } from '@/shared/lib/action-result';
import {
  createPageTemplateAction,
  deletePageTemplateAction,
  setDefaultPageTemplateAction,
  updatePageTemplateAction,
} from '../server/actions/pages.templates.actions';
import type { PagesTemplatesEditing } from '../types/pages.templates.types';

interface IProps {
  readonly collectionId: string;
  /** Called as soon as a default is chosen, before the server answers, so the choice shows at once. */
  readonly onDefaultChosen: (templateId: null | string) => void;
  readonly spaceId: string;
}

/** Every change asks the server and then draws the list again from what it holds. */
export const usePagesTemplates = ({ collectionId, onDefaultChosen, spaceId }: IProps): PagesTemplatesEditing => {
  const t = useTranslations('pages.templates');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [isPending, startWorking] = useTransition();

  const finish = (outcome: unknown, message: string): void => {
    if (!isActionSuccess(outcome)) {
      toast.error(isLockedActionFailure(outcome) ? tErrors('reasons.locked') : tErrors('generic'));
      return;
    }
    toast.success(message);
    router.refresh();
  };

  return {
    add: (title) =>
      startWorking(async () => finish(await createPageTemplateAction({ collectionId, spaceId, title }), t('added'))),
    changeVariables: (template, variables) =>
      startWorking(async () =>
        finish(
          await updatePageTemplateAction({ collectionId, spaceId, templateId: template.id, variables }),
          t('saved'),
        ),
      ),
    isPending,
    remove: (template) =>
      startWorking(async () =>
        finish(await deletePageTemplateAction({ collectionId, spaceId, templateId: template.id }), t('deleted')),
      ),
    rename: (template, title) =>
      startWorking(async () =>
        finish(await updatePageTemplateAction({ collectionId, spaceId, templateId: template.id, title }), t('saved')),
      ),
    setDefault: (template) =>
      startWorking(async () => {
        onDefaultChosen(template?.id ?? null);
        finish(
          await setDefaultPageTemplateAction({ collectionId, spaceId, templateId: template?.id ?? null }),
          t('saved'),
        );
      }),
  };
};
