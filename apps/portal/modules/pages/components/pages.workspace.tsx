'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import { PrimaryButton } from '@/shared/components/forms/primary-button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { EMPTY_PAGE_ATTACHMENTS, EMPTY_PAGE_BACKLINKS } from '../constants/pages.constants';
import { buildPageTree, canEditPage, getPageTreeExpandedIds } from '../lib/pages.lib';
import type { AttachmentSummary } from '../types/pages.attachments.types';
import type { PageBacklinksResult } from '../types/pages.backlinks.types';
import type { PagePersonOption, PageSchema } from '../types/pages.schema.types';
import type { PageSummary } from '../types/pages.types';
import { PagesEditor } from './pages.editor';

interface IProps {
  readonly attachments?: readonly AttachmentSummary[];
  readonly backlinks?: PageBacklinksResult;
  readonly canEditContent: boolean;
  readonly collectionSection?: ReactNode;
  readonly currentUserDisplayName?: string;
  readonly isNewPage?: boolean;
  readonly pages: readonly PageSummary[];
  readonly parentId?: string | null;
  readonly parentSchema?: PageSchema | null;
  readonly personOptions?: readonly PagePersonOption[];
  readonly selectedPageId?: string | null;
  readonly spaceId: string;
}

export const PagesWorkspace = ({
  attachments = EMPTY_PAGE_ATTACHMENTS,
  backlinks = EMPTY_PAGE_BACKLINKS,
  canEditContent,
  collectionSection = null,
  currentUserDisplayName,
  isNewPage = false,
  pages,
  parentId = null,
  parentSchema = null,
  personOptions = [],
  selectedPageId = null,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages');
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;
  const tree = buildPageTree(pages);
  const parentBreadcrumbPages = useMemo(() => {
    const breadcrumbSelectedPageId = isNewPage ? parentId : (selectedPage?.id ?? null);
    const breadcrumbPageIds = getPageTreeExpandedIds(tree, breadcrumbSelectedPageId);
    const parentBreadcrumbPageIds = isNewPage ? breadcrumbPageIds : breadcrumbPageIds.slice(0, -1);

    return parentBreadcrumbPageIds.flatMap((pageId) => {
      const page = pages.find((candidate) => candidate.id === pageId);
      return page === undefined ? [] : [page];
    });
  }, [isNewPage, pages, parentId, selectedPage?.id, tree]);
  const canEditSelectedPage = canEditPage(canEditContent, selectedPage?.lifecycle ?? null);

  if (isNewPage || selectedPage !== null) {
    return (
      <PagesEditor
        attachments={attachments}
        backlinks={backlinks}
        canEdit={isNewPage ? canEditContent : canEditSelectedPage}
        collectionSection={collectionSection}
        currentUserDisplayName={currentUserDisplayName}
        key={`${selectedPage?.id ?? 'new-page'}:${selectedPage?.lifecycle ?? 'new'}`}
        page={selectedPage}
        pageId={selectedPage?.id ?? null}
        pages={pages}
        parentBreadcrumbPages={parentBreadcrumbPages}
        parentId={parentId}
        parentSchema={parentSchema}
        personOptions={personOptions}
        spaceId={spaceId}
      />
    );
  }

  return (
    <section aria-label={t('editor')} className="bg-surface">
      <EmptyState
        action={
          canEditContent ? (
            <PrimaryButton asChild>
              <Link href={ROUTES.PORTAL_SPACE_NEW_PAGE(spaceId)}>{t('createPage')}</Link>
            </PrimaryButton>
          ) : undefined
        }
        message={pages.length === 0 ? t('empty') : t('selectPage')}
      />
    </section>
  );
};
