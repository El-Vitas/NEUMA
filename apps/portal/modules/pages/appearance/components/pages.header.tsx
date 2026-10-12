'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, type RefObject, useId } from 'react';
import { cn } from '@/lib/utils';
import { PageFavoriteToggle } from '@/shared/components/portal/page-favorite-toggle';
import { RecentPageRecorder } from '@/shared/components/portal/recents-recorder';
import { EMPTY_PAGE_INFO } from '../../constants/pages.constants';
import { PagesEditorSaveState } from '../../editor/components/pages.editor.save-state';
import { createEmptyPageContent } from '../../editor/lib/pages.editor.lib';
import { usePagesDocumentTitle } from '../../hooks/use.pages.document-title';
import { buildPageDocumentTitle } from '../../lib/pages.lib';
import { PagesBreadcrumb } from '../../navigation/components/pages.breadcrumb';
import { PagesInfoPanel } from '../../trust/components/pages.info.panel';
import { PagesUsageRecorder } from '../../trust/components/pages.usage.recorder';
import type { PageInfoMetadata } from '../../trust/types/pages.info.types';
import type { PagesAutosaveDisplayState } from '../../types/pages.autosave.types';
import type { PageContent, PageSummary } from '../../types/pages.types';
import { getPageAppearanceLayoutStyleClasses } from '../lib/pages.appearance.lib';
import type { PagesAppearanceResult } from '../types/pages.appearance.types';
import type { PagesCoverController } from '../types/pages.cover.types';
import type { PageIcon } from '../types/pages.icon.types';
import { PagesAppearanceMenu } from './pages.appearance.menu';
import { PagesCoverField } from './pages.cover.field';
import { PagesHeaderEmojiField } from './pages.header.emoji.field';
import { PagesHeaderLinkButton } from './pages.header.link.button';
import { PagesIconField } from './pages.icon.field';

interface IProps {
  readonly appearance: PagesAppearanceResult;
  readonly canEdit: boolean;
  readonly content?: PageContent;
  readonly cover?: PagesCoverController;
  readonly displayState: PagesAutosaveDisplayState;
  readonly icon?: PageIcon | null;
  readonly info?: PageInfoMetadata;
  readonly isFavorite?: boolean;
  readonly lockToggle?: ReactNode;
  readonly onIconChange?: (icon: PageIcon | null) => void;
  readonly onTitleChange: (title: string) => void;
  readonly onTitleLeft?: () => void;
  readonly pageId?: null | string;
  readonly parentPages: readonly PageSummary[];
  readonly savedAt: Date | null;
  readonly spaceId: string;
  readonly spaceName?: string;
  readonly title: string;
  readonly titleInputRef: RefObject<HTMLInputElement | null>;
  readonly trashControl?: ReactNode;
  readonly usageControl?: ReactNode;
  readonly verificationControl?: ReactNode;
}

export const PagesHeader = ({
  appearance,
  canEdit,
  content,
  cover,
  displayState,
  icon = null,
  info = EMPTY_PAGE_INFO,
  isFavorite,
  lockToggle = null,
  onIconChange = () => undefined,
  onTitleChange,
  onTitleLeft = () => undefined,
  pageId = null,
  parentPages,
  savedAt,
  spaceId,
  spaceName,
  title,
  titleInputRef,
  trashControl = null,
  usageControl = null,
  verificationControl = null,
}: IProps) => {
  const t = useTranslations('pages');
  const layoutStyleClasses = getPageAppearanceLayoutStyleClasses();
  /** The router keeps the previous page mounted, and two fields cannot share a name. */
  const titleFieldId = useId();
  usePagesDocumentTitle(pageId === null ? null : buildPageDocumentTitle(title, t('untitled')));

  return (
    <header className={cn('group space-y-4', layoutStyleClasses.width)}>
      {/*
        Actions share the breadcrumb line: beside the large title they read as part of its name.
        The button row wraps whole rather than squeezing the breadcrumb.
      */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1 basis-48">
          <PagesBreadcrumb parentPages={parentPages} spaceId={spaceId} spaceName={spaceName} title={title} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <PagesEditorSaveState displayState={displayState} savedAt={savedAt} />
          {lockToggle}
          {canEdit && cover !== undefined && <PagesCoverField controller={cover} />}
          {pageId !== null && <PagesInfoPanel content={content ?? createEmptyPageContent()} info={info} />}
          {pageId !== null && usageControl}
          <PagesAppearanceMenu
            onTextSizeChange={appearance.setTextSize}
            onTypographyChange={appearance.setTypography}
            preferences={appearance.preferences}
          />
          {pageId !== null && <PagesHeaderLinkButton pageId={pageId} spaceId={spaceId} />}
          {pageId !== null && isFavorite !== undefined && (
            <PageFavoriteToggle isFavorite={isFavorite} pageId={pageId} title={title} />
          )}
          {trashControl}
        </div>
      </div>
      {pageId !== null && (
        <PagesIconField
          canEdit={canEdit}
          icon={icon}
          onIconChange={onIconChange}
          pageId={pageId}
          spaceId={spaceId}
          title={title}
        />
      )}
      <div>
        <h1 className="sr-only">{title.length > 0 ? title : t('untitled')}</h1>
        <PagesHeaderEmojiField
          ariaLabel={t('titleField')}
          className="w-full border-0 border-transparent border-b bg-transparent px-0 py-2 font-bold font-reading text-4xl text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-0 disabled:cursor-not-allowed disabled:text-foreground sm:text-5xl"
          disabled={!canEdit}
          id={titleFieldId}
          inputRef={titleInputRef}
          onChange={onTitleChange}
          onLeave={onTitleLeft}
          placeholder={t('untitled')}
          value={title}
        />
      </div>
      {pageId !== null && verificationControl !== null && <div>{verificationControl}</div>}
      {pageId !== null && spaceName !== undefined && (
        <RecentPageRecorder pageId={pageId} spaceId={spaceId} spaceName={spaceName} title={title} />
      )}
      {/* Every reader records usage; only whoever runs the workspace can see the tally. */}
      {pageId !== null && <PagesUsageRecorder pageId={pageId} />}
    </header>
  );
};
