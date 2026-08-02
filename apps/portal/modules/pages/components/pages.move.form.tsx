'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { PrimaryButton } from '@/shared/components/forms/primary-button';
import { hasActionError } from '@/shared/lib/action-result';
import { movePageAction } from '../server/actions/pages.actions';
import type { PageSummary } from '../types/pages.types';

interface IProps {
  readonly page: PageSummary;
  readonly pages: readonly PageSummary[];
  readonly spaceId: string;
}

export const PagesMoveForm = ({ page, pages, spaceId }: IProps) => {
  const [parentId, setParentId] = useState(page.parentId ?? 'root');
  const [isPending, startTransition] = useTransition();
  const possibleParents = pages.filter((candidate) => candidate.id !== page.id && candidate.lifecycle === 'ACTIVE');

  const movePage = () => {
    startTransition(async () => {
      const result = await movePageAction({
        pageId: page.id,
        parentId: parentId === 'root' ? null : parentId,
        spaceId,
      });
      if (hasActionError(result)) {
        toast.error('No se pudo mover la página. Comprueba que el destino sea válido.');
        return;
      }
      toast.success('Página movida');
    });
  };

  return (
    <div className="flex flex-col gap-2 border-border border-t pt-4 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <label className="mb-2 block text-sm text-status-muted" htmlFor="page-parent">
          Ubicación
        </label>
        <select
          className="min-h-11 w-full border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          id="page-parent"
          onChange={(event) => setParentId(event.target.value)}
          value={parentId}
        >
          <option value="root">Raíz del espacio</option>
          {possibleParents.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.title}
            </option>
          ))}
        </select>
      </div>
      <PrimaryButton
        disabled={isPending || parentId === (page.parentId ?? 'root')}
        onClick={movePage}
        type="button"
        variant="secondary"
      >
        {isPending ? 'Moviendo...' : 'Mover página'}
      </PrimaryButton>
    </div>
  );
};
