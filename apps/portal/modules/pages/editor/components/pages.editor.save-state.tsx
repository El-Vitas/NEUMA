'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { APP_TIME_ZONE } from '@/shared/constants/date.constants';
import type { PagesAutosaveDisplayState } from '../../types/pages.autosave.types';

interface IProps {
  readonly displayState: PagesAutosaveDisplayState;
  readonly savedAt: Date | null;
}

export const PagesEditorSaveState = ({ displayState, savedAt }: IProps) => {
  const t = useTranslations('pages');
  const format = useFormatter();

  if (displayState === 'idle') return null;

  const formattedSavedAt =
    savedAt === null ? null : format.dateTime(savedAt, { hour: '2-digit', minute: '2-digit', timeZone: APP_TIME_ZONE });
  const messagesByDisplayState: Record<Exclude<PagesAutosaveDisplayState, 'idle'>, string> = {
    backOnline: t('save.backOnline'),
    failed: t('save.failed'),
    offline: t('save.offline'),
    pending: t('save.pending'),
    saved: formattedSavedAt === null ? t('save.saved') : t('save.savedAt', { time: formattedSavedAt }),
    saving: t('save.saving'),
  };

  return (
    <p
      aria-live="polite"
      className={
        displayState === 'failed' ? 'shrink-0 text-destructive text-xs' : 'shrink-0 text-muted-foreground text-xs'
      }
      role="status"
    >
      {messagesByDisplayState[displayState]}
    </p>
  );
};
