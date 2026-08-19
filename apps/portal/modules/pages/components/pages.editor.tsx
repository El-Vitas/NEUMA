'use client';

import { useTranslations } from 'next-intl';
import { type ComponentRef, type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { hasActionError } from '@/shared/lib/action-result';
import {
  EMPTY_PAGE_ATTACHMENTS,
  EMPTY_PAGE_BACKLINKS,
  EMPTY_PAGE_EMBEDDED_COLLECTIONS,
  EMPTY_PAGE_HEADINGS,
  EMPTY_PAGE_PERSON_OPTIONS,
} from '../constants/pages.constants';
import { usePagesAppearance } from '../hooks/use.pages.appearance';
import { usePagesAutosave } from '../hooks/use.pages.autosave';
import { usePagesCover } from '../hooks/use.pages.cover';
import { usePagesReadingPosition } from '../hooks/use.pages.reading-position';
import { getPageAppearanceLayoutStyleClasses } from '../lib/pages.appearance.lib';
import {
  buildPageAssetInsertOptionsFromAttachment,
  excludePageAssetAttachments,
  mapAttachmentMimeTypeToPageAssetNodeType,
} from '../lib/pages.attachments.lib';
import { createPageAssetInsertCommand } from '../lib/pages.editor.commands';
import { pageEditorSchema } from '../lib/pages.editor.schema';
import { toPageInfoMetadata } from '../lib/pages.info.lib';
import { resolveReadOnlyMessage } from '../lib/pages.lib';
import { buildDefaultPropertyValues, getEditableSchemaProperties } from '../lib/pages.properties.lib';
import { updatePageAction } from '../server/actions/pages.actions';
import type { AttachmentSummary } from '../types/pages.attachments.types';
import type { PagesAutosaveDisplayState } from '../types/pages.autosave.types';
import type { PageBacklinksResult } from '../types/pages.backlinks.types';
import type { PageEditorHeading } from '../types/pages.editor.contents.types';
import type { PageIcon } from '../types/pages.icon.types';
import type { PagePersonOption, PagePropertyValue, PagePropertyValues, PageSchema } from '../types/pages.schema.types';
import type { PageContent, PageSummary } from '../types/pages.types';
import { PagesBacklinks } from './pages.backlinks';
import { PagesCover } from './pages.cover';
import { PagesHeader } from './pages.header';
import { PagesLockToggle } from './pages.lock.toggle';
import { PagesOutline } from './pages.outline';
import { PagesPropertiesPanel } from './pages.properties.panel';
import { PagesProseMirrorEditor } from './pages.prose-mirror.editor';

interface IProps {
  readonly attachments?: readonly AttachmentSummary[];
  readonly backlinks?: PageBacklinksResult;
  readonly canEdit: boolean;
  readonly collectionSection?: ReactNode;
  readonly embeddedCollections?: Readonly<Record<string, ReactNode>>;
  readonly currentUserDisplayName?: string;
  readonly isFavorite?: boolean;
  readonly page: PageSummary;
  readonly pages: readonly PageSummary[];
  readonly parentBreadcrumbPages: readonly PageSummary[];
  readonly parentSchema?: PageSchema | null;
  readonly personOptions?: readonly PagePersonOption[];
  readonly spaceId: string;
  readonly spaceName?: string;
}

export const PagesEditor = ({
  attachments = EMPTY_PAGE_ATTACHMENTS,
  backlinks = EMPTY_PAGE_BACKLINKS,
  canEdit,
  collectionSection = null,
  embeddedCollections = EMPTY_PAGE_EMBEDDED_COLLECTIONS,
  currentUserDisplayName,
  isFavorite,
  page,
  pages,
  parentBreadcrumbPages,
  parentSchema = null,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  spaceId,
  spaceName,
}: IProps) => {
  const t = useTranslations('pages');
  const [title, setTitle] = useState(page.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef(title);
  const contentRef = useRef<PageContent>(page.content);
  const editorHandleRef = useRef<ComponentRef<typeof PagesProseMirrorEditor>>(null);
  const [pageAttachments, setPageAttachments] = useState(attachments);
  const [pageIcon, setPageIcon] = useState<PageIcon | null>(page.icon ?? null);
  const [lockedAt, setLockedAt] = useState<Date | null>(page.lockedAt ?? null);
  const editableProperties = getEditableSchemaProperties(parentSchema);
  const [propertyValues, setPropertyValues] = useState<PagePropertyValues>(
    page.propertyValues ?? buildDefaultPropertyValues(editableProperties),
  );
  const propertyValuesRef = useRef(propertyValues);
  const [headings, setHeadings] = useState<readonly PageEditorHeading[]>(EMPTY_PAGE_HEADINGS);
  const appearance = usePagesAppearance(page.id);
  const cover = usePagesCover(page.cover ?? null, page.id, spaceId);
  const pageRef = useRef<HTMLElement>(null);
  usePagesReadingPosition(page.id, pageRef);

  const updateCurrentPage = async (): Promise<boolean> => {
    const result = await updatePageAction({
      content: contentRef.current,
      pageId: page.id,
      propertyValues: editableProperties.length > 0 ? propertyValuesRef.current : undefined,
      spaceId,
      title: titleRef.current.trim(),
    });
    return !hasActionError(result);
  };

  /** A locked page reads exactly like one nobody may write in, because that is what it is. */
  const isLocked = lockedAt !== null;
  const canWrite = canEdit && !isLocked;
  const canAutosave = canWrite && page.lifecycle === 'ACTIVE';

  const autosave = usePagesAutosave({
    enabled: canAutosave,
    onSave: updateCurrentPage,
  });

  /** A page nobody has named yet opens on its name, which is where one starts writing it. */
  useEffect(() => {
    if (page.title.length > 0) return;
    titleInputRef.current?.focus();
  }, [page.title]);

  const addUploadedAttachment = (attachment: AttachmentSummary): void => {
    setPageAttachments((current) =>
      current.some((currentAttachment) => currentAttachment.id === attachment.id) ? current : [...current, attachment],
    );
    const nodeType = mapAttachmentMimeTypeToPageAssetNodeType(attachment.mimeType);
    const options = buildPageAssetInsertOptionsFromAttachment(attachment);
    const insertCommand = createPageAssetInsertCommand(pageEditorSchema, nodeType, options);
    editorHandleRef.current?.runCommand(insertCommand);
  };

  const handlePropertyValueChange = (key: string, value: PagePropertyValue): void => {
    const nextPropertyValues = { ...propertyValuesRef.current, [key]: value };
    propertyValuesRef.current = nextPropertyValues;
    setPropertyValues(nextPropertyValues);
    autosave.schedule();
  };

  const handleTitleChange = (nextTitle: string): void => {
    titleRef.current = nextTitle;
    setTitle(nextTitle);
    autosave.schedule();
  };

  const handleAttachmentDeleted = (attachmentId: string): void =>
    setPageAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));

  const handleContentChange = (content: PageContent): void => {
    contentRef.current = content;
    autosave.schedule();
  };

  const handleGoToHeading = (position: number): void => editorHandleRef.current?.goToHeading(position);

  const handleTitleLeft = (): void => editorHandleRef.current?.goToWriting();

  const autosaveDisplayState: PagesAutosaveDisplayState = canAutosave ? autosave.displayState : 'idle';
  const visiblePageAttachments = excludePageAssetAttachments(pageAttachments, pageIcon, cover.cover);
  const readOnlyMessage = resolveReadOnlyMessage(page.lifecycle, isLocked, t);
  const layoutStyleClasses = getPageAppearanceLayoutStyleClasses();
  const workspaceClassName = cn('w-full min-w-0 space-y-8', layoutStyleClasses.width);
  const sectionClassName = cn('min-w-0 bg-surface', layoutStyleClasses.sectionPadding);

  const renderReadOnlyBanner = (): ReactNode =>
    canWrite ? null : (
      <p className="mb-4 border border-warning/30 bg-warning/10 p-3 text-sm text-warning">{readOnlyMessage}</p>
    );

  return (
    <section aria-label={t('editor')} className={sectionClassName} ref={pageRef}>
      {renderReadOnlyBanner()}
      <div className={layoutStyleClasses.outlineLayout}>
        <div className={workspaceClassName} data-testid="page-editor-workspace">
          <PagesCover controller={cover} />
          <PagesHeader
            appearance={appearance}
            canEdit={canWrite}
            content={page.content}
            cover={cover}
            displayState={autosaveDisplayState}
            icon={pageIcon}
            info={toPageInfoMetadata(page)}
            isFavorite={isFavorite}
            lockToggle={
              canEdit ? (
                <PagesLockToggle isLocked={isLocked} onLockChange={setLockedAt} pageId={page.id} spaceId={spaceId} />
              ) : null
            }
            onIconChange={setPageIcon}
            onTitleChange={handleTitleChange}
            onTitleLeft={handleTitleLeft}
            pageId={page.id}
            parentPages={parentBreadcrumbPages}
            savedAt={autosave.savedAt}
            spaceId={spaceId}
            spaceName={spaceName}
            title={title}
            titleInputRef={titleInputRef}
          />
          <PagesPropertiesPanel
            attachments={visiblePageAttachments}
            canEdit={canWrite}
            onAttachmentDeleted={handleAttachmentDeleted}
            onAttachmentUploaded={addUploadedAttachment}
            onPropertyValueChange={handlePropertyValueChange}
            page={page}
            pageId={page.id}
            parentSchema={parentSchema}
            personOptions={personOptions}
            propertyValues={propertyValues}
            spaceId={spaceId}
          />
          <PagesProseMirrorEditor
            canEdit={canWrite}
            content={page.content}
            currentUserDisplayName={currentUserDisplayName}
            embeddedCollections={embeddedCollections}
            onAttachmentUploaded={addUploadedAttachment}
            onContentChange={handleContentChange}
            onHeadingsChange={setHeadings}
            pageId={page.id}
            pages={pages}
            personOptions={personOptions}
            ref={editorHandleRef}
            spaceId={spaceId}
            textSize={appearance.preferences.textSize}
            typography={appearance.preferences.typography}
          />
          <PagesBacklinks backlinks={backlinks} />
          {collectionSection}
        </div>
        <aside className={layoutStyleClasses.outlineSide}>
          <PagesOutline headings={headings} onGoToHeading={handleGoToHeading} title={t('pageContents')} />
        </aside>
      </div>
    </section>
  );
};
