'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { PrimaryButton } from '@/shared/components/forms/primary-button';
import { buildPageTree, canEditPage } from '../lib/pages.lib';
import type { PageSummary } from '../types/pages.types';
import { PagesEditor } from './pages.editor';
import { PagesTree } from './pages.tree';

interface IProps {
  readonly canEditContent: boolean;
  readonly pages: readonly PageSummary[];
  readonly spaceId: string;
}

export const PagesWorkspace = ({ canEditContent, pages, spaceId }: IProps) => {
  const [selectedPage, setSelectedPage] = useState<PageSummary | null>(
    pages.find((page) => page.lifecycle === 'ACTIVE') ?? null,
  );
  const tree = buildPageTree(pages);
  const canEditSelectedPage = canEditPage(canEditContent, selectedPage?.lifecycle ?? null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
      <aside aria-label="Navegación del espacio" className="border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-foreground">Páginas</h2>
          {canEditContent && (
            <PrimaryButton
              aria-label="Crear una página"
              className="min-h-11 min-w-11 px-2"
              onClick={() => setSelectedPage(null)}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
            </PrimaryButton>
          )}
        </div>
        <PagesTree
          canEdit={canEditContent}
          onSelect={setSelectedPage}
          selectedPageId={selectedPage?.id ?? null}
          spaceId={spaceId}
          tree={tree}
        />
      </aside>
      <PagesEditor
        canEdit={canEditSelectedPage}
        key={`${selectedPage?.id ?? 'new-page'}:${selectedPage?.lifecycle ?? 'new'}`}
        page={selectedPage}
        pages={pages}
        spaceId={spaceId}
      />
    </div>
  );
};
