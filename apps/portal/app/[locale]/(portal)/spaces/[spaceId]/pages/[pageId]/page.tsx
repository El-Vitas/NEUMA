import type { PageCollectionReference } from '@company-brain/shared';
import { extractPageCollectionReferences, USER_ROLE } from '@company-brain/shared';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { getCurrentUser } from '@/modules/auth/server/lib/get.current.user.server';
import { PagesCollectionSection } from '@/modules/pages/components/pages.collection.section';
import { PagesWorkspace } from '@/modules/pages/components/pages.workspace';
import { EMPTY_PAGE_BACKLINKS } from '@/modules/pages/constants/pages.constants';
import { getEditableSchemaProperties, schemaNeedsPersonOptions } from '@/modules/pages/lib/pages.properties.lib';
import { getPageAttachments } from '@/modules/pages/server/queries/pages.attachments.queries';
import { getPageBacklinks } from '@/modules/pages/server/queries/pages.backlinks.queries';
import { getPages } from '@/modules/pages/server/queries/pages.queries';
import { getPageSchema, getPageView } from '@/modules/pages/server/queries/pages.schema.queries';
import type { PageSchema } from '@/modules/pages/types/pages.schema.types';
import { canEditContent } from '@/modules/spaces/lib/spaces.lib';
import { getSpaceMembers, getSpaces } from '@/modules/spaces/server/queries/spaces.queries';

interface IProps {
  readonly params: Promise<{ pageId: string; spaceId: string }>;
}

const renderEmbeddedCollection = async (reference: PageCollectionReference): Promise<ReactNode> => {
  const schemaResult = await getPageSchema(reference.spaceId, reference.pageId);
  if (schemaResult.isFail()) return null;
  const schema = schemaResult.getValue();
  const views = schema.views.filter((view) => reference.viewName === undefined || view.name === reference.viewName);

  return (
    <PagesCollectionSection
      properties={getEditableSchemaProperties(schema)}
      spaceId={reference.spaceId}
      views={
        await Promise.all(
          views.map(async (view) => {
            const outcomeResult = await getPageView(reference.spaceId, reference.pageId, view.name);
            return { outcome: outcomeResult.isOk() ? outcomeResult.getValue() : null, view };
          }),
        )
      }
    />
  );
};

export default async function Page({ params }: IProps) {
  const { pageId, spaceId } = await params;
  if (!z.uuid().safeParse(pageId).success) notFound();

  const [spacesResult, user, pagesResult, attachmentsResult, backlinksResult, ownSchemaResult] = await Promise.all([
    getSpaces(),
    getCurrentUser(),
    getPages(spaceId),
    getPageAttachments(pageId),
    getPageBacklinks(pageId),
    getPageSchema(spaceId, pageId),
  ]);
  const space = spacesResult.isOk() ? spacesResult.getValue().find((candidate) => candidate.id === spaceId) : undefined;
  const pages = pagesResult.isOk() ? pagesResult.getValue() : null;
  const selectedPage = pages?.find((page) => page.id === pageId);
  if (space === undefined || pages === null || selectedPage === undefined) notFound();

  const parentSchemaResult =
    selectedPage.parentId === null ? null : await getPageSchema(spaceId, selectedPage.parentId);
  const parentSchema: PageSchema | null = parentSchemaResult?.isOk() ? parentSchemaResult.getValue() : null;
  const personOptionsResult = schemaNeedsPersonOptions(parentSchema) ? await getSpaceMembers(spaceId) : null;
  const personOptions = personOptionsResult?.isOk() ? personOptionsResult.getValue() : [];

  const ownSchema = ownSchemaResult.isOk() ? ownSchemaResult.getValue() : null;
  const collectionSection =
    ownSchema !== null && ownSchema.properties.length > 0 ? (
      <PagesCollectionSection
        properties={getEditableSchemaProperties(ownSchema)}
        spaceId={spaceId}
        views={
          await Promise.all(
            ownSchema.views.map(async (view) => {
              const outcomeResult = await getPageView(spaceId, pageId, view.name);
              return { outcome: outcomeResult.isOk() ? outcomeResult.getValue() : null, view };
            }),
          )
        }
      />
    ) : null;

  const embeddedCollections = Object.fromEntries(
    await Promise.all(
      extractPageCollectionReferences(selectedPage.content).map(async (reference) => [
        reference.pageId,
        await renderEmbeddedCollection(reference),
      ]),
    ),
  );

  return (
    <main className="min-h-full">
      <PagesWorkspace
        attachments={attachmentsResult.isOk() ? attachmentsResult.getValue() : []}
        backlinks={backlinksResult.isOk() ? backlinksResult.getValue() : EMPTY_PAGE_BACKLINKS}
        canEditContent={canEditContent(user?.role ?? USER_ROLE.CLIENT)}
        collectionSection={collectionSection}
        currentUserDisplayName={user?.name}
        embeddedCollections={embeddedCollections}
        isNewPage={false}
        pages={pages}
        parentSchema={parentSchema}
        personOptions={personOptions}
        selectedPageId={selectedPage.id}
        spaceId={spaceId}
      />
    </main>
  );
}
