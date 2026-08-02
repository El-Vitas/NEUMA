'use client';

import { useRouter } from 'next/navigation';
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
        toast.error('No se pudo guardar la página. Revisa tus permisos e inténtalo de nuevo.');
        return;
      }
      toast.success(page === null ? 'Página creada' : 'Página actualizada');
      router.refresh();
    });
  };

  let saveLabel = 'Guardar cambios';
  if (isPending) saveLabel = 'Guardando...';
  if (!isPending && page === null) saveLabel = 'Crear página';

  return (
    <section aria-label="Editor de página" className="border border-border bg-card p-4 sm:p-6">
      {!canEdit && (
        <p className="mb-4 border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          {page?.lifecycle === 'TRASHED'
            ? 'Esta página está en la papelera. Restáurala para editarla.'
            : 'Solo tienes permiso de lectura en este espacio.'}
        </p>
      )}
      <div className="space-y-4">
        <FormField
          disabled={!canEdit}
          id="page-title"
          label="Título"
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
        <div>
          <label className="mb-2 block text-sm text-status-muted" htmlFor="page-content">
            Contenido estructurado
          </label>
          <PagesProseMirrorEditor
            canEdit={canEdit}
            content={page?.content ?? createEmptyPageContent()}
            onContentChange={(content) => {
              contentRef.current = content;
            }}
          />
          <p className="mt-2 text-muted-foreground text-xs" id="page-content-help">
            El texto se guarda como un bloque estructurado versionado.
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
