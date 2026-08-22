import { z } from 'zod';

export const pageExportScopeSchema = z.enum(['branch', 'page', 'space']);

export const pageExportRequestSchema = z
  .object({
    pageId: z.string().nullable().default(null),
    scope: pageExportScopeSchema,
    spaceId: z.string(),
    /** What a page with no name of its own is called in the file, in the reader's own language. */
    untitledLabel: z.string().min(1).max(80),
  })
  .refine((request) => request.scope === 'space' || request.pageId !== null, {
    message: 'An export of one page needs to say which page',
    path: ['pageId'],
  });
