'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { ApiError } from '@/shared/lib/api';
import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { authenticatedRequest } from '@/shared/server/lib/authenticated-request.server';
import { readRequestTimeZone } from '@/shared/server/lib/time-zone.server';
import { PAGE_API_ROUTES } from '../../../constants/pages.constants';
import { pageSummarySchema } from '../../../schemas/pages.schemas';
import type { PageSummary } from '../../../types/pages.types';
import { PAGE_VIEW_MATCHING_MAXIMUM_ROWS, PAGE_VIEW_ROWS_REDUCER } from '../../constants/pages.query.constants';
import {
  PAGE_BLOCK_TABLE,
  PAGE_RELATION_COMMAND,
  PAGE_RELATION_MIRROR_FORBIDDEN_CODE,
  PAGE_RELATION_PICKER_VISIBLE_LIMIT,
} from '../../constants/pages.relations.constants';
import { PageRelationRefusedError } from '../../lib/pages.relations.errors';
import { toRequestedProperty } from '../../lib/pages.schema-request.lib';
import { toRefinementPart } from '../../lib/pages.view-query.lib';
import {
  pageCollectionCreateSchema,
  pageCollectionReadSchema,
  pageCollectionRefreshSchema,
  pageCollectionUpdateSchema,
  pageMatchingRowsSchema,
  pageOptionRewriteSchema,
  pageRelationCandidatesSchema,
  pageRowMoveSchema,
  pageRowPropertiesSchema,
  pageRowRelationChangeSchema,
  pageRowsContinuationSchema,
  pageRowsRefreshSchema,
  pageViewOperationsSchema,
} from '../../schemas/pages.collections.schemas';
import {
  pageChangedViewSchema,
  pageQueryResponseSchema,
  pageSchemaSchema,
  pageTransactionsResponseSchema,
} from '../../schemas/pages.schema.schemas';
import type { PageChangedView, PageMatchingRows, PageRowsContinuation } from '../../types/pages.query.types';
import type { PageRelationChangeOutcome } from '../../types/pages.relations.types';
import type { PageRelatedRow, PageSchema } from '../../types/pages.schema.types';
import { readRowsInScope } from '../lib/pages.rows-reading.server';

/** Page and shape are created together: a page without a shape is indistinguishable from an ordinary one. */
export const createPageCollectionAction = actionClient
  .inputSchema(pageCollectionCreateSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'createPageCollection' }, async (): Promise<PageSummary> => {
      const created = await authenticatedRequest(PAGE_API_ROUTES.list(parsedInput.spaceId), 'POST', {
        content: parsedInput.content,
        parentId: parsedInput.parentId,
        title: parsedInput.title,
      });
      const page = pageSummarySchema.parse(created);
      await authenticatedRequest(PAGE_API_ROUTES.schema(parsedInput.spaceId, page.id), 'POST', {
        properties: parsedInput.properties.map(toRequestedProperty),
        views: parsedInput.views,
      });
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return page;
    }),
  );

/** Only the changed properties travel: sending the whole page would overwrite concurrent edits to its content. */
export const updatePageRowPropertiesAction = actionClient
  .inputSchema(pageRowPropertiesSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'updatePageRowProperties' }, async (): Promise<void> => {
      await authenticatedRequest(PAGE_API_ROUTES.properties(parsedInput.spaceId, parsedInput.pageId), 'PATCH', {
        propertyValues: parsedInput.propertyValues,
      });
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    }),
  );

/** Row values live on the rows, not the shape: a removed property stops showing but its stored values remain. */
export const updatePageCollectionAction = actionClient
  .inputSchema(pageCollectionUpdateSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'updatePageCollection' }, async (): Promise<PageSchema> => {
      const updated = await authenticatedRequest(
        PAGE_API_ROUTES.schema(parsedInput.spaceId, parsedInput.pageId),
        'POST',
        { properties: parsedInput.properties.map(toRequestedProperty), views: parsedInput.views },
      );
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageSchemaSchema.parse(updated);
    }),
  );

/** Each operation changes one key or one element of the view, so two people editing it do not undo each other. */
export const applyPageViewOperationsAction = actionClient
  .inputSchema(pageViewOperationsSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'applyPageViewOperations' }, async (): Promise<PageChangedView> => {
      const changed = await authenticatedRequest(
        PAGE_API_ROUTES.viewOperations(parsedInput.spaceId, parsedInput.pageId, parsedInput.viewId),
        'POST',
        { mutationId: parsedInput.mutationId, operations: parsedInput.operations },
      );
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageChangedViewSchema.parse(changed);
    }),
  );

/** The value and the place in the view are written together: a card is never half moved. */
export const movePageRowAction = actionClient.inputSchema(pageRowMoveSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'movePageRow' }, async (): Promise<PageChangedView> => {
    const changed = await authenticatedRequest(
      PAGE_API_ROUTES.moveRow(parsedInput.spaceId, parsedInput.pageId, parsedInput.viewId),
      'POST',
      {
        after: parsedInput.after,
        before: parsedInput.before,
        listChanges: parsedInput.listChanges,
        rowId: parsedInput.rowId,
        values: parsedInput.values,
      },
    );
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    return pageChangedViewSchema.parse(changed);
  }),
);

/**
 * Drops the cached reads of the space, so the view draws again from what others changed. Server actions run one at
 * a time in the order the browser sent them, so this one waits behind the writes the same browser still has in flight.
 */
export const refreshPageCollectionAction = actionClient
  .inputSchema(pageCollectionRefreshSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'refreshPageCollection' }, async (): Promise<void> => {
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    }),
  );

/** Read on demand, not cached: the next page must continue from where the last one ended, as of now. */
export const loadMorePageRowsAction = actionClient
  .inputSchema(pageRowsContinuationSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'loadMorePageRows' }, async (): Promise<PageRowsContinuation> => {
      const accessToken = await requireAccessTokenCookie();
      const reducer =
        parsedInput.group === undefined
          ? ({ cursor: parsedInput.cursor, id: 'more', kind: 'results' } as const)
          : ({ cursor: parsedInput.cursor, group: parsedInput.group, id: 'more', kind: 'groupResults' } as const);
      const timeZone = await readRequestTimeZone();
      const response = await apiRequest<unknown>(
        PAGE_API_ROUTES.query(parsedInput.spaceId, parsedInput.pageId),
        accessToken,
        {
          body: JSON.stringify({
            reducers: [reducer],
            ...toRefinementPart(parsedInput.search, parsedInput.quickFilter),
            ...(timeZone === null ? {} : { timeZone }),
            viewId: parsedInput.viewId,
          }),
          method: 'POST',
        },
      );
      const result = pageQueryResponseSchema.parse(response);
      const outcome = result.reducers.more;
      if (outcome?.kind !== 'results') throw new Error('The continuation of a view arrived as something else');
      return {
        attachedFiles: result.attachedFiles,
        nextCursor: outcome.nextCursor,
        relatedRows: result.relatedRows,
        rows: outcome.ids.flatMap((id) => result.rows[id] ?? []),
      };
    }),
  );

/** A scope read again from where the server's rows end, as far as the reader had scrolled: a redraw loses nothing. */
export const refreshPageRowsAction = actionClient.inputSchema(pageRowsRefreshSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'refreshPageRows' }, async (): Promise<PageRowsContinuation> => {
    const read = await readRowsInScope({
      group: parsedInput.group,
      pageId: parsedInput.pageId,
      quickFilter: parsedInput.quickFilter,
      search: parsedInput.search,
      spaceId: parsedInput.spaceId,
      startCursor: parsedInput.cursor,
      viewId: parsedInput.viewId,
      wanted: parsedInput.wanted,
    });
    if (read === null) throw new Error('The rows a view had loaded could not be read again');
    return {
      attachedFiles: read.attachedFiles,
      nextCursor: read.nextCursor,
      relatedRows: read.relatedRows,
      rows: read.rows,
    };
  }),
);

/** Every row that matches, to act on all of them; refused beyond the limit rather than acting on part. */
export const readPageMatchingRowsAction = actionClient
  .inputSchema(pageMatchingRowsSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'matchingRows' }, async (): Promise<PageMatchingRows> => {
      const read = await readRowsInScope({
        pageId: parsedInput.pageId,
        quickFilter: parsedInput.quickFilter,
        search: parsedInput.search,
        spaceId: parsedInput.spaceId,
        viewId: parsedInput.viewId,
        wanted: PAGE_VIEW_MATCHING_MAXIMUM_ROWS,
      });
      if (read === null) throw new Error('The rows that match could not be read');
      if (read.nextCursor !== null) return { isTooMany: true, rowIds: [], valuesByRow: {} };
      return {
        isTooMany: false,
        rowIds: read.rows.map((row) => row.id),
        valuesByRow: Object.fromEntries(read.rows.map((row) => [row.id, row.propertyValues ?? {}])),
      };
    }),
  );

/** Names the option by its id: a rename touches the shape only, and a removal clears it from the rows. */
export const rewritePageCollectionOptionAction = actionClient
  .inputSchema(pageOptionRewriteSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'rewritePageCollectionOption' }, async (): Promise<PageSchema> => {
      const updated = await authenticatedRequest(
        PAGE_API_ROUTES.rewriteOption(parsedInput.spaceId, parsedInput.pageId, parsedInput.propertyKey),
        'POST',
        { optionId: parsedInput.optionId, ...(parsedInput.to === null ? {} : { to: parsedInput.to }) },
      );
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageSchemaSchema.parse(updated);
    }),
  );

/** One row at a time through the block transaction, so the other side of a two-way relation follows. */
export const changePageRowRelationAction = actionClient
  .inputSchema(pageRowRelationChangeSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'changePageRowRelation' }, async (): Promise<PageRelationChangeOutcome> => {
      const response = await authenticatedRequest<unknown>(PAGE_API_ROUTES.transactions, 'POST', {
        transactions: [
          {
            id: crypto.randomUUID(),
            operations: [
              {
                args: { property: parsedInput.propertyKey, targetId: parsedInput.targetId },
                command: PAGE_RELATION_COMMAND[parsedInput.change],
                path: [],
                pointer: { id: parsedInput.rowId, table: PAGE_BLOCK_TABLE },
              },
            ],
            spaceId: parsedInput.spaceId,
          },
        ],
      });
      const refusal = pageTransactionsResponseSchema.parse(response).transactions.at(0)?.error;
      if (refusal?.code === PAGE_RELATION_MIRROR_FORBIDDEN_CODE) return 'MIRROR_FORBIDDEN';
      if (refusal !== undefined) throw new PageRelationRefusedError(refusal.code);
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return 'CHANGED';
    }),
  );

/** The rows a relation can point to, for the picker. Read on demand: it must be what the reader can open now. */
export const listPageRelationCandidatesAction = actionClient
  .inputSchema(pageRelationCandidatesSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'listPageRelationCandidates' }, async (): Promise<readonly PageRelatedRow[]> => {
      const accessToken = await requireAccessTokenCookie();
      const response = await apiRequest<unknown>(
        PAGE_API_ROUTES.query(parsedInput.spaceId, parsedInput.collectionId),
        accessToken,
        {
          body: JSON.stringify({
            reducers: [{ id: PAGE_VIEW_ROWS_REDUCER, kind: 'results', limit: PAGE_RELATION_PICKER_VISIBLE_LIMIT }],
            ...(parsedInput.search === undefined || parsedInput.search === '' ? {} : { search: parsedInput.search }),
          }),
          method: 'POST',
        },
      );
      const answered = pageQueryResponseSchema.parse(response);
      const outcome = answered.reducers[PAGE_VIEW_ROWS_REDUCER];
      const ids = outcome?.kind === 'results' ? outcome.ids : [];
      return ids.flatMap((id) => {
        const row = answered.rows[id];
        return row === undefined ? [] : [{ id: row.id, title: row.title }];
      });
    }),
  );

/** Null when the page is not a collection (404). */
export const readPageCollectionAction = actionClient
  .inputSchema(pageCollectionReadSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'readPageCollection' }, async (): Promise<PageSchema | null> => {
      const accessToken = await requireAccessTokenCookie();
      try {
        const response = await apiRequest<unknown>(
          PAGE_API_ROUTES.schema(parsedInput.spaceId, parsedInput.pageId),
          accessToken,
        );
        return pageSchemaSchema.parse(response);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    }),
  );
