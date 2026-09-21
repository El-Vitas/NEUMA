'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  type ComponentRef,
  type ForwardedRef,
  forwardRef,
  type ReactNode,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import { hasActionError } from '@/shared/lib/action-result';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { PagesCover } from '../../appearance/components/pages.cover';
import { PagesHeader } from '../../appearance/components/pages.header';
import { usePagesAppearance } from '../../appearance/hooks/use.pages.appearance';
import { usePagesCover } from '../../appearance/hooks/use.pages.cover';
import { getPageAppearanceLayoutStyleClasses } from '../../appearance/lib/pages.appearance.lib';
import type { PageIcon } from '../../appearance/types/pages.icon.types';
import {
  buildPageAssetInsertOptionsFromAttachment,
  excludePageAssetAttachments,
  mapAttachmentMimeTypeToPageAssetNodeType,
} from '../../attachments/lib/pages.attachments.lib';
import type { AttachmentSummary } from '../../attachments/types/pages.attachments.types';
import { PagesPropertiesPanel } from '../../collections/components/pages.properties.panel';
import { buildDefaultPropertyValues, getEditableSchemaProperties } from '../../collections/lib/pages.properties.lib';
import type {
  PagePersonOption,
  PagePropertyValue,
  PagePropertyValues,
  PageSchema,
} from '../../collections/types/pages.schema.types';
import { PagesLockToggle } from '../../components/pages.lock.toggle';
import { PagesProseMirrorEditor } from '../../components/pages.prose-mirror.editor';
import {
  EMPTY_PAGE_ATTACHMENTS,
  EMPTY_PAGE_BACKLINKS,
  EMPTY_PAGE_EMBEDDED_COLLECTIONS,
  EMPTY_PAGE_HEADINGS,
  EMPTY_PAGE_PERSON_OPTIONS,
} from '../../constants/pages.constants';
import { usePagesAutosave } from '../../hooks/use.pages.autosave';
import { resolveReadOnlyMessage } from '../../lib/pages.lib';
import { PagesBacklinks } from '../../links/components/pages.backlinks';
import type { PageBacklinksResult } from '../../links/types/pages.backlinks.types';
import { PagesOutline } from '../../navigation/components/pages.outline';
import { usePagesReadingPosition } from '../../navigation/hooks/use.pages.reading-position';
import { updatePageAction } from '../../server/actions/pages.actions';
import { PagesTrashButton } from '../../trash/components/pages.trash.button';
import { PagesUsagePanel } from '../../trust/components/pages.usage.panel';
import { PagesVerificationPanel } from '../../trust/components/pages.verification.panel';
import { toPageInfoMetadata } from '../../trust/lib/pages.info.lib';
import { resolvePageVerificationStatus } from '../../trust/lib/pages.verification.lib';
import type { PagesAutosaveDisplayState } from '../../types/pages.autosave.types';
import type { PageAuthor, PageContent, PageSummary } from '../../types/pages.types';
import { createPageAssetInsertCommand } from '../lib/pages.editor.commands';
import { pageEditorSchema } from '../lib/pages.editor.schema';
import type { PageEditorHeading } from '../structure/types/pages.editor.contents.types';
import type { PagesEditorHandle } from '../types/pages.editor.handle.types';

interface IProps {
  readonly attachments?: readonly AttachmentSummary[];
  readonly backlinks?: PageBacklinksResult;
  readonly canEdit: boolean;
  readonly canSeeUsage?: boolean;
  readonly collectionSection?: ReactNode;
  readonly embeddedCollections?: Readonly<Record<string, ReactNode>>;
  readonly currentUserDisplayName?: string;
  readonly isFavorite?: boolean;
  /** Where a link to another page of this app is followed, when it should not leave this editor's own place. */
  readonly onNavigateToPage?: (spaceId: string, pageId: string) => void;
  /** Told once a save this editor made has actually reached the server, so whoever else is showing the same page can catch up. */
  readonly onSaved?: () => void;
  readonly page: PageSummary;
  readonly pages: readonly PageSummary[];
  readonly parentBreadcrumbPages: readonly PageSummary[];
  readonly parentSchema?: PageSchema | null;
  readonly personOptions?: readonly PagePersonOption[];
  readonly spaceId: string;
  readonly spaceName?: string;
}

export const PagesEditor = forwardRef(
  (
    {
      attachments = EMPTY_PAGE_ATTACHMENTS,
      backlinks = EMPTY_PAGE_BACKLINKS,
      canEdit,
      canSeeUsage = false,
      collectionSection = null,
      embeddedCollections = EMPTY_PAGE_EMBEDDED_COLLECTIONS,
      currentUserDisplayName,
      isFavorite,
      onNavigateToPage,
      onSaved,
      page,
      pages,
      parentBreadcrumbPages,
      parentSchema = null,
      personOptions = EMPTY_PAGE_PERSON_OPTIONS,
      spaceId,
      spaceName,
    }: IProps,
    handleRef: ForwardedRef<PagesEditorHandle>,
  ) => {
    const router = useRouter();
    const t = useTranslations('pages');
    const [title, setTitle] = useState(page.title);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const titleRef = useRef(title);
    const contentRef = useRef<PageContent>(page.content);
    const editorHandleRef = useRef<ComponentRef<typeof PagesProseMirrorEditor>>(null);
    const [pageAttachments, setPageAttachments] = useState(attachments);
    const [pageIcon, setPageIcon] = useState<PageIcon | null>(page.icon ?? null);
    const [lockedAt, setLockedAt] = useState<Date | null>(page.lockedAt ?? null);
    const [owner, setOwner] = useState<null | PageAuthor>(page.owner ?? null);
    const [verification, setVerification] = useState({
      verificationExpiresAt: page.verificationExpiresAt ?? null,
      verifiedAt: page.verifiedAt ?? null,
      verifiedBy: page.verifiedBy ?? null,
    });
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
      const didSave = !hasActionError(result);
      if (didSave) onSaved?.();
      return didSave;
    };

    /** A locked page reads exactly like one nobody may write in, because that is what it is. */
    const isLocked = lockedAt !== null;
    const canWrite = canEdit && !isLocked;
    const canAutosave = canWrite && page.lifecycle === 'ACTIVE';
    const canTrash = canWrite && page.lifecycle === 'ACTIVE';

    /** Whoever sent the page away stops looking at a page that is no longer there. */
    const handlePageTrashed = (): void => router.push(ROUTES.PORTAL_SPACE(spaceId));

    const autosave = usePagesAutosave({
      enabled: canAutosave,
      onSave: updateCurrentPage,
    });

    useImperativeHandle(
      handleRef,
      () => ({
        flushPendingChanges: async () => {
          await autosave.saveNow();
        },
      }),
      [autosave],
    );

    /** A page nobody has named yet opens on its name, which is where one starts writing it. */
    useEffect(() => {
      if (page.title.length > 0) return;
      titleInputRef.current?.focus();
    }, [page.title]);

    const addUploadedAttachment = (attachment: AttachmentSummary): void => {
      setPageAttachments((current) =>
        current.some((currentAttachment) => currentAttachment.id === attachment.id)
          ? current
          : [...current, attachment],
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
              trashControl={
                canTrash ? (
                  <PagesTrashButton onTrashed={handlePageTrashed} pageId={page.id} spaceId={spaceId} title={title} />
                ) : null
              }
              usageControl={canSeeUsage ? <PagesUsagePanel pageId={page.id} /> : null}
              verificationControl={
                <PagesVerificationPanel
                  canEdit={canEdit}
                  onOwnerChange={setOwner}
                  onVerificationChange={setVerification}
                  owner={owner}
                  pageId={page.id}
                  personOptions={personOptions}
                  spaceId={spaceId}
                  status={resolvePageVerificationStatus(
                    verification.verifiedAt,
                    verification.verificationExpiresAt,
                    new Date(),
                  )}
                  verificationExpiresAt={verification.verificationExpiresAt}
                  verifiedAt={verification.verifiedAt}
                  verifiedBy={verification.verifiedBy}
                />
              }
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
            {/*
              Una página que lleva una colección es, sobre todo, esa colección: va
              antes que el cuerpo, no al final, para que abrirla sea verla. Lo que
              se escriba encima queda debajo, como las notas que acompañan a una
              tabla y no como el motivo de la página.
            */}
            {collectionSection}
            <PagesProseMirrorEditor
              canEdit={canWrite}
              content={page.content}
              currentUserDisplayName={currentUserDisplayName}
              embeddedCollections={embeddedCollections}
              onAttachmentUploaded={addUploadedAttachment}
              onContentChange={handleContentChange}
              onHeadingsChange={setHeadings}
              onNavigateToPage={onNavigateToPage}
              pageId={page.id}
              pages={pages}
              personOptions={personOptions}
              ref={editorHandleRef}
              spaceId={spaceId}
              textSize={appearance.preferences.textSize}
              typography={appearance.preferences.typography}
            />
            <PagesBacklinks backlinks={backlinks} />
          </div>
          <aside className={layoutStyleClasses.outlineSide}>
            <PagesOutline headings={headings} onGoToHeading={handleGoToHeading} title={t('pageContents')} />
          </aside>
        </div>
      </section>
    );
  },
);

PagesEditor.displayName = 'PagesEditor';
