import { pageEmojiIconSchema, pageIconSchema, pageSymbolIconSchema } from '@neuma/shared';
import { z } from 'zod';

export { pageIconSchema };

export const pageIconLocatorSchema = z.object({ pageId: z.uuid(), spaceId: z.uuid() });

export const pageIconEmojiInputSchema = pageIconLocatorSchema.extend({
  value: pageEmojiIconSchema.shape.value,
});

export const pageIconSymbolInputSchema = pageIconLocatorSchema.extend({
  color: pageSymbolIconSchema.shape.color,
  name: pageSymbolIconSchema.shape.name,
});

export const pageIconImageUploadSchema = pageIconLocatorSchema.extend({
  file: z.instanceof(File),
  previousAssetId: z.uuid().optional(),
});

export const pageIconRemoveSchema = pageIconLocatorSchema.extend({
  previousAssetId: z.uuid().optional(),
});
