'use client';

import { Info } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/shared/components/ui/popover';
import { APP_TIME_ZONE } from '@/shared/constants/date.constants';
import { countPageContentCharacters, countPageContentWords } from '../lib/pages.info.lib';
import type { PageInfoMetadata } from '../types/pages.info.types';
import type { PageContent } from '../types/pages.types';
import { PagesMetadataRow } from './pages.metadata.row';

interface IProps {
  readonly content: PageContent;
  readonly info: PageInfoMetadata;
}

/**
 * What a page says about itself, kept out of the way of what it says to
 * everyone else: who wrote it, who touched it last, and how much is there.
 *
 * It lives behind a button rather than a fixed strip, since none of this is
 * something the writing itself needed to make room for.
 */
export const PagesInfoPanel = ({ content, info }: IProps) => {
  const t = useTranslations('pages.info');
  const format = useFormatter();
  const wordCount = countPageContentWords(content);
  const characterCount = countPageContentCharacters(content);

  const formatMoment = (moment: Date): string =>
    format.dateTime(moment, { dateStyle: 'medium', timeStyle: 'short', timeZone: APP_TIME_ZONE });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={t('title')}
          className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
        >
          <Info aria-hidden="true" className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="space-y-1">
        <PopoverHeader>
          <PopoverTitle>{t('title')}</PopoverTitle>
        </PopoverHeader>
        {info.createdByName !== null && (
          <PagesMetadataRow label={t('createdBy')} labelId="page-info-created-by">
            {info.createdByName}
          </PagesMetadataRow>
        )}
        {info.createdAt !== null && (
          <PagesMetadataRow label={t('createdAt')} labelId="page-info-created-at">
            {formatMoment(info.createdAt)}
          </PagesMetadataRow>
        )}
        {info.lastEditedByName !== null && (
          <PagesMetadataRow label={t('lastEditedBy')} labelId="page-info-last-edited-by">
            {info.lastEditedByName}
          </PagesMetadataRow>
        )}
        {info.lastEditedAt !== null && (
          <PagesMetadataRow label={t('lastEditedAt')} labelId="page-info-last-edited-at">
            {formatMoment(info.lastEditedAt)}
          </PagesMetadataRow>
        )}
        <p className="text-muted-foreground text-sm">{t('wordCount', { count: wordCount })}</p>
        <p className="text-muted-foreground text-sm">{t('characterCount', { count: characterCount })}</p>
      </PopoverContent>
    </Popover>
  );
};
