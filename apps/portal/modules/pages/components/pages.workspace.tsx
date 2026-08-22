'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useMemo } from 'react';
import { StartPageButton } from '@/shared/components/portal/start-page-button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import type { AttachmentSummary } from '../attachments/types/pages.attachments.types';
import type { PagePersonOption, PageSchema } from '../collections/types/pages.schema.types';
import {
  EMPTY_PAGE_ATTACHMENTS,
  EMPTY_PAGE_BACKLINKS,
  EMPTY_PAGE_EMBEDDED_COLLECTIONS,
  EMPTY_PAGE_PERSON_OPTIONS,
} from '../constants/pages.constants';
import { PagesEditor } from '../editor/components/pages.editor';
import { buildPageTree, canEditPage, getPageTreeExpandedIds } from '../lib/pages.lib';
import type { PageBacklinksResult } from '../links/types/pages.backlinks.types';
import { PagesSidePanel } from '../navigation/components/pages.side-panel';
import type { PagesSidePanelBundle } from '../navigation/types/pages.side-panel.types';
import type { PageSummary } from '../types/pages.types';

interface IProps {
  readonly attachments?: readonly AttachmentSummary[];
  readonly backlinks?: PageBacklinksResult;
  readonly canEditContent: boolean;
  readonly canSeePageUsage?: boolean;
  readonly collectionSection?: ReactNode;
  readonly embeddedCollections?: Readonly<Record<string, ReactNode>>;
  readonly currentUserDisplayName?: string;
  readonly isFavorite?: boolean;
  readonly pages: readonly PageSummary[];
  readonly panelBundle?: PagesSidePanelBundle | null;
  readonly parentSchema?: PageSchema | null;
  readonly personOptions?: readonly PagePersonOption[];
  readonly selectedPageId?: string | null;
  readonly spaceId: string;
  readonly spaceName?: string;
}

export const PagesWorkspace = ({
  attachments = EMPTY_PAGE_ATTACHMENTS,
  backlinks = EMPTY_PAGE_BACKLINKS,
  canEditContent,
  canSeePageUsage = false,
  collectionSection = null,
  embeddedCollections = EMPTY_PAGE_EMBEDDED_COLLECTIONS,
  currentUserDisplayName,
  isFavorite,
  pages,
  panelBundle = null,
  parentSchema = null,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  selectedPageId = null,
  spaceId,
  spaceName,
}: IProps) => {
  const t = useTranslations('pages');
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;
  const tree = buildPageTree(pages);
  const parentBreadcrumbPages = useMemo(() => {
    const breadcrumbPageIds = getPageTreeExpandedIds(tree, selectedPage?.id ?? null);
    return breadcrumbPageIds.slice(0, -1).flatMap((pageId) => {
      const page = pages.find((candidate) => candidate.id === pageId);
      return page === undefined ? [] : [page];
    });
  }, [pages, selectedPage?.id, tree]);
  const panelParentBreadcrumbPages = useMemo(() => {
    const breadcrumbPageIds = getPageTreeExpandedIds(tree, panelBundle?.page.id ?? null);
    return breadcrumbPageIds.slice(0, -1).flatMap((pageId) => {
      const page = pages.find((candidate) => candidate.id === pageId);
      return page === undefined ? [] : [page];
    });
  }, [pages, panelBundle?.page.id, tree]);

  if (selectedPage !== null) {
    return (
      <>
        <PagesEditor
          attachments={attachments}
          backlinks={backlinks}
          canEdit={canEditPage(canEditContent, selectedPage.lifecycle)}
          canSeeUsage={canSeePageUsage}
          collectionSection={collectionSection}
          currentUserDisplayName={currentUserDisplayName}
          embeddedCollections={embeddedCollections}
          isFavorite={isFavorite}
          key={`${selectedPage.id}:${selectedPage.lifecycle}`}
          page={selectedPage}
          pages={pages}
          parentBreadcrumbPages={parentBreadcrumbPages}
          parentSchema={parentSchema}
          personOptions={personOptions}
          spaceId={spaceId}
          spaceName={spaceName}
        />
        {panelBundle !== null && (
          <PagesSidePanel
            bundle={panelBundle}
            canEditContent={canEditContent}
            currentUserDisplayName={currentUserDisplayName}
            key={`${panelBundle.page.id}:${panelBundle.page.lifecycle}`}
            pages={pages}
            parentBreadcrumbPages={panelParentBreadcrumbPages}
            spaceId={spaceId}
            spaceName={spaceName}
          />
        )}
      </>
    );
  }

  return (
    <section aria-label={t('editor')} className="bg-surface">
      <EmptyState
        action={canEditContent ? <StartPageButton label={t('createPage')} spaceId={spaceId} /> : undefined}
        message={pages.length === 0 ? t('empty') : t('selectPage')}
      />
    </section>
  );
};
