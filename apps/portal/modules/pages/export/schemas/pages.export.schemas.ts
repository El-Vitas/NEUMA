import { z } from 'zod';
import { PAGES_EXPORT_SELECTION_LIMIT } from '../constants/pages.export.constants';

export const pageExportScopeSchema = z.enum(['branch', 'page', 'pages', 'space']);

const namesOnePage = (scope: z.infer<typeof pageExportScopeSchema>): boolean => scope === 'branch' || scope === 'page';

export const pageExportRequestSchema = z
  .object({
    pageId: z.uuid().nullable().default(null),
    pageIds: z.array(z.uuid()).max(PAGES_EXPORT_SELECTION_LIMIT).default([]),
    scope: pageExportScopeSchema,
    spaceId: z.uuid(),
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
