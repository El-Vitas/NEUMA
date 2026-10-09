import { PAGE_ICON_COLORS, pageEmojiIconSchema, pageSymbolIconSchema } from '@neuma/shared';
import { z } from 'zod';

/** Reuses the shared page icon schemas so spaces and pages render icons the same way. */
export const spaceIconEmojiInputSchema = z.object({
  spaceId: z.string().min(1),
  value: pageEmojiIconSchema.shape.value,
});

export const spaceIconSymbolInputSchema = z.object({
  color: z.enum(PAGE_ICON_COLORS),
  name: pageSymbolIconSchema.shape.name,
  spaceId: z.string().min(1),
});

export const spaceIconRemoveSchema = z.object({
  spaceId: z.string().min(1),
});
