'use client';

import { useFormatter, useNow, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { APP_TIME_ZONE } from '@/shared/constants/date.constants';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import type { PageVersionSummary } from '../types/pages.history.types';

interface IProps {
  readonly isSelected: boolean;
  readonly onSelect: (version: number) => void;
  readonly summary: PageVersionSummary;
}

export const PagesHistoryItem = ({ isSelected, onSelect, summary }: IProps) => {
  const t = useTranslations('pages.versionHistory');
  const format = useFormatter();
  const now = useNow();

  return (
    <li>
      <button
        aria-current={isSelected ? 'true' : undefined}
        className={cn(
          'flex min-h-11 w-full flex-col items-start gap-0.5 border border-transparent px-3 py-2 text-left hover:bg-muted',
          FOCUS_RING_CLASS,
          isSelected && 'border-border bg-muted',
        )}
        onClick={() => onSelect(summary.version)}
        type="button"
      >
        <span className="w-full truncate font-medium text-sm">{summary.author?.name ?? t('unknownAuthor')}</span>
        <time
          className="text-muted-foreground text-xs"
          dateTime={summary.createdAt.toISOString()}
          title={format.dateTime(summary.createdAt, {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: APP_TIME_ZONE,
          })}
        >
          {format.relativeTime(summary.createdAt, now)}
        </time>
      </button>
    </li>
  );
};
