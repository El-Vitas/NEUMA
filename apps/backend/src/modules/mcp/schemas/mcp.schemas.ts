import { PAGE_VERIFICATION_STATUSES, SPACE_VISIBILITY_VALUES } from '@company-brain/shared';
import { z } from 'zod';

import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_EDITED_RANGE_VALUES,
  SEARCH_MAX_AUTHOR_QUERY_LENGTH,
  SEARCH_MAX_CURSOR_LENGTH,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_QUERY_LENGTH,
} from '../../../common/constants/search.constants';
import {
  MCP_BLOCK_TYPE_MAX_LENGTH,
  MCP_COMMENT_DATE_MAX_LENGTH,
  MCP_FETCH_BACKLINK_LIMIT,
  MCP_FETCH_CHILD_LIMIT,
  MCP_FETCH_COMMENT_LIMIT,
  MCP_LISTED_PAGE_LIMIT,
  MCP_LISTED_PAGE_PART_DEFAULT,
  MCP_LISTED_PAGE_PART_MAX,
  MCP_LISTED_SPACE_LIMIT,
  MCP_PATH_MAX_DEPTH,
  MCP_SEARCH_PAGE_TITLE_LIMIT,
  MCP_TEXT_MAX_LENGTH,
  MCP_TITLE_MAX_LENGTH,
} from '../constants/mcp.limits.constants';
import { buildMcpAddressSchema, buildMcpOffsetCursorSchema, mcpIdSchema } from './mcp.common.schemas';

const idSchema = mcpIdSchema;
const titleSchema = z.string().max(MCP_TITLE_MAX_LENGTH);
const urlSchema = z.url();
const kindSchema = z.string().max(MCP_BLOCK_TYPE_MAX_LENGTH);

const mcpSpaceSchema = z.object({
  id: idSchema,
  name: titleSchema,
  slug: titleSchema,
  visibility: z.enum(SPACE_VISIBILITY_VALUES),
});

export const listSpacesInputSchema = z.object({});

export const listSpacesOutputSchema = z.object({
  spaces: z.array(mcpSpaceSchema).max(MCP_LISTED_SPACE_LIMIT),
});

const mcpPersonSchema = z.object({ id: idSchema, name: z.string().max(MCP_TITLE_MAX_LENGTH) });

/** Un día, como `YYYY-MM-DD`. */
const daySchema = z.iso.date();

/**
 * Si la página es de fiar: si alguien respondió por ella y si eso sigue
 * valiendo, si está bloqueada contra cambios y quién la cuida.
 */
const mcpPageStateSchema = z.object({
  locked: z.boolean(),
  owner: mcpPersonSchema.nullable(),
  verification: z.object({
    by: mcpPersonSchema.nullable(),
    on: daySchema.nullable(),
    status: z.enum(PAGE_VERIFICATION_STATUSES),
    until: daySchema.nullable(),
  }),
});

/** Las propiedades de una fila: cada columna con su valor, y las personas por su nombre. */
const mcpRowPropertiesSchema = z
  .array(
    z.object({
      key: idSchema,
      label: z.string().max(MCP_TITLE_MAX_LENGTH),
      people: z.array(mcpPersonSchema).max(MCP_LISTED_PAGE_LIMIT).optional(),
      type: kindSchema,
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
  author: z
    .string()
    .trim()
    .min(1)
    .max(SEARCH_MAX_AUTHOR_QUERY_LENGTH)
    .optional()
    .describe('Only pages created by someone whose name contains this.'),
  blockType: z
    .string()
    .trim()
    .min(1)
    .max(MCP_BLOCK_TYPE_MAX_LENGTH)
    .optional()
    .describe('Only blocks of this type, as they appear in results: paragraph, heading, list_item, task_item, table…'),
  cursor: z.string().trim().min(1).max(SEARCH_MAX_CURSOR_LENGTH).optional(),
  editedWithin: z
    .enum(SEARCH_EDITED_RANGE_VALUES)
    .optional()
    .describe('Only pages edited today, in the last seven days, in the last month, or this year.'),
  limit: z.number().int().min(1).max(SEARCH_MAX_LIMIT).default(SEARCH_DEFAULT_LIMIT),
  pageId: z.uuid().optional().describe('Search only in this page and the pages under it.'),
  query: z.string().trim().min(1).max(SEARCH_MAX_QUERY_LENGTH),
  spaceId: z.uuid().optional().describe('Search only in this space.'),
  verifiedOnly: z
    .boolean()
    .optional()
    .describe('Only pages someone vouched for as up to date, and whose vouching has not run out.'),
});

/**
 * Un bloque encontrado, con su página. No lleva el título de la página de
 * arriba: el token puede leer una página sin poder leer la que la contiene, y
 * fetch ya da el camino con los cerrados sin nombre.
 */
const mcpBlockHitSchema = z.object({
  blockId: idSchema,
  blockType: kindSchema,
  /** Si su página está verificada y la verificación sigue valiendo. */
  isPageVerified: z.boolean(),
  pageId: idSchema,
  pageTitle: titleSchema,
  section: z.array(z.string().max(MCP_TEXT_MAX_LENGTH)).max(MCP_PATH_MAX_DEPTH),
  snippet: z.string().max(MCP_TEXT_MAX_LENGTH),
  spaceId: idSchema,
  spaceName: titleSchema,
  url: urlSchema,
});

const mcpPageHitSchema = z.object({
  isVerified: z.boolean(),
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
  cursor: buildMcpOffsetCursorSchema('To read the next part of a long page: the cursor the previous part returned.'),
  address: buildMcpAddressSchema('A Company Brain link to a page or block, or a page id, or a block id.'),
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
  children: z.array(mcpOutlinePageSchema).max(MCP_FETCH_CHILD_LIMIT).optional(),
  comments: z
    .array(
      z.object({
        author: z.string().max(MCP_TITLE_MAX_LENGTH),
        blockId: idSchema,
        body: z.string().max(MCP_TEXT_MAX_LENGTH),
        createdAt: z.string().max(MCP_COMMENT_DATE_MAX_LENGTH),
        id: idSchema,
      }),
    )
    .max(MCP_FETCH_COMMENT_LIMIT)
    .optional(),
  id: idSchema,
  markdown: z.string().optional(),
  /** Cuántas páginas más cuelgan de esta, aparte de las nombradas: se recorren con list_pages. */
  moreChildren: z.number().int().positive().optional(),
  /** Si la página sigue: el cursor para pedir el tramo siguiente. */
  nextCursor: z.string().optional(),
  path: z.array(mcpPathStepSchema).max(MCP_PATH_MAX_DEPTH),
  properties: mcpRowPropertiesSchema,
  spaceId: idSchema,
  /** Solo al abrir la página entera, no al abrir uno de sus bloques. */
  state: mcpPageStateSchema.optional(),
  title: titleSchema,
  url: urlSchema,
  version: z.number().int().nonnegative(),
});

const mcpFetchedBlockSchema = z.object({
  id: idSchema,
  markdown: z.string(),
  section: z.array(z.string().max(MCP_TEXT_MAX_LENGTH)).max(MCP_PATH_MAX_DEPTH),
  type: kindSchema,
  url: urlSchema,
});

export const fetchOutputSchema = z.object({
  block: mcpFetchedBlockSchema.optional(),
  note: z.string().max(MCP_TEXT_MAX_LENGTH).optional(),
  page: mcpFetchedPageSchema,
});

export const listPagesInputSchema = z.object({
  cursor: buildMcpOffsetCursorSchema('To list the next part: the cursor the previous part returned.'),
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
