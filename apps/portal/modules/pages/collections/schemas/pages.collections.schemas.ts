import {
  PAGE_OPTION_COLOR_VALUES,
  PAGE_PROPERTY_TYPE_VALUES,
  PAGE_VIEW_TYPE_VALUES,
  pageContentSchema,
} from '@company-brain/shared';
import { z } from 'zod';

const pageCollectionOptionSchema = z.object({
  color: z.enum(PAGE_OPTION_COLOR_VALUES).nullable(),
  value: z.string().min(1).max(200),
});

const pageCollectionPropertySchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  options: z.array(pageCollectionOptionSchema).max(50).readonly().nullable(),
  required: z.boolean(),
  type: z.enum(PAGE_PROPERTY_TYPE_VALUES),
});

const pageCollectionViewSchema = z.object({
  configuration: z.record(z.string(), z.unknown()),
  isDefault: z.boolean(),
  name: z.string().min(1).max(200),
  type: z.enum(PAGE_VIEW_TYPE_VALUES),
});

/** What has to be said to start a collection: a page to keep it in, and the shape it starts with. */
export const pageCollectionCreateSchema = z.object({
  content: pageContentSchema,
  /** Sin madre cuando la colección se crea desde el espacio: ahí es una página de raíz como cualquier otra. */
  parentId: z.string().min(1).optional(),
  properties: z.array(pageCollectionPropertySchema).min(1).max(50).readonly(),
  spaceId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  views: z.array(pageCollectionViewSchema).min(1).max(20).readonly(),
});

/** What has to be said to ask whether a page already written is a collection. */
export const pageCollectionReadSchema = z.object({
  pageId: z.string().min(1),
  spaceId: z.string().min(1),
});

/**
 * What has to be said to change what one row holds.
 *
 * Only the properties that moved travel. A value of `null` clears the property,
 * which is what dropping a card on the column of rows without a value means.
 */
export const pageRowPropertiesSchema = z.object({
  pageId: z.string().min(1),
  propertyValues: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])),
  spaceId: z.string().min(1),
});

/**
 * What has to be said to change the shape of a collection that already exists.
 *
 * The whole shape travels, not the one thing that changed, because a property
 * that disappeared from the list is a property somebody removed and there is no
 * other way to say it.
 */
export const pageCollectionUpdateSchema = z.object({
  pageId: z.string().min(1),
  properties: z.array(pageCollectionPropertySchema).min(1).max(50).readonly(),
  spaceId: z.string().min(1),
  views: z.array(pageCollectionViewSchema).min(1).max(20).readonly(),
});
