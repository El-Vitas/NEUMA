import { PAGE_ICON_COLORS, pageEmojiIconSchema, pageSymbolIconSchema } from '@company-brain/shared';
import { z } from 'zod';

/**
 * What is asked for when a space is marked.
 *
 * The mark itself follows the shared contract, so a space can only carry what a
 * page could carry, and the tree can draw the two the same way.
 */
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
