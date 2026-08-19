import { z } from 'zod';

export const portalSidebarDraggedPageSchema = z.object({
  pageId: z.string().min(1),
  spaceId: z.string().min(1),
});

export const portalSidebarDraggedSpaceSchema = z.object({ spaceId: z.string().min(1) });
