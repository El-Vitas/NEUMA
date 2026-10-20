'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { isActionSuccess, isLockedActionFailure } from '@/shared/lib/action-result';
import type { IconMutationResult } from '@/shared/types/icon-mutation.types';

export const useIconMutation = (onChanged: () => void, onClose: () => void): IconMutationResult => {
  const t = useTranslations('pages');
  const tErrors = useTranslations('errors');
  const [isPending, startTransition] = useTransition();

  const runIconMutation = (mutate: () => Promise<unknown>): void => {
    startTransition(async () => {
      const result = await mutate();
      if (!isActionSuccess(result)) {
        toast.error(isLockedActionFailure(result) ? tErrors('reasons.locked') : t('permissionError'));
        return;
      }
      onChanged();
      onClose();
    });
  };

  return { isPending, runIconMutation };
};
