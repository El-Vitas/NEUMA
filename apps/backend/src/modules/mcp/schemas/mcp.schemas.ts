import { SPACE_VISIBILITY_VALUES } from '@company-brain/shared';
import { z } from 'zod';

import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_CURSOR_LENGTH,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_QUERY_LENGTH,
} from '../../../common/constants/search.constants';
import {
  MCP_ADDRESS_MAX_LENGTH,
  MCP_BLOCK_TYPE_MAX_LENGTH,
  MCP_FETCH_BACKLINK_LIMIT,
  MCP_FETCH_COMMENT_LIMIT,
  MCP_LISTED_PAGE_LIMIT,
  MCP_LISTED_PAGE_PART_DEFAULT,
  MCP_LISTED_PAGE_PART_MAX,
  MCP_PATH_MAX_DEPTH,
  MCP_SEARCH_PAGE_TITLE_LIMIT,
  MCP_TEXT_MAX_LENGTH,
  MCP_TITLE_MAX_LENGTH,
} from '../constants/mcp.limits.constants';

const idSchema = z.string().max(128);
const titleSchema = z.string().max(MCP_TITLE_MAX_LENGTH);
const urlSchema = z.url();

const mcpSpaceSchema = z.object({
  id: idSchema,
  name: z.string().max(200),
  slug: z.string().max(200),
  visibility: z.enum(SPACE_VISIBILITY_VALUES),
});

export const listSpacesInputSchema = z.object({});

export const listSpacesOutputSchema = z.object({
  spaces: z.array(mcpSpaceSchema).max(1000),
});

/** Las propiedades de una fila: cada columna con su valor, y las personas por su nombre. */
const mcpRowPropertiesSchema = z
  .array(
    z.object({
      key: z.string().max(128),
      label: z.string().max(MCP_TITLE_MAX_LENGTH),
      people: z
        .array(z.object({ id: idSchema, name: z.string().max(MCP_TITLE_MAX_LENGTH) }))
        .max(MCP_LISTED_PAGE_LIMIT)
        .optional(),
      type: z.string().max(64),
      value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
    }),
  )
  .max(MCP_LISTED_PAGE_LIMIT)
  .optional();

/** Una página vista desde el árbol, como la entregan `list_pages` y las hijas de `fetch`. */
const mcpOutlinePageSchema = z.object({
  childCount: z.number().int().nonnegative(),
  id: idSchema,
  isCollection: z.boolean(),
  /** Si es una fila de una colección, lo que tiene en cada columna. */
  properties: mcpRowPropertiesSchema,
  title: titleSchema,
  url: urlSchema,
});

export const searchInputSchema = z.object({
  blockType: z
    .string()
    .trim()
    .min(1)
    .max(MCP_BLOCK_TYPE_MAX_LENGTH)
    .optional()
    .describe('Only blocks of this type, as they appear in results: paragraph, heading, list_item, task_item, table…'),
  cursor: z.string().trim().min(1).max(SEARCH_MAX_CURSOR_LENGTH).optional(),
  limit: z.number().int().min(1).max(SEARCH_MAX_LIMIT).default(SEARCH_DEFAULT_LIMIT),
  pageId: z.uuid().optional().describe('Search only in this page and the pages under it.'),
  query: z.string().trim().min(1).max(SEARCH_MAX_QUERY_LENGTH),
  spaceId: z.uuid().optional().describe('Search only in this space.'),
});

const mcpBlockHitSchema = z.object({
  blockId: idSchema,
  blockType: z.string().max(64),
  pageId: idSchema,
  pageTitle: titleSchema,
  parentPageTitle: titleSchema.nullable(),
  section: z.array(z.string().max(MCP_TEXT_MAX_LENGTH)).max(MCP_PATH_MAX_DEPTH),
  snippet: z.string().max(MCP_TEXT_MAX_LENGTH),
  spaceId: idSchema,
  spaceName: z.string().max(200),
  url: urlSchema,
});

const mcpPageHitSchema = z.object({
  pageId: idSchema,
  snippet: z.string().max(MCP_TEXT_MAX_LENGTH),
  spaceId: idSchema,
  title: titleSchema,
  url: urlSchema,
});

export const searchOutputSchema = z.object({
  blocks: z.array(mcpBlockHitSchema).max(SEARCH_MAX_LIMIT),
  nextCursor: z.string().max(SEARCH_MAX_CURSOR_LENGTH).optional(),
  pages: z.array(mcpPageHitSchema).max(MCP_SEARCH_PAGE_TITLE_LIMIT),
});

export const fetchInputSchema = z.object({
  cursor: z
    .string()
    .regex(/^\d{1,6}$/)
    .optional()
    .describe('To read the next part of a long page: the cursor the previous part returned.'),
  address: z
    .string()
    .trim()
    .min(1)
    .max(MCP_ADDRESS_MAX_LENGTH)
    .describe('A Company Brain link to a page or block, or a page id, or a block id.'),
});

/** Un paso de la ruta de una página. Uno que el agente no puede ver va sin id ni título. */
const mcpPathStepSchema = z.object({ id: idSchema.nullable(), title: titleSchema });

/**
 * La página abierta. Cuando se pidió un bloque, va solo lo que dice dónde está
 * el bloque; lo que la página dice entera se pide abriendo la página.
 */
const mcpFetchedPageSchema = z.object({
  backlinks: z
    .array(z.object({ id: idSchema, title: titleSchema, url: urlSchema }))
    .max(MCP_FETCH_BACKLINK_LIMIT)
    .optional(),
  children: z.array(mcpOutlinePageSchema).max(MCP_LISTED_PAGE_LIMIT).optional(),
  comments: z
    .array(
      z.object({
        author: z.string().max(MCP_TITLE_MAX_LENGTH),
        blockId: idSchema,
        body: z.string().max(MCP_TEXT_MAX_LENGTH),
        createdAt: z.string().max(64),
      }),
    )
    .max(MCP_FETCH_COMMENT_LIMIT)
    .optional(),
  id: idSchema,
  markdown: z.string().optional(),
  /** Si la página sigue: el cursor para pedir el tramo siguiente. */
  nextCursor: z.string().optional(),
  path: z.array(mcpPathStepSchema).max(MCP_PATH_MAX_DEPTH),
  properties: mcpRowPropertiesSchema,
  spaceId: idSchema,
  title: titleSchema,
  url: urlSchema,
  version: z.number().int().nonnegative(),
});

const mcpFetchedBlockSchema = z.object({
  id: idSchema,
  markdown: z.string(),
  section: z.array(z.string().max(MCP_TEXT_MAX_LENGTH)).max(MCP_PATH_MAX_DEPTH),
  type: z.string().max(64),
  url: urlSchema,
});

export const fetchOutputSchema = z.object({
  block: mcpFetchedBlockSchema.optional(),
  note: z.string().max(MCP_TEXT_MAX_LENGTH).optional(),
  page: mcpFetchedPageSchema,
});

export const listPagesInputSchema = z.object({
  cursor: z
    .string()
    .regex(/^\d{1,6}$/)
    .optional()
    .describe('To list the next part: the cursor the previous part returned.'),
  limit: z.number().int().min(1).max(MCP_LISTED_PAGE_PART_MAX).default(MCP_LISTED_PAGE_PART_DEFAULT),
  parentPageId: z
    .uuid()
    .optional()
    .describe('List the pages right under this page. Under a collection, each row comes with its properties.'),
  spaceId: z.uuid().optional().describe('List the pages at the top of this space.'),
});

export const listPagesOutputSchema = z.object({
  nextCursor: z.string().optional(),
  pages: z.array(mcpOutlinePageSchema).max(MCP_LISTED_PAGE_PART_MAX),
  total: z.number().int().nonnegative(),
});
