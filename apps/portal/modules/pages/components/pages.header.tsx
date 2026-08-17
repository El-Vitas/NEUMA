'use client';

import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import { cn } from '@/lib/utils';
import { PageFavoriteToggle } from '@/shared/components/portal/page-favorite-toggle';
import { RecentPageRecorder } from '@/shared/components/portal/recents-recorder';
import { EMPTY_PAGE_INFO } from '../constants/pages.constants';
import { getPageAppearanceWidthStyleClass } from '../lib/pages.appearance.lib';
import { createEmptyPageContent } from '../lib/pages.editor.lib';
import type { PagesAppearanceResult } from '../types/pages.appearance.types';
import type { PagesAutosaveDisplayState } from '../types/pages.autosave.types';
import type { PageInfoMetadata } from '../types/pages.info.types';
import type { PageContent, PageSummary } from '../types/pages.types';
import { PagesAppearanceMenu } from './pages.appearance.menu';
import { PagesBreadcrumb } from './pages.breadcrumb';
import { PagesEditorSaveState } from './pages.editor.save-state';
import { PagesHeaderEmojiField } from './pages.header.emoji.field';
import { PagesInfoPanel } from './pages.info.panel';

interface IProps {
  readonly appearance: PagesAppearanceResult;
  readonly canEdit: boolean;
  readonly content?: PageContent;
  readonly displayState: PagesAutosaveDisplayState;
  readonly info?: PageInfoMetadata;
  readonly isFavorite?: boolean;
  readonly onTitleChange: (title: string) => void;
  readonly pageId?: null | string;
  readonly parentPages: readonly PageSummary[];
  readonly savedAt: Date | null;
  readonly spaceId: string;
  readonly spaceName?: string;
  readonly title: string;
  readonly titleInputRef: RefObject<HTMLInputElement | null>;
}

export const PagesHeader = ({
  appearance,
  canEdit,
  content,
  displayState,
  info = EMPTY_PAGE_INFO,
  isFavorite,
  onTitleChange,
  pageId = null,
  parentPages,
  savedAt,
  spaceId,
  spaceName,
  title,
  titleInputRef,
}: IProps) => {
  const t = useTranslations('pages');

  return (
    <header className={cn('space-y-4', getPageAppearanceWidthStyleClass(appearance.preferences.fullWidth))}>
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
        <div className="flex shrink-0 items-center gap-1">
          <PagesEditorSaveState displayState={displayState} savedAt={savedAt} />
          {pageId !== null && <PagesInfoPanel content={content ?? createEmptyPageContent()} info={info} />}
          <PagesAppearanceMenu
            onFullWidthChange={appearance.setFullWidth}
            onTextSizeChange={appearance.setTextSize}
            onTypographyChange={appearance.setTypography}
            preferences={appearance.preferences}
          />
          {pageId !== null && isFavorite !== undefined && (
            <PageFavoriteToggle isFavorite={isFavorite} pageId={pageId} spaceId={spaceId} title={title} />
          )}
        </div>
      </div>
      {pageId !== null && spaceName !== undefined && (
        <RecentPageRecorder pageId={pageId} spaceId={spaceId} spaceName={spaceName} title={title} />
      )}
    </header>
  );
};
