import type { PageCollectionReference, Result } from '@neuma/shared';
import { canEditContent, canManageWorkspace, extractPageCollectionReferences, USER_ROLE } from '@neuma/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { redirect } from '@/i18n/navigation';
import { getFavoritePages } from '@/modules/favorites/server/queries/favorites.queries';
import { getPageAttachments } from '@/modules/pages/attachments/server/queries/pages.attachments.queries';
import { PagesCollectionEmbed } from '@/modules/pages/collections/components/pages.collection.embed';
import { PagesCollectionSection } from '@/modules/pages/collections/components/pages.collection.section';
import { PAGE_COLLECTION_VIEW_SEARCH_PARAM } from '@/modules/pages/collections/constants/pages.collections.constants';
import { resolveActiveCollectionView } from '@/modules/pages/collections/lib/pages.collection.view-selection.lib';
import { readEmbeddedCollectionKey } from '@/modules/pages/collections/lib/pages.collections.lib';
import {
  getEditableSchemaProperties,
  schemaNeedsPersonOptions,
} from '@/modules/pages/collections/lib/pages.properties.lib';
import { getPageSchema, getPageView } from '@/modules/pages/collections/server/queries/pages.schema.queries';
import type { PagePersonOption, PageSchema } from '@/modules/pages/collections/types/pages.schema.types';
import { PagesWorkspace } from '@/modules/pages/components/pages.workspace';
import { EMPTY_PAGE_BACKLINKS } from '@/modules/pages/constants/pages.constants';
import { buildPageDocumentTitle, canEditPage } from '@/modules/pages/lib/pages.lib';
import { getPageBacklinks } from '@/modules/pages/links/server/queries/pages.backlinks.queries';
import type { PagesSidePanelBundle } from '@/modules/pages/navigation/types/pages.side-panel.types';
import { getPageSpaceId, getPages, getPagesHolding } from '@/modules/pages/server/queries/pages.queries';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import { getSpaceMembers, getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';
import type { FavoritePage } from '@/shared/types/favorites.types';
import type { RouteSearchParams, RouteSearchParamValue } from '@/shared/types/route-search-params.types';

interface IProps {
  readonly params: Promise<{ pageId: string; spaceId: string }>;
  readonly searchParams?: Promise<RouteSearchParams>;
}

/** Ids end up in backend URLs, so anything that is not a UUID is rejected first. */
const areRecordIds = (...candidates: readonly string[]): boolean =>
  candidates.every((candidate) => z.uuid().safeParse(candidate).success);

/** A repeated parameter keeps only the first value. */
const resolveRequestedViewName = (rawViewParam: RouteSearchParamValue): null | string => {
  const candidate = Array.isArray(rawViewParam) ? rawViewParam[0] : rawViewParam;
  return candidate === undefined || candidate === '' ? null : candidate;
};

const resolvePanelPageId = (
  rawPanelParam: RouteSearchParamValue,
  pages: readonly PageSummary[],
  pageId: string,
): string | null => {
  const candidate = Array.isArray(rawPanelParam) ? rawPanelParam[0] : rawPanelParam;
  if (candidate === undefined || candidate === pageId) return null;
  if (!z.uuid().safeParse(candidate).success) return null;
  return pages.some((page) => page.id === candidate) ? candidate : null;
};

/** Links written before a page moved to another space still point at the old one; a miss is left to the caller. */
const followThePageToItsSpace = async (pageId: string, spaceId: string): Promise<void> => {
  const locationResult = await getPageSpaceId(pageId);
  if (locationResult.isFail()) return;
  const currentSpaceId = locationResult.getValue();
  if (currentSpaceId === spaceId) return;
  redirect({ href: ROUTES.PORTAL_SPACE_PAGE(currentSpaceId, pageId), locale: await getLocale() });
};

/** The cached list can predate a page just created outside the portal (by an agent), so it is re-read on a miss. */
const readPagesHolding = async (spaceId: string, pageId: string): Promise<readonly PageSummary[] | null> => {
  const listedResult = await getPages(spaceId);
  const listed = listedResult.isOk() ? listedResult.getValue() : null;
  if (listed === null || listed.some((page) => page.id === pageId)) return listed;
  const rereadResult = await getPagesHolding(spaceId, pageId);
  return rereadResult.isOk() ? rereadResult.getValue() : listed;
};

export const generateMetadata = async ({ params }: IProps): Promise<Metadata> => {
  const { pageId, spaceId } = await params;
  if (!areRecordIds(pageId, spaceId)) return {};
  const [pages, t] = await Promise.all([readPagesHolding(spaceId, pageId), getTranslations('pages')]);
  const page = pages?.find((candidate) => candidate.id === pageId);
  if (page === undefined) return {};
  return { title: buildPageDocumentTitle(page.title, t('untitled')) };
};

/** A reference the reader cannot access renders nothing rather than a broken frame. */
const renderEmbeddedCollection = async (reference: PageCollectionReference, title: string): Promise<ReactNode> => {
  const schemaResult = await getPageSchema(reference.spaceId, reference.pageId);
  if (schemaResult.isFail()) return null;
  const schema = schemaResult.getValue();
  const view = schema.views.find((candidate) => candidate.name === reference.viewName) ?? schema.views[0];
  if (view === undefined) return null;
  const readingResult = await getPageView(reference.spaceId, reference.pageId, view.name);
  const reading = readingResult.isOk() ? readingResult.getValue() : null;

  return (
    <PagesCollectionEmbed
      outcome={reading === null ? null : reading.outcome}
      properties={getEditableSchemaProperties(schema)}
      schema={schema}
      spaceId={reference.spaceId}
      title={title}
      view={view}
    />
  );
};

const resolveIsFavorite = (favoritesResult: Result<readonly FavoritePage[], Error>, pageId: string): boolean => {
  const favorites = favoritesResult.isOk() ? favoritesResult.getValue() : [];
  return favorites.some((favorite) => favorite.pageId === pageId);
};

const resolveParentSchema = async (spaceId: string, parentId: string | null): Promise<PageSchema | null> => {
  if (parentId === null) return null;
  const parentSchemaResult = await getPageSchema(spaceId, parentId);
  return parentSchemaResult.isOk() ? parentSchemaResult.getValue() : null;
};

/** Members are needed for person properties of the parent or own schema, or to assign an owner. */
const resolvePersonOptionsIfNeeded = async (
  spaceId: string,
  schemas: readonly (PageSchema | null)[],
  canAssignOwner: boolean,
): Promise<readonly PagePersonOption[]> => {
  if (!schemas.some((schema) => schemaNeedsPersonOptions(schema)) && !canAssignOwner) return [];
  const personOptionsResult = await getSpaceMembers(spaceId);
  return personOptionsResult.isOk() ? personOptionsResult.getValue() : [];
};

/** Reads only the active view: reading every view of a collection costs one round trip each. */
const buildCollectionSection = async (
  ownSchema: PageSchema | null,
  spaceId: string,
  pageId: string,
  requestedViewName: null | string,
  canEdit: boolean,
  personOptions: readonly PagePersonOption[],
): Promise<ReactNode> => {
  if (ownSchema === null || ownSchema.properties.length === 0) return null;
  const activeView = resolveActiveCollectionView(ownSchema.views, requestedViewName);
  if (activeView === null) return null;
  const readingResult = await getPageView(spaceId, pageId, activeView.name);
  return (
    <PagesCollectionSection
      activeView={activeView}
      canEdit={canEdit}
      personOptions={personOptions}
      properties={getEditableSchemaProperties(ownSchema)}
      reading={readingResult.isOk() ? readingResult.getValue() : null}
      schema={ownSchema}
      spaceId={spaceId}
      views={ownSchema.views}
    />
  );
};

const buildEmbeddedCollections = async (
  page: PageSummary,
  pages: readonly PageSummary[],
): Promise<Readonly<Record<string, ReactNode>>> => {
  const entries = await Promise.all(
    extractPageCollectionReferences(page.content).map(async (reference) => {
      const title = pages.find((candidate) => candidate.id === reference.pageId)?.title ?? reference.pageId;
      return [
        readEmbeddedCollectionKey(reference.pageId, reference.viewName),
        await renderEmbeddedCollection(reference, title),
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
};

const buildPageEditorBundle = async (
  spaceId: string,
  targetPage: PageSummary,
  pages: readonly PageSummary[],
  canEditRole: boolean,
  favoritesResult: Result<readonly FavoritePage[], Error>,
  requestedViewName: null | string,
): Promise<PagesSidePanelBundle> => {
  const [attachmentsResult, backlinksResult, ownSchemaResult, parentSchema] = await Promise.all([
    getPageAttachments(targetPage.id),
    getPageBacklinks(targetPage.id),
    getPageSchema(spaceId, targetPage.id),
    resolveParentSchema(spaceId, targetPage.parentId),
  ]);
  const ownSchema = ownSchemaResult.isOk() ? ownSchemaResult.getValue() : null;
  const personOptions = await resolvePersonOptionsIfNeeded(
    spaceId,
    [ownSchema, parentSchema],
    canEditPage(canEditRole, targetPage.lifecycle),
  );
  const [collectionSection, embeddedCollections] = await Promise.all([
    buildCollectionSection(
      ownSchema,
      spaceId,
      targetPage.id,
      requestedViewName,
      canEditPage(canEditRole, targetPage.lifecycle),
      personOptions,
    ),
    buildEmbeddedCollections(targetPage, pages),
  ]);

  return {
    attachments: attachmentsResult.isOk() ? attachmentsResult.getValue() : [],
    backlinks: backlinksResult.isOk() ? backlinksResult.getValue() : EMPTY_PAGE_BACKLINKS,
    collectionSection,
    embeddedCollections,
    isFavorite: resolveIsFavorite(favoritesResult, targetPage.id),
    page: targetPage,
    parentSchema,
    personOptions,
  };
};

/** Depends on the session and the space, so it resolves fully before responding. */
export const instant = false;

export default async function Page({ params, searchParams }: IProps) {
  const { pageId, spaceId } = await params;
  if (!areRecordIds(pageId, spaceId)) notFound();

  const [spacesResult, user, pages, favoritesResult, resolvedSearchParams] = await Promise.all([
    getSpaces(),
    getCurrentUser(),
    readPagesHolding(spaceId, pageId),
    getFavoritePages(),
    searchParams ?? Promise.resolve<RouteSearchParams>({}),
  ]);
  const space = spacesResult.isOk() ? spacesResult.getValue().find((candidate) => candidate.id === spaceId) : undefined;
  const selectedPage = pages?.find((page) => page.id === pageId);
  if (selectedPage === undefined) await followThePageToItsSpace(pageId, spaceId);
  if (space === undefined || pages === null || selectedPage === undefined) notFound();

  const canEditRole = canEditContent(user?.role ?? USER_ROLE.CLIENT);
  const canSeePageUsage = canManageWorkspace(user?.role ?? USER_ROLE.CLIENT);
  const panelPageId = resolvePanelPageId(resolvedSearchParams?.panel, pages, pageId);
  const panelPage = panelPageId === null ? undefined : pages.find((page) => page.id === panelPageId);

  const requestedViewName = resolveRequestedViewName(resolvedSearchParams?.[PAGE_COLLECTION_VIEW_SEARCH_PARAM]);
  const [mainBundle, panelBundle] = await Promise.all([
    buildPageEditorBundle(spaceId, selectedPage, pages, canEditRole, favoritesResult, requestedViewName),
    panelPage === undefined
      ? Promise.resolve(null)
      : buildPageEditorBundle(spaceId, panelPage, pages, canEditRole, favoritesResult, null),
  ]);

  return (
    <main className="min-h-full">
      <PagesWorkspace
        attachments={mainBundle.attachments}
        backlinks={mainBundle.backlinks}
        canEditContent={canEditRole}
        canSeePageUsage={canSeePageUsage}
        collectionSection={mainBundle.collectionSection}
        currentUserDisplayName={user?.name}
        embeddedCollections={mainBundle.embeddedCollections}
        isFavorite={mainBundle.isFavorite}
        pages={pages}
        panelBundle={panelBundle}
        parentSchema={mainBundle.parentSchema}
        personOptions={mainBundle.personOptions}
        selectedPageId={selectedPage.id}
        spaceId={spaceId}
        spaceName={space.name}
      />
    </main>
  );
}
