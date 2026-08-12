'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ComponentRef, type ReactNode, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { PrimaryButton } from '@/shared/components/forms/primary-button';
import { hasActionError, isActionSuccess } from '@/shared/lib/action-result';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { EMPTY_PAGE_BACKLINKS } from '../constants/pages.constants';
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
import type { PageBacklinksResult } from '../types/pages.backlinks.types';
import type { PagePersonOption, PagePropertyValue, PagePropertyValues, PageSchema } from '../types/pages.schema.types';
import type { PageContent, PageSummary } from '../types/pages.types';
import { PagesBacklinks } from './pages.backlinks';
import { PagesHeader } from './pages.header';
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
  attachments = [],
  backlinks = EMPTY_PAGE_BACKLINKS,
  canEdit,
  collectionSection = null,
  embeddedCollections = {},
  currentUserDisplayName,
  page,
  pageId,
  pages,
  parentId,
  parentBreadcrumbPages,
  parentSchema = null,
  personOptions = [],
  spaceId,
}: IProps) => {
  const router = useRouter();
  const t = useTranslations('pages');
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

  const autosave = usePagesAutosave({
    enabled: canEdit && page?.lifecycle === 'ACTIVE',
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
        toast.error(t('saveError'));
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

  const isSaving = isPending || autosave.isSaving;

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
      <div className="w-full space-y-8" data-testid="page-editor-workspace">
        <PagesHeader
          canEdit={canEdit}
          hasSaved={autosave.hasSaved}
          isSaving={isSaving}
          onTitleChange={(nextTitle) => {
            titleRef.current = nextTitle;
            setTitle(nextTitle);
            autosave.schedule(nextTitle.trim().length > 0);
          }}
          parentPages={parentBreadcrumbPages}
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
          pageId={pageId}
          ref={editorHandleRef}
        />
        {canEdit && page === null && (
          <PrimaryButton disabled={isPending || title.trim().length === 0} onClick={createNewPage} type="button">
            {isPending ? t('saving') : t('create')}
          </PrimaryButton>
        )}
        {autosave.hasError && (
          <p aria-live="polite" className="text-destructive text-sm" role="status">
            {t('saveError')}
          </p>
        )}
        {pageId !== null && <PagesBacklinks backlinks={backlinks} />}
        {collectionSection}
      </div>
    </section>
  );
};
