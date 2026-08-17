'use client';

import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import type { PagesAutosaveDisplayState } from '../types/pages.autosave.types';
import type { PageSummary } from '../types/pages.types';
import { PagesBreadcrumb } from './pages.breadcrumb';
import { PagesEditorSaveState } from './pages.editor.save-state';
import { PagesHeaderEmojiField } from './pages.header.emoji.field';

interface IProps {
  readonly canEdit: boolean;
  readonly displayState: PagesAutosaveDisplayState;
  readonly onTitleChange: (title: string) => void;
  readonly parentPages: readonly PageSummary[];
  readonly savedAt: Date | null;
  readonly spaceId: string;
  readonly title: string;
  readonly titleInputRef: RefObject<HTMLInputElement | null>;
}

export const PagesHeader = ({
  canEdit,
  displayState,
  onTitleChange,
  parentPages,
  savedAt,
  spaceId,
  title,
  titleInputRef,
}: IProps) => {
  const t = useTranslations('pages');

  return (
    <header className="max-w-336 space-y-4">
      <PagesBreadcrumb parentPages={parentPages} spaceId={spaceId} title={title} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="sr-only">{title.length > 0 ? title : t('untitled')}</h1>
          <PagesHeaderEmojiField
            ariaLabel={t('titleField')}
            className="w-full border-0 border-transparent border-b bg-transparent px-0 py-2 font-bold font-reading text-4xl text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-0 disabled:cursor-not-allowed disabled:text-foreground sm:text-5xl"
            disabled={!canEdit}
            id="page-title"
            inputRef={titleInputRef}
            onChange={onTitleChange}
            placeholder={t('untitled')}
            value={title}
          />
        </div>
        <PagesEditorSaveState displayState={displayState} savedAt={savedAt} />
      </div>
    </header>
  );
};
