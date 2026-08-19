import type { PageCollectionReference, Result } from '@company-brain/shared';
import { extractPageCollectionReferences, USER_ROLE } from '@company-brain/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/modules/auth/server/lib/get.current.user.server';
import { getFavoritePages } from '@/modules/favorites/server/queries/favorites.queries';
import { PagesCollectionEmbed } from '@/modules/pages/components/pages.collection.embed';
import { PagesCollectionSection } from '@/modules/pages/components/pages.collection.section';
import { PagesWorkspace } from '@/modules/pages/components/pages.workspace';
import { EMPTY_PAGE_BACKLINKS } from '@/modules/pages/constants/pages.constants';
import { buildPageDocumentTitle } from '@/modules/pages/lib/pages.lib';
import { getEditableSchemaProperties, schemaNeedsPersonOptions } from '@/modules/pages/lib/pages.properties.lib';
import { getPageAttachments } from '@/modules/pages/server/queries/pages.attachments.queries';
import { getPageBacklinks } from '@/modules/pages/server/queries/pages.backlinks.queries';
import { getPageSpaceId, getPages } from '@/modules/pages/server/queries/pages.queries';
import { getPageSchema, getPageView } from '@/modules/pages/server/queries/pages.schema.queries';
import type {
  PagePersonOption,
  PageSchema,
  PageSchemaView,
  PageViewOutcome,
} from '@/modules/pages/types/pages.schema.types';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import { canEditContent } from '@/modules/spaces/lib/spaces.lib';
import { getSpaceMembers, getSpaces } from '@/modules/spaces/server/queries/spaces.queries';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { FavoritePage } from '@/shared/types/favorites.types';

interface IProps {
  readonly params: Promise<{ pageId: string; spaceId: string }>;
}

/**
 * Sends an address that no longer holds the page to the one that does.
 *
 * A page moved to another space keeps its own name but changes where it lives,
 * and everything written before the move still points where it was. Rather than
 * answering those with nothing, the page is looked for and the reader taken to
 * it. Not finding it is left alone: the caller says what a missing page means.
 */
const followThePageToItsSpace = async (pageId: string, spaceId: string): Promise<void> => {
  const locationResult = await getPageSpaceId(pageId);
  if (locationResult.isFail()) return;
  const currentSpaceId = locationResult.getValue();
  if (currentSpaceId === spaceId) return;
  redirect({ href: ROUTES.PORTAL_SPACE_PAGE(currentSpaceId, pageId), locale: await getLocale() });
};

/** The name the browser tab carries, which is the page's own and not the workspace's. */
export const generateMetadata = async ({ params }: IProps): Promise<Metadata> => {
  const { pageId, spaceId } = await params;
  const [pagesResult, t] = await Promise.all([getPages(spaceId), getTranslations('pages')]);
  const page = pagesResult.isOk() ? pagesResult.getValue().find((candidate) => candidate.id === pageId) : undefined;
  if (page === undefined) return {};
  return { title: buildPageDocumentTitle(page.title, t('untitled')) };
};

/**
 * A collection looked at from inside another page: one of its views, drawn
 * where the block that names it stands. A reference to something this page
 * cannot read shows nothing rather than a broken frame.
 */
const renderEmbeddedCollection = async (reference: PageCollectionReference, title: string): Promise<ReactNode> => {
  const schemaResult = await getPageSchema(reference.spaceId, reference.pageId);
  if (schemaResult.isFail()) return null;
  const schema = schemaResult.getValue();
  const view = schema.views.find((candidate) => candidate.name === reference.viewName) ?? schema.views[0];
  if (view === undefined) return null;
  const outcomeResult = await getPageView(reference.spaceId, reference.pageId, view.name);

  return (
    <PagesCollectionEmbed
      outcome={outcomeResult.isOk() ? outcomeResult.getValue() : null}
      pageId={reference.pageId}
      properties={getEditableSchemaProperties(schema)}
      spaceId={reference.spaceId}
      title={title}
      view={view}
    />
  );
};

/** Whether this reader already keeps the page among their favorites. */
const resolveIsFavorite = (favoritesResult: Result<readonly FavoritePage[], Error>, pageId: string): boolean => {
  const favorites = favoritesResult.isOk() ? favoritesResult.getValue() : [];
  return favorites.some((favorite) => favorite.pageId === pageId);
};

/** The schema a page's own parent carries, since that is what says what its properties mean. */
const resolveParentSchema = async (spaceId: string, parentId: string | null): Promise<PageSchema | null> => {
  if (parentId === null) return null;
  const parentSchemaResult = await getPageSchema(spaceId, parentId);
  return parentSchemaResult.isOk() ? parentSchemaResult.getValue() : null;
};

/** The space members a schema's own person properties need to name, asked only when one is present. */
const resolvePersonOptions = async (
  spaceId: string,
  parentSchema: PageSchema | null,
): Promise<readonly PagePersonOption[]> => {
  if (!schemaNeedsPersonOptions(parentSchema)) return [];
  const personOptionsResult = await getSpaceMembers(spaceId);
  return personOptionsResult.isOk() ? personOptionsResult.getValue() : [];
};

/** One view of a page's own schema, rendered with whatever it already holds. */
const buildOwnCollectionView = async (
  spaceId: string,
  pageId: string,
  view: PageSchemaView,
): Promise<{ readonly outcome: PageViewOutcome | null; readonly view: PageSchemaView }> => {
  const outcomeResult = await getPageView(spaceId, pageId, view.name);
  return { outcome: outcomeResult.isOk() ? outcomeResult.getValue() : null, view };
};

/** The section a page shows of its own rows, present only when its own schema actually has properties. */
const buildCollectionSection = async (
  ownSchema: PageSchema | null,
  spaceId: string,
  pageId: string,
): Promise<ReactNode> => {
  if (ownSchema === null || ownSchema.properties.length === 0) return null;
  const views = await Promise.all(ownSchema.views.map((view) => buildOwnCollectionView(spaceId, pageId, view)));
  return <PagesCollectionSection properties={getEditableSchemaProperties(ownSchema)} spaceId={spaceId} views={views} />;
};

/** Every collection this page's own writing points at, drawn where each reference stands. */
const buildEmbeddedCollections = async (
  page: PageSummary,
  pages: readonly PageSummary[],
): Promise<Readonly<Record<string, ReactNode>>> => {
  const entries = await Promise.all(
    extractPageCollectionReferences(page.content).map(async (reference) => {
      const title = pages.find((candidate) => candidate.id === reference.pageId)?.title ?? reference.pageId;
      return [reference.pageId, await renderEmbeddedCollection(reference, title)] as const;
    }),
  );
  return Object.fromEntries(entries);
};

export default async function Page({ params }: IProps) {
  const { pageId, spaceId } = await params;
  if (!z.uuid().safeParse(pageId).success) notFound();

  const [spacesResult, user, pagesResult, attachmentsResult, backlinksResult, ownSchemaResult, favoritesResult] =
    await Promise.all([
      getSpaces(),
      getCurrentUser(),
      getPages(spaceId),
      getPageAttachments(pageId),
      getPageBacklinks(pageId),
      getPageSchema(spaceId, pageId),
      getFavoritePages(),
    ]);
  const space = spacesResult.isOk() ? spacesResult.getValue().find((candidate) => candidate.id === spaceId) : undefined;
  const pages = pagesResult.isOk() ? pagesResult.getValue() : null;
  const selectedPage = pages?.find((page) => page.id === pageId);
  if (selectedPage === undefined) await followThePageToItsSpace(pageId, spaceId);
  if (space === undefined || pages === null || selectedPage === undefined) notFound();

  const parentSchema = await resolveParentSchema(spaceId, selectedPage.parentId);
  const personOptions = await resolvePersonOptions(spaceId, parentSchema);
  const ownSchema = ownSchemaResult.isOk() ? ownSchemaResult.getValue() : null;
  const collectionSection = await buildCollectionSection(ownSchema, spaceId, pageId);
  const embeddedCollections = await buildEmbeddedCollections(selectedPage, pages);

  return (
    <main className="min-h-full">
      <PagesWorkspace
        attachments={attachmentsResult.isOk() ? attachmentsResult.getValue() : []}
        backlinks={backlinksResult.isOk() ? backlinksResult.getValue() : EMPTY_PAGE_BACKLINKS}
        canEditContent={canEditContent(user?.role ?? USER_ROLE.CLIENT)}
        collectionSection={collectionSection}
        currentUserDisplayName={user?.name}
        embeddedCollections={embeddedCollections}
        isFavorite={resolveIsFavorite(favoritesResult, pageId)}
        pages={pages}
        parentSchema={parentSchema}
        personOptions={personOptions}
        selectedPageId={selectedPage.id}
        spaceId={spaceId}
        spaceName={space.name}
      />
    </main>
  );
}
