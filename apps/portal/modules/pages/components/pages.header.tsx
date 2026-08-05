'use client';

import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import type { PageSummary } from '../types/pages.types';
import { PagesBreadcrumb } from './pages.breadcrumb';

interface IProps {
  readonly canEdit: boolean;
  readonly hasSaved: boolean;
  readonly isSaving: boolean;
  readonly onTitleChange: (title: string) => void;
  readonly parentPages: readonly PageSummary[];
  readonly spaceId: string;
  readonly title: string;
  readonly titleInputRef: RefObject<HTMLInputElement | null>;
}

export const PagesHeader = ({
  canEdit,
  hasSaved,
  isSaving,
  onTitleChange,
  parentPages,
  spaceId,
  title,
  titleInputRef,
}: IProps) => {
  const t = useTranslations('pages');
  let statusLabel: null | string = null;
  if (isSaving) statusLabel = t('saving');
  if (!isSaving && hasSaved) statusLabel = t('updated');

  return (
    <header className="max-w-336 space-y-4">
      <PagesBreadcrumb parentPages={parentPages} spaceId={spaceId} title={title} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="sr-only">{title.length > 0 ? title : t('untitled')}</h1>
          <input
            aria-label={t('titleField')}
            className="w-full border-0 border-transparent border-b bg-transparent px-0 py-2 font-display font-semibold text-4xl text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-0 disabled:cursor-not-allowed disabled:text-foreground sm:text-5xl"
            disabled={!canEdit}
            id="page-title"
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={t('untitled')}
            ref={titleInputRef}
            value={title}
          />
        </div>
        {statusLabel !== null && (
          <p aria-live="polite" className="shrink-0 text-muted-foreground text-xs" role="status">
            {statusLabel}
          </p>
        )}
      </div>
    </header>
  );
};
