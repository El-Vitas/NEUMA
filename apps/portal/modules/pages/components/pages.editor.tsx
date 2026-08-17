'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ComponentRef, type ReactNode, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { FormActions } from '@/shared/components/forms/form-actions';
import { PrimaryButton } from '@/shared/components/forms/primary-button';
import { BackButton } from '@/shared/components/ui/back-button';
import { hasActionError, isActionSuccess, readActionFailureReason } from '@/shared/lib/action-result';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import {
  EMPTY_PAGE_ATTACHMENTS,
  EMPTY_PAGE_BACKLINKS,
  EMPTY_PAGE_EMBEDDED_COLLECTIONS,
  EMPTY_PAGE_HEADINGS,
  EMPTY_PAGE_PERSON_OPTIONS,
} from '../constants/pages.constants';
import {
  PAGE_OUTLINE_LAYOUT_STYLE_CLASS,
  PAGE_OUTLINE_SIDE_STYLE_CLASS,
} from '../constants/pages.editor.contents.constants';
import { usePagesAutosave } from '../hooks/use.pages.autosave';
import {
  buildPageAssetInsertOptionsFromAttachment,
  mapAttachmentMimeTypeToPageAssetNodeType,
} from '../lib/pages.attachments.lib';
import { createPageAssetInsertCommand } from '../lib/pages.editor.commands';
import { createEmptyPageContent } from '../lib/pages.editor.lib';
import { pageEditorSchema } from '../lib/pages.editor.schema';
import { buildDefaultPropertyValues, getEditableSchemaProperties } from '../lib/pages.properties.lib';
import { createPageAction, updatePageAction } from '../server/actions/pages.actions';
import type { AttachmentSummary } from '../types/pages.attachments.types';
import type { PagesAutosaveDisplayState } from '../types/pages.autosave.types';
import type { PageBacklinksResult } from '../types/pages.backlinks.types';
import type { PageEditorHeading } from '../types/pages.editor.contents.types';
import type { PagePersonOption, PagePropertyValue, PagePropertyValues, PageSchema } from '../types/pages.schema.types';
import type { PageContent, PageSummary } from '../types/pages.types';
import { PagesBacklinks } from './pages.backlinks';
import { PagesHeader } from './pages.header';
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
  readonly page: PageSummary | null;
  readonly pageId: string | null;
  readonly pages: readonly PageSummary[];
  readonly parentId: string | null;
  readonly parentBreadcrumbPages: readonly PageSummary[];
  readonly parentSchema?: PageSchema | null;
  readonly personOptions?: readonly PagePersonOption[];
  readonly spaceId: string;
}

export const PagesEditor = ({
  attachments = EMPTY_PAGE_ATTACHMENTS,
  backlinks = EMPTY_PAGE_BACKLINKS,
  canEdit,
  collectionSection = null,
  embeddedCollections = EMPTY_PAGE_EMBEDDED_COLLECTIONS,
  currentUserDisplayName,
  page,
  pageId,
  pages,
  parentId,
  parentBreadcrumbPages,
  parentSchema = null,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  spaceId,
}: IProps) => {
  const router = useRouter();
  const t = useTranslations('pages');
  const tErrors = useTranslations('errors');
  const [title, setTitle] = useState(page?.title ?? '');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef(title);
  const contentRef = useRef<PageContent>(page?.content ?? createEmptyPageContent());
  const editorHandleRef = useRef<ComponentRef<typeof PagesProseMirrorEditor>>(null);
  const [pageAttachments, setPageAttachments] = useState(attachments);
  const [isPending, startTransition] = useTransition();
  const editableProperties = getEditableSchemaProperties(parentSchema);
  const [propertyValues, setPropertyValues] = useState<PagePropertyValues>(
    page?.propertyValues ?? buildDefaultPropertyValues(editableProperties),
  );
  const propertyValuesRef = useRef(propertyValues);
  const [headings, setHeadings] = useState<readonly PageEditorHeading[]>(EMPTY_PAGE_HEADINGS);

  const updateCurrentPage = async (): Promise<boolean> => {
    const result = await updatePageAction({
      content: contentRef.current,
      pageId: page?.id ?? '',
      propertyValues: editableProperties.length > 0 ? propertyValuesRef.current : undefined,
      spaceId,
      title: titleRef.current.trim(),
    });
    return !hasActionError(result);
  };

  const canAutosave = canEdit && page?.lifecycle === 'ACTIVE';

  const autosave = usePagesAutosave({
    enabled: canAutosave,
    onSave: updateCurrentPage,
  });

  useEffect(() => {
    if (page !== null) return;
    titleInputRef.current?.focus();
  }, [page]);

  const addUploadedAttachment = (attachment: AttachmentSummary): void => {
    setPageAttachments((current) =>
      current.some((currentAttachment) => currentAttachment.id === attachment.id) ? current : [...current, attachment],
    );
    const nodeType = mapAttachmentMimeTypeToPageAssetNodeType(attachment.mimeType);
    const options = buildPageAssetInsertOptionsFromAttachment(attachment);
    const insertCommand = createPageAssetInsertCommand(pageEditorSchema, nodeType, options);
    editorHandleRef.current?.runCommand(insertCommand);
  };

  const createNewPage = (): void => {
    startTransition(async () => {
      const result = await createPageAction({
        content: contentRef.current,
        parentId,
        propertyValues: editableProperties.length > 0 ? propertyValuesRef.current : undefined,
        spaceId,
        title: title.trim(),
      });
      if (!isActionSuccess<PageSummary>(result)) {
        toast.error(tErrors(`reasons.${readActionFailureReason(result)}`));
        return;
      }
      toast.success(t('created'));
      router.replace(ROUTES.PORTAL_SPACE_PAGE(spaceId, result.data.id));
    });
  };

  const handlePropertyValueChange = (key: string, value: PagePropertyValue): void => {
    const nextPropertyValues = { ...propertyValuesRef.current, [key]: value };
    propertyValuesRef.current = nextPropertyValues;
    setPropertyValues(nextPropertyValues);
    if (page !== null) autosave.schedule(titleRef.current.trim().length > 0);
  };

  const autosaveDisplayState: PagesAutosaveDisplayState = canAutosave ? autosave.displayState : 'idle';
  const headerDisplayState: PagesAutosaveDisplayState = isPending ? 'saving' : autosaveDisplayState;

  return (
    <section
      aria-label={t('editor')}
      className="min-w-0 bg-surface py-8 pr-4 pl-14 sm:pr-6 lg:py-12 lg:pr-8 lg:pl-16 xl:pr-10"
    >
      {!canEdit && (
        <p className="mb-4 border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          {page?.lifecycle === 'TRASHED' ? t('trashReadOnly') : t('readOnly')}
        </p>
      )}
      <div className={PAGE_OUTLINE_LAYOUT_STYLE_CLASS}>
        <div className="w-full min-w-0 space-y-8" data-testid="page-editor-workspace">
          <PagesHeader
            canEdit={canEdit}
            displayState={headerDisplayState}
            onTitleChange={(nextTitle) => {
              titleRef.current = nextTitle;
              setTitle(nextTitle);
              autosave.schedule(nextTitle.trim().length > 0);
            }}
            parentPages={parentBreadcrumbPages}
            savedAt={autosave.savedAt}
            spaceId={spaceId}
            title={title}
            titleInputRef={titleInputRef}
          />
          <PagesPropertiesPanel
            attachments={pageAttachments}
            canEdit={canEdit}
            onAttachmentDeleted={(attachmentId) =>
              setPageAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId))
            }
            onAttachmentUploaded={addUploadedAttachment}
            onPropertyValueChange={handlePropertyValueChange}
            page={page}
            pageId={pageId}
            pages={pages}
            parentSchema={parentSchema}
            personOptions={personOptions}
            propertyValues={propertyValues}
            spaceId={spaceId}
          />
          <PagesProseMirrorEditor
            canEdit={canEdit}
            content={page?.content ?? createEmptyPageContent()}
            currentUserDisplayName={currentUserDisplayName}
            embeddedCollections={embeddedCollections}
            onAttachmentUploaded={addUploadedAttachment}
            onContentChange={(content) => {
              contentRef.current = content;
              autosave.schedule(titleRef.current.trim().length > 0);
            }}
            onHeadingsChange={setHeadings}
            pageId={pageId}
            pages={pages}
            personOptions={personOptions}
            ref={editorHandleRef}
            spaceId={spaceId}
          />
          {canEdit && page === null && (
            <FormActions back={<BackButton href={ROUTES.PORTAL_SPACE(spaceId)} />}>
              <PrimaryButton disabled={isPending || title.trim().length === 0} onClick={createNewPage} type="button">
                {isPending ? t('saving') : t('create')}
              </PrimaryButton>
            </FormActions>
          )}
          {pageId !== null && <PagesBacklinks backlinks={backlinks} />}
          {collectionSection}
        </div>
        <aside className={PAGE_OUTLINE_SIDE_STYLE_CLASS}>
          <PagesOutline
            headings={headings}
            onGoToHeading={(position) => editorHandleRef.current?.goToHeading(position)}
            title={t('pageContents')}
          />
        </aside>
      </div>
    </section>
  );
};
