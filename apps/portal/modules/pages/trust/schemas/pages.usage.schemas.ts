import { z } from 'zod';

export const pageUsageViewerSchema = z.object({
  id: z.string(),
  name: z.string(),
  viewedAt: z.coerce.date(),
});

export const pageUsageSummarySchema = z.object({
  viewCount: z.number(),
  viewers: z.array(pageUsageViewerSchema),
});

export const pageUsageSettingsSchema = z.object({ enabled: z.boolean() });

export const pageUsageRecordSchema = z.object({ pageId: z.uuid() });

export const pageUsageSettingsUpdateSchema = z.object({ enabled: z.boolean() });
