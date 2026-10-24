'use client';

import { type ReactNode, useMemo } from 'react';
import type { AttachmentSummary } from '../attachments/types/pages.attachments.types';
import type { SyncedBlock } from '../block-sync/types/block-sync.types';
import type { PagePersonOption, PageRelatedRow, PageSchema } from '../collections/types/pages.schema.types';
import {
  EMPTY_PAGE_ATTACHMENTS,
  EMPTY_PAGE_BACKLINKS,
  EMPTY_PAGE_EMBEDDED_COLLECTIONS,
  EMPTY_PAGE_PERSON_OPTIONS,
  EMPTY_PAGE_REFERENCES,
  EMPTY_PAGE_RELATED_ROWS,
  EMPTY_PAGE_SYNCED_SOURCES,
} from '../constants/pages.constants';
import { PagesEditor } from '../editor/components/pages.editor';
import { canEditPage } from '../lib/pages.lib';
import type { PageBacklinksResult } from '../links/types/pages.backlinks.types';
import { PagesSidePanel } from '../navigation/components/pages.side-panel';
import type { PagesSidePanelBundle } from '../navigation/types/pages.side-panel.types';
import { PagesTreePathSeed } from '../tree/components/pages.tree.path-seed';
import { EMPTY_PAGE_TREE_LEVELS } from '../tree/constants/pages.tree.constants';
import { usePagesTreeSuggestions } from '../tree/hooks/use.pages.tree';
import { mergePageReferences } from '../tree/lib/pages.references.lib';
import type { PageBreadcrumbParent, PageTreeEntry, PageTreeLevel } from '../tree/types/pages.tree.types';
import type { PageReference, PageSummary, PageSyncedSource } from '../types/pages.types';

interface IProps {
  /** Who is above the page, topmost first. */
  readonly ancestors: readonly PageBreadcrumbParent[];
  readonly attachments?: readonly AttachmentSummary[];
  readonly backlinks?: PageBacklinksResult;
  /** The page's blocks, read on the server. */
  readonly blockSync?: readonly SyncedBlock[] | null;
  /** The blocks could not be read: the page opens read-only and says why. */
  readonly blockSyncFailed?: boolean;
  readonly canSeePageUsage?: boolean;
  readonly collectionSection?: ReactNode;
  readonly embeddedCollections?: Readonly<Record<string, ReactNode>>;
  readonly currentUserDisplayName?: string;
  readonly currentUserId?: string;
  readonly isFavorite?: boolean;
  /** The page open; the rest of the space is not sent with it (ADR 030). */
  readonly page: PageSummary;
  readonly panelBundle?: PagesSidePanelBundle | null;
  readonly parentSchema?: PageSchema | null;
  readonly personOptions?: readonly PagePersonOption[];
  /** The pages this one draws something from: titles, icons and places. */
  readonly references?: readonly PageReference[];
  readonly relatedRows?: readonly PageRelatedRow[];
  readonly spaceId: string;
  readonly spaceName?: string;
  readonly syncedSources?: readonly PageSyncedSource[];
  /** The windows of the sidebar that show this page, so it opens already in place. */
  readonly treeLevels?: readonly PageTreeLevel[];
  /** The page as the sidebar lists it, for the case where it is in the trash and no list holds it. */
  readonly treeOpenPage?: PageTreeEntry | null;
}

export const PagesWorkspace = ({
  ancestors,
  attachments = EMPTY_PAGE_ATTACHMENTS,
  backlinks = EMPTY_PAGE_BACKLINKS,
  blockSync,
  blockSyncFailed = false,
  canSeePageUsage = false,
  collectionSection = null,
  embeddedCollections = EMPTY_PAGE_EMBEDDED_COLLECTIONS,
  currentUserDisplayName,
  currentUserId,
  isFavorite,
  page,
  panelBundle = null,
  parentSchema = null,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  references = EMPTY_PAGE_REFERENCES,
  relatedRows = EMPTY_PAGE_RELATED_ROWS,
  spaceId,
  spaceName,
  syncedSources = EMPTY_PAGE_SYNCED_SOURCES,
  treeLevels = EMPTY_PAGE_TREE_LEVELS,
  treeOpenPage = null,
}: IProps) => {
  const suggestions = usePagesTreeSuggestions(spaceId);
  const pagesAtHand = useMemo(() => mergePageReferences(references, suggestions), [references, suggestions]);

  return (
    <>
      <PagesTreePathSeed levels={treeLevels} openPage={treeOpenPage} spaceId={spaceId} />
      <PagesEditor
        ancestors={ancestors}
        attachments={attachments}
        backlinks={backlinks}
        blockSync={blockSync}
        canEdit={canEditPage(page) && !blockSyncFailed}
        canSeeUsage={canSeePageUsage}
        collectionSection={collectionSection}
        currentUserDisplayName={currentUserDisplayName}
        currentUserId={currentUserId}
        embeddedCollections={embeddedCollections}
        isBlockSyncUnavailable={blockSyncFailed}
        isFavorite={isFavorite}
        key={`${page.id}:${page.lifecycle}`}
        page={page}
        parentSchema={parentSchema}
        personOptions={personOptions}
        references={pagesAtHand}
        relatedRows={relatedRows}
        spaceId={spaceId}
        spaceName={spaceName}
        syncedSources={syncedSources}
      />
      {panelBundle !== null && (
        <PagesSidePanel
          bundle={panelBundle}
          currentUserDisplayName={currentUserDisplayName}
          currentUserId={currentUserId}
          key={`${panelBundle.page.id}:${panelBundle.page.lifecycle}`}
          spaceId={spaceId}
          spaceName={spaceName}
        />
      )}
    </>
  );
};
