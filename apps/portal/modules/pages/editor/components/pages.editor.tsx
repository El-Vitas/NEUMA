'use client';

import { resolvePageVerificationStatus } from '@neuma/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  type ComponentRef,
  type ForwardedRef,
  forwardRef,
  type ReactNode,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
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
import { createReplaceContentCommand } from '../../block-sync/lib/block-sync.remote.lib';
import type { SyncedBlock } from '../../block-sync/types/block-sync.types';
import { PagesPropertiesPanel } from '../../collections/components/pages.properties.panel';
import { buildDefaultPropertyValues, getEditableSchemaProperties } from '../../collections/lib/pages.properties.lib';
import type {
  PagePersonOption,
  PagePropertyValue,
  PagePropertyValues,
  PageRelatedRow,
  PageSchema,
} from '../../collections/types/pages.schema.types';
import { PagesProseMirrorEditor } from '../../components/pages.prose-mirror.editor';
import {
  EMPTY_PAGE_ATTACHMENTS,
  EMPTY_PAGE_BACKLINKS,
  EMPTY_PAGE_EMBEDDED_COLLECTIONS,
  EMPTY_PAGE_HEADINGS,
  EMPTY_PAGE_PERSON_OPTIONS,
  EMPTY_PAGE_RELATED_ROWS,
  EMPTY_PAGE_SYNCED_SOURCES,
} from '../../constants/pages.constants';
import { PagesDiscussionsProvider } from '../../discussions/components/pages.discussions.provider';
import { DISCUSSION_QUERY_PARAMETER } from '../../discussions/constants/pages.discussions.constants';
import { usePageDiscussions } from '../../discussions/hooks/use.pages.discussions';
import { usePagesAutosave } from '../../hooks/use.pages.autosave';
import { resolveReadOnlyMessage } from '../../lib/pages.lib';
import { PagesBacklinks } from '../../links/components/pages.backlinks';
import type { PageBacklinksResult } from '../../links/types/pages.backlinks.types';
import { LocalCacheRejectedChanges } from '../../local-cache/components/local-cache.rejected-changes';
import { PagesOutline } from '../../navigation/components/pages.outline';
import { usePagesReadingPosition } from '../../navigation/hooks/use.pages.reading-position';
import { PagesSharingControls } from '../../sharing/components/pages.sharing.controls';
import { listRestrictedBlockIds, updateRestrictedBlockIds } from '../../sharing/lib/pages.sharing.lib';
import type { SharingChange } from '../../sharing/types/pages.sharing.types';
import { PagesTrashButton } from '../../trash/components/pages.trash.button';
import type { PageBreadcrumbParent } from '../../tree/types/pages.tree.types';
import { PagesUsagePanel } from '../../trust/components/pages.usage.panel';
import { PagesVerificationPanel } from '../../trust/components/pages.verification.panel';
import { toPageInfoMetadata } from '../../trust/lib/pages.info.lib';
import type { PagesAutosaveDisplayState } from '../../types/pages.autosave.types';
import type { PageAuthor, PageContent, PageReference, PageSummary, PageSyncedSource } from '../../types/pages.types';
import { createPageEditorOpenDiscussionsCommand } from '../blocks/lib/pages.editor.block-comment.lib';
import { usePagesEditorBlockBinding } from '../hooks/use.pages.editor.block-binding';
import { usePagesEditorSaves } from '../hooks/use.pages.editor.saves';
import { usePagesEditorTitle } from '../hooks/use.pages.editor.title';
import { createPageAssetInsertCommand } from '../lib/pages.editor.commands';
import { pageEditorSchema } from '../lib/pages.editor.schema';
import type { PageEditorHeading } from '../structure/types/pages.editor.contents.types';
import type { PagesEditorHandle } from '../types/pages.editor.handle.types';

interface IProps {
  readonly attachments?: readonly AttachmentSummary[];
  readonly backlinks?: PageBacklinksResult;
  /** The page's blocks as the server read them; null when they could not be read. */
  readonly blockSync?: readonly SyncedBlock[] | null;
  readonly canEdit: boolean;
  readonly canSeeUsage?: boolean;
  readonly collectionSection?: ReactNode;
  readonly embeddedCollections?: Readonly<Record<string, ReactNode>>;
  readonly currentUserDisplayName?: string;
  readonly currentUserId?: string;
  /** The page's blocks could not be read, so the page is read-only and says so. */
  readonly isBlockSyncUnavailable?: boolean;
  readonly isFavorite?: boolean;
  /** Who is above the page, topmost first, for the breadcrumb. */
  readonly ancestors: readonly PageBreadcrumbParent[];
  readonly onNavigateToPage?: (spaceId: string, pageId: string) => void;
  /** Called once a save by this editor has reached the server, so other views of the page can refresh. */
  readonly onSaved?: () => void;
  readonly page: PageSummary;
  readonly parentSchema?: PageSchema | null;
  readonly personOptions?: readonly PagePersonOption[];
  /** The pages this one draws something from: titles, icons and places, never their content. */
  readonly references: readonly PageReference[];
  /** The rows the relations of this page point to. */
  readonly relatedRows?: readonly PageRelatedRow[];
  readonly spaceId: string;
  readonly spaceName?: string;
  /** The content of the pages this one borrows blocks from. */
  readonly syncedSources?: readonly PageSyncedSource[];
}

export const PagesEditor = forwardRef(
  (
    {
      ancestors,
      attachments = EMPTY_PAGE_ATTACHMENTS,
      backlinks = EMPTY_PAGE_BACKLINKS,
      blockSync,
      canEdit,
      canSeeUsage = false,
      collectionSection = null,
      embeddedCollections = EMPTY_PAGE_EMBEDDED_COLLECTIONS,
      currentUserDisplayName,
      currentUserId,
      isBlockSyncUnavailable,
      isFavorite,
      onNavigateToPage,
      onSaved,
      page,
      parentSchema = null,
      personOptions = EMPTY_PAGE_PERSON_OPTIONS,
      references,
      relatedRows = EMPTY_PAGE_RELATED_ROWS,
      spaceId,
      spaceName,
      syncedSources = EMPTY_PAGE_SYNCED_SOURCES,
    }: IProps,
    handleRef: ForwardedRef<PagesEditorHandle>,
  ) => {
    const router = useRouter();
    const t = useTranslations('pages');
    const { setTitle, title, titleRef } = usePagesEditorTitle(page.title);
    const titleInputRef = useRef<HTMLInputElement>(null);
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
    const saves = usePagesEditorSaves({
      hasEditableProperties: editableProperties.length > 0,
      pageId: page.id,
      readPropertyValues: () => propertyValuesRef.current,
      readTitle: () => titleRef.current,
      spaceId,
      storedPropertyValues: page.propertyValues,
    });
    const [headings, setHeadings] = useState<readonly PageEditorHeading[]>(EMPTY_PAGE_HEADINGS);
    const [restrictedBlockIds, setRestrictedBlockIds] = useState(() => listRestrictedBlockIds(blockSync, page.id));

    const handleBlockSharingChanged = (change: SharingChange): void =>
      setRestrictedBlockIds((current) => updateRestrictedBlockIds(current, change));
    const appearance = usePagesAppearance(page.id);
    const cover = usePagesCover(page.cover ?? null, page.id, spaceId);
    const pageRef = useRef<HTMLElement>(null);
    usePagesReadingPosition(page.id, pageRef);

    const updateCurrentPage = async (): Promise<boolean> => {
      const didSave = await saves.saveWhatIsPending();
      if (didSave) onSaved?.();
      return didSave;
    };

    const isLocked = lockedAt !== null;
    const isWritable = canEdit && !isLocked;
    const canAutosave = isWritable && page.lifecycle === 'ACTIVE';

    const handlePageTrashed = (): void => router.push(ROUTES.PORTAL_SPACE(spaceId));

    const autosave = usePagesAutosave({
      enabled: canAutosave,
      onSave: updateCurrentPage,
    });

    const discussions = usePageDiscussions(page.id);
    const discussionsContext = useMemo(
      () => ({ api: discussions, currentUserId: currentUserId ?? null, personOptions }),
      [currentUserId, discussions, personOptions],
    );
    const searchParams = useSearchParams();
    const wantedDiscussionId = searchParams.get(DISCUSSION_QUERY_PARAMETER);

    /** A link from a notification names the discussion: once it is read, its block opens on it. */
    useEffect(() => {
      if (wantedDiscussionId === null || discussions.status !== 'ready') return;
      const wanted = discussions.discussions.find((discussion) => discussion.id === wantedDiscussionId);
      if (wanted !== undefined) {
        editorHandleRef.current?.runCommand(createPageEditorOpenDiscussionsCommand(wanted.blockId, wanted.id));
      }
      const withoutDiscussion = new URLSearchParams(searchParams.toString());
      withoutDiscussion.delete(DISCUSSION_QUERY_PARAMETER);
      const query = withoutDiscussion.toString();
      const search = query === '' ? '' : `?${query}`;
      router.replace(`${globalThis.location.pathname}${search}${globalThis.location.hash}`);
    }, [discussions.discussions, discussions.status, router, searchParams, wantedDiscussionId]);

    const blockBinding = usePagesEditorBlockBinding({
      fallbackSaveState: canAutosave ? autosave.displayState : 'idle',
      initialBlocks: blockSync,
      onAccessChanged: () => router.refresh(),
      onDiscussionChanged: () => void discussions.refresh(),
      isEnabled: isWritable,
      localUserId: currentUserId,
      pageId: page.id,
      personOptions,
      readContent: () => contentRef.current,
      replaceContent: (content) => {
        editorHandleRef.current?.runCommand(createReplaceContentCommand(content));
      },
      spaceId,
    });
    const { canWrite } = blockBinding;
    const canTrash = canWrite && page.lifecycle === 'ACTIVE';

    useImperativeHandle(
      handleRef,
      () => ({
        flushPendingChanges: async () => {
          await blockBinding.flush();
          await autosave.saveNow();
        },
      }),
      [autosave, blockBinding],
    );

    /** An untitled page opens with the title focused. */
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
      saves.markPropertyChanged(key, value);
      setPropertyValues(nextPropertyValues);
      autosave.schedule();
    };

    const handleTitleChange = (nextTitle: string): void => {
      titleRef.current = nextTitle;
      saves.markTitleChanged();
      setTitle(nextTitle);
      autosave.schedule();
    };

    const handleAttachmentDeleted = (attachmentId: string): void =>
      setPageAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));

    const handleContentChange = (content: PageContent): void => {
      contentRef.current = content;
      blockBinding.keepContentLive(content);
    };

    const handleGoToHeading = (position: number): void => editorHandleRef.current?.goToHeading(position);

    const handleTitleLeft = (): void => editorHandleRef.current?.goToWriting();

    const autosaveDisplayState: PagesAutosaveDisplayState = blockBinding.saveState;
    const visiblePageAttachments = excludePageAssetAttachments(pageAttachments, pageIcon, cover.cover);
    const readOnlyMessage = resolveReadOnlyMessage(page.lifecycle, isLocked, t, isBlockSyncUnavailable);
    const layoutStyleClasses = getPageAppearanceLayoutStyleClasses();
    const workspaceClassName = cn('w-full min-w-0 space-y-8', layoutStyleClasses.width);
    const sectionClassName = cn('min-w-0 bg-surface', layoutStyleClasses.sectionPadding);

    const renderReadOnlyBanner = (): ReactNode =>
      canWrite ? null : (
        <p className="mb-4 border border-warning/30 bg-warning/10 p-3 text-sm text-warning">{readOnlyMessage}</p>
      );

    return (
      <PagesDiscussionsProvider value={discussionsContext}>
        <section aria-label={t('editor')} className={sectionClassName} ref={pageRef}>
          {renderReadOnlyBanner()}
          <LocalCacheRejectedChanges pageId={page.id} userId={currentUserId} />
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
                    <PagesSharingControls
                      canEdit={canEdit}
                      hasOwnPermissions={page.hasOwnPermissions === true}
                      isLocked={isLocked}
                      onLockChange={setLockedAt}
                      pageId={page.id}
                      spaceId={spaceId}
                      title={title}
                    />
                  ) : null
                }
                onIconChange={setPageIcon}
                onTitleChange={handleTitleChange}
                onTitleLeft={handleTitleLeft}
                pageId={page.id}
                parentPages={ancestors}
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
                relatedRows={relatedRows}
                spaceId={spaceId}
              />
              {/* Rendered before the body: a page with a collection is mostly that collection. */}
              {collectionSection}
              <PagesProseMirrorEditor
                blockCollaboration={blockBinding.collaboration}
                canEdit={canWrite}
                content={page.content}
                currentUserDisplayName={currentUserDisplayName}
                embeddedCollections={embeddedCollections}
                onAttachmentUploaded={addUploadedAttachment}
                onBlockSharingChanged={handleBlockSharingChanged}
                onContentChange={handleContentChange}
                onHeadingsChange={setHeadings}
                onNavigateToPage={onNavigateToPage}
                onSelectionChange={blockBinding.reportSelection}
                pageId={page.id}
                pages={references}
                personOptions={personOptions}
                ref={editorHandleRef}
                restrictedBlockIds={restrictedBlockIds}
                spaceId={spaceId}
                syncedSources={syncedSources}
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
      </PagesDiscussionsProvider>
    );
  },
);

PagesEditor.displayName = 'PagesEditor';
