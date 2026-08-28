import { z } from 'zod';
import { PAGES_EXPORT_SELECTION_LIMIT } from '../constants/pages.export.constants';

export const pageExportScopeSchema = z.enum(['branch', 'page', 'pages', 'space']);

const namesOnePage = (scope: z.infer<typeof pageExportScopeSchema>): boolean => scope === 'branch' || scope === 'page';

export const pageExportRequestSchema = z
  .object({
    pageId: z.string().nullable().default(null),
    pageIds: z.array(z.string()).max(PAGES_EXPORT_SELECTION_LIMIT).default([]),
    scope: pageExportScopeSchema,
    spaceId: z.string(),
    /** What a page with no name of its own is called in the file, in the reader's own language. */
    untitledLabel: z.string().min(1).max(80),
  })
  .refine((request) => !namesOnePage(request.scope) || request.pageId !== null, {
    message: 'An export of one page needs to say which page',
    path: ['pageId'],
  })
  .refine((request) => request.scope !== 'pages' || request.pageIds.length > 0, {
    message: 'An export of a selection needs to say which pages',
    path: ['pageIds'],
  });
