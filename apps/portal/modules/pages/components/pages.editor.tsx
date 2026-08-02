'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { PrimaryButton } from '@/shared/components/forms/primary-button';
import { FormField } from '@/shared/components/ui/form-field';
import { hasActionError } from '@/shared/lib/action-result';
import { createEmptyPageContent } from '../lib/pages.editor.lib';
import { createPageAction, updatePageAction } from '../server/actions/pages.actions';
import type { PageContent, PageSummary } from '../types/pages.types';
import { PagesMoveForm } from './pages.move.form';
import { PagesProseMirrorEditor } from './pages.prose-mirror.editor';

interface IProps {
  readonly canEdit: boolean;
  readonly page: PageSummary | null;
  readonly pages: readonly PageSummary[];
  readonly spaceId: string;
}

export const PagesEditor = ({ canEdit, page, pages, spaceId }: IProps) => {
  const router = useRouter();
  const t = useTranslations('pages');
  const [title, setTitle] = useState(page?.title ?? '');
  const contentRef = useRef<PageContent>(page?.content ?? createEmptyPageContent());
  const [isPending, startTransition] = useTransition();

  const savePage = () => {
    startTransition(async () => {
      const result =
        page === null
          ? await createPageAction({ content: contentRef.current, parentId: null, spaceId, title: title.trim() })
          : await updatePageAction({ content: contentRef.current, pageId: page.id, spaceId, title: title.trim() });
      if (hasActionError(result)) {
        toast.error(t('saveError'));
        return;
      }
      toast.success(page === null ? t('created') : t('updated'));
      router.refresh();
    });
  };

  let saveLabel = t('saveChanges');
  if (isPending) saveLabel = t('saving');
  if (!isPending && page === null) saveLabel = t('create');

  return (
    <section aria-label={t('editor')} className="border border-border bg-card p-4 sm:p-6">
      {!canEdit && (
        <p className="mb-4 border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          {page?.lifecycle === 'TRASHED' ? t('trashReadOnly') : t('readOnly')}
        </p>
      )}
      <div className="space-y-4">
        <FormField
          disabled={!canEdit}
          id="page-title"
          label={t('titleField')}
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
        <div>
          <label className="mb-2 block text-sm text-status-muted" htmlFor="page-content">
            {t('content')}
          </label>
          <PagesProseMirrorEditor
            canEdit={canEdit}
            content={page?.content ?? createEmptyPageContent()}
            onContentChange={(content) => {
              contentRef.current = content;
            }}
          />
          <p className="mt-2 text-muted-foreground text-xs" id="page-content-help">
            {t('contentHelp')}
          </p>
        </div>
        {canEdit && (
          <PrimaryButton disabled={isPending || title.trim().length === 0} onClick={savePage} type="button">
            {saveLabel}
          </PrimaryButton>
        )}
        {page !== null && canEdit && <PagesMoveForm page={page} pages={pages} spaceId={spaceId} />}
      </div>
    </section>
  );
};
