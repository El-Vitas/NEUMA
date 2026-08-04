'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PrimaryButton } from '@/shared/components/forms/primary-button';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { buildPageTree, canEditPage } from '../lib/pages.lib';
import type { AttachmentSummary } from '../types/pages.attachments.types';
import type { PageSummary } from '../types/pages.types';
import { PagesEditor } from './pages.editor';
import { PagesTree } from './pages.tree';

interface IProps {
  readonly attachments?: readonly AttachmentSummary[];
  readonly canEditContent: boolean;
  readonly currentUserDisplayName?: string;
  readonly isNewPage?: boolean;
  readonly pages: readonly PageSummary[];
  readonly selectedPageId?: string | null;
  readonly spaceId: string;
}

export const PagesWorkspace = ({
  attachments = [],
  canEditContent,
  currentUserDisplayName,
  isNewPage = false,
  pages,
  selectedPageId = null,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages');
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;
  const tree = buildPageTree(pages);
  const canEditSelectedPage = canEditPage(canEditContent, selectedPage?.lifecycle ?? null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
      <aside aria-label={t('spaceNavigation')} className="border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-foreground">{t('title')}</h2>
          {canEditContent && (
            <PrimaryButton aria-label={t('createPage')} asChild className="min-h-11 min-w-11 px-2">
              <Link href={ROUTES.PORTAL_SPACE_NEW_PAGE(spaceId)}>
                <Plus aria-hidden="true" className="size-4" />
              </Link>
            </PrimaryButton>
          )}
        </div>
        <PagesTree canEdit={canEditContent} selectedPageId={selectedPage?.id ?? null} spaceId={spaceId} tree={tree} />
      </aside>
      {isNewPage || selectedPage !== null ? (
        <PagesEditor
          attachments={attachments}
          canEdit={isNewPage ? canEditContent : canEditSelectedPage}
          currentUserDisplayName={currentUserDisplayName}
          key={`${selectedPage?.id ?? 'new-page'}:${selectedPage?.lifecycle ?? 'new'}`}
          page={selectedPage}
          pageId={selectedPage?.id ?? null}
          pages={pages}
          spaceId={spaceId}
        />
      ) : (
        <section
          aria-label={t('editor')}
          className="flex min-h-64 flex-col items-center justify-center gap-4 border border-border bg-card p-6 text-center"
        >
          <p className="text-muted-foreground">{pages.length === 0 ? t('empty') : t('selectPage')}</p>
          {canEditContent && (
            <PrimaryButton asChild>
              <Link href={ROUTES.PORTAL_SPACE_NEW_PAGE(spaceId)}>{t('createPage')}</Link>
            </PrimaryButton>
          )}
        </section>
      )}
    </div>
  );
};
