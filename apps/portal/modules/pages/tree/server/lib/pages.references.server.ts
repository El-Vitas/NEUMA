import 'server-only';

import type { Result } from '@neuma/shared';
import { withQuery } from '@/shared/lib/with-query.lib';
import type { PageContent, PageReference } from '../../../types/pages.types';
import { extractReferencedPageIds, extractSyncedPageIds } from '../../lib/pages.references.lib';
import type { PageLookupEntry, PageReferencesRead } from '../../types/pages.tree.types';
import { readPageContents, readPageLookups } from './pages.lookup.server';

const toReference = ({ icon, id, lifecycle, spaceId, title }: PageLookupEntry): PageReference => ({
  icon,
  id,
  lifecycle,
  spaceId,
  title,
});

/**
 * What a page needs to draw the other pages it names, asked for together once the page opens instead of read from
 * a list of the whole space (ADR 030): two requests however many mentions, subpages or relations it has. Read fresh,
 * because a title that changed must show as soon as the page is opened again.
 */
export const getPageReferences = async (
  content: PageContent,
  relatedPageIds: readonly string[],
): Promise<Result<PageReferencesRead, Error>> =>
  withQuery({ op: 'getPageReferences', params: { related: relatedPageIds.length } }, async (accessToken) => {
    const syncedIds = extractSyncedPageIds(content);
    const [entries, sources] = await Promise.all([
      readPageLookups(accessToken, [...extractReferencedPageIds(content), ...relatedPageIds]),
      syncedIds.length === 0 ? Promise.resolve([]) : readPageContents(accessToken, syncedIds),
    ]);
    const related = new Set(relatedPageIds);
    return {
      references: entries.map(toReference),
      relatedRows: entries.filter((entry) => related.has(entry.id)).map(({ id, title }) => ({ id, title })),
      syncedSources: sources.map(({ content: sourceContent, id }) => ({ content: sourceContent, id })),
    };
  });
