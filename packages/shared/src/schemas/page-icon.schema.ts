import { z } from 'zod';

const maximumPageIconEmojiLength = 16;

export const pageEmojiIconSchema = z.object({
  kind: z.literal('emoji'),
  value: z.string().trim().min(1).max(maximumPageIconEmojiLength),
});

export const pageImageIconSchema = z.object({ assetId: z.uuid(), kind: z.literal('image') });

const maximumPageSymbolIconNameLength = 64;

/**
 * A page marked with one of the drawn symbols the product already speaks in,
 * rather than an emoji or a picture of its own.
 *
 * Only the name is kept. Which symbols are offered, and how each one is drawn,
 * belongs to whoever draws them: storing a name rather than a drawing is what
 * lets that set change without rewriting what every page already chose.
 */
export const PAGE_ICON_COLORS = [
  'default',
  'gray',
  'brown',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'red',
] as const;

export const pageSymbolIconSchema = z.object({
  color: z.enum(PAGE_ICON_COLORS).catch('default').default('default'),
  kind: z.literal('symbol'),
  name: z
    .string()
    .trim()
    .min(1)
    .max(maximumPageSymbolIconNameLength)
    .regex(/^[a-z][a-z0-9-]*$/),
});

export const pageIconSchema = z.discriminatedUnion('kind', [
  pageEmojiIconSchema,
  pageImageIconSchema,
  pageSymbolIconSchema,
]);

export type PageEmojiIcon = z.infer<typeof pageEmojiIconSchema>;
export type PageImageIcon = z.infer<typeof pageImageIconSchema>;
export type PageIconColor = (typeof PAGE_ICON_COLORS)[number];
export type PageSymbolIcon = z.infer<typeof pageSymbolIconSchema>;
export type PageIcon = z.infer<typeof pageIconSchema>;
