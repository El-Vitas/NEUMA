'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { isActionSuccess } from '@/shared/lib/action-result';
import type { IconMutationResult } from '@/shared/types/icon-mutation.types';

/**
 * Changing a mark, whatever is being marked.
 *
 * A page and a space are marked in different words but in the same three
 * steps: ask, say so if the answer is no, and otherwise close and read again.
 * Written once so the two cannot start disagreeing about what a refusal looks
 * like.
 */
export const useIconMutation = (onChanged: () => void, onClose: () => void): IconMutationResult => {
  const t = useTranslations('pages');
  const [isPending, startTransition] = useTransition();

  const runIconMutation = (mutate: () => Promise<unknown>): void => {
    startTransition(async () => {
      const result = await mutate();
      if (!isActionSuccess(result)) {
        toast.error(t('permissionError'));
        return;
      }
      onChanged();
      onClose();
    });
  };

  return { isPending, runIconMutation };
};
