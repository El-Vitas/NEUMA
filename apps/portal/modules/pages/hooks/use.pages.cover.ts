'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { hasActionError, isActionSuccess, readActionFailureReason } from '@/shared/lib/action-result';
import { MAX_ATTACHMENT_SIZE } from '../constants/pages.attachments.constants';
import { formatAttachmentSize } from '../lib/pages.attachments.lib';
import {
  removePageCoverAction,
  repositionPageCoverAction,
  uploadPageCoverImageAction,
} from '../server/actions/pages.cover.actions';
import type { PageCoverValue, PagesCoverController } from '../types/pages.cover.types';
import type { PageSummary } from '../types/pages.types';

/**
 * The cover of a page and everything one can ask of it.
 *
 * Repositioning is a state one enters and leaves on purpose, never something a
 * stray drag over the picture starts: the cover is a picture until somebody says
 * they want to move it, and only then does it take hold of the pointer.
 */
export const usePagesCover = (
  initialCover: PageCoverValue | null,
  pageId: string,
  spaceId: string,
): PagesCoverController => {
  const t = useTranslations('pages.cover');
  const tPanel = useTranslations('pages.attachmentsPanel');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const [cover, setCover] = useState<PageCoverValue | null>(initialCover);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [isPending, startTransition] = useTransition();

  const applyResult = (result: unknown, failureMessage: string): void => {
    if (isActionSuccess<PageSummary>(result)) {
      setCover(result.data.cover ?? null);
      return;
    }
    toast.error(hasActionError(result) ? failureMessage : tErrors(`reasons.${readActionFailureReason(result)}`));
  };

  const runCoverMutation = (mutate: () => Promise<unknown>, failureMessage: string): void => {
    startTransition(async () => applyResult(await mutate(), failureMessage));
  };

  /** A picture too heavy to send is refused here, where it can be said out loud, and not by the throw it would cause. */
  const upload = (file: File): void => {
    setIsRepositioning(false);
    if (file.size > MAX_ATTACHMENT_SIZE) {
      toast.error(tPanel('fileTooLarge', { limit: formatAttachmentSize(MAX_ATTACHMENT_SIZE, locale) }));
      return;
    }
    runCoverMutation(
      () => uploadPageCoverImageAction({ file, pageId, previousAssetId: cover?.assetId, spaceId }),
      t('uploadError'),
    );
  };

  const remove = (): void => {
    if (cover === null) return;
    setIsRepositioning(false);
    runCoverMutation(
      () => removePageCoverAction({ pageId, previousAssetId: cover.assetId, spaceId }),
      t('removeError'),
    );
  };

  const saveReposition = (position: number): void => {
    setIsRepositioning(false);
    if (cover === null || position === cover.position) return;
    runCoverMutation(
      () => repositionPageCoverAction({ assetId: cover.assetId, pageId, position, spaceId }),
      t('repositionError'),
    );
  };

  return {
    cancelReposition: () => setIsRepositioning(false),
    cover,
    isPending,
    isRepositioning,
    remove,
    saveReposition,
    startReposition: () => setIsRepositioning(true),
    upload,
  };
};
