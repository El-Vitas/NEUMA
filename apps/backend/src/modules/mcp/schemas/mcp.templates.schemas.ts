import { PAGE_TEMPLATE_VARIABLE_VALUES } from '@neuma/shared';
import { z } from 'zod';
import {
  MCP_COLUMN_NAME_MAX_LENGTH,
  MCP_ROW_TEXT_MAX_LENGTH,
  MCP_TITLE_MAX_LENGTH,
} from '../constants/mcp.limits.constants';
import { cellValuesSchema, collectionSchema, outputPropertySchema } from './mcp.collections.schemas';
import { mcpRequestIdShape } from './mcp.common.schemas';

const templateReferenceSchema = z
  .string()
  .trim()
  .min(1)
  .max(MCP_TITLE_MAX_LENGTH)
  .describe('A template of the collection, by its name or its id (list_templates shows them).');

export const listTemplatesInputSchema = z.object({ collection: collectionSchema });

const outputVariableSchema = z.object({
  column: z.string(),
  key: z.string(),
  word: z.enum(PAGE_TEMPLATE_VARIABLE_VALUES),
});

export const templateOutputSchema = z.object({
  id: z.string(),
  isDefault: z.boolean(),
  properties: z.array(outputPropertySchema),
  title: z.string(),
  url: z.url(),
  variables: z.array(outputVariableSchema),
});

export const templateListOutputSchema = z.object({
  collection: z.object({ id: z.string(), title: z.string() }),
  defaultTemplateId: z.string().nullable(),
  templates: z.array(templateOutputSchema),
});

export const saveTemplateInputSchema = z.object({
  collection: collectionSchema,
  isDefault: z
    .boolean()
    .optional()
    .describe(
      'true makes it the template new rows start from when no template is named (there is one default at a time); false takes the default away if this one is it.',
    ),
  properties: cellValuesSchema.optional(),
  template: templateReferenceSchema
    .optional()
    .describe('The template to change, by its name or its id. Leave it out to create a new one.'),
  text: z
    .string()
    .max(MCP_ROW_TEXT_MAX_LENGTH)
    .optional()
    .describe('What the page of a row made from this template says, as plain paragraphs separated by blank lines.'),
  title: z
    .string()
    .trim()
    .min(1)
    .max(MCP_TITLE_MAX_LENGTH)
    .optional()
    .describe(
      'The name of the template. Needed to create one; when you update, it renames it. The row takes it as its title only when it is made with none.',
    ),
  variables: z
    .record(z.string().max(MCP_COLUMN_NAME_MAX_LENGTH), z.enum(PAGE_TEMPLATE_VARIABLE_VALUES))
    .optional()
    .describe(
      'Columns to fill when a row is made: "@today" in a date column puts the day of creation, "@me" in a person column puts whoever creates the row. By column (key or name). When you update a template, this replaces all its variables. A column in variables is not in properties.',
    ),
  ...mcpRequestIdShape,
});

export const deleteTemplateInputSchema = z.object({
  collection: collectionSchema,
  template: templateReferenceSchema,
  ...mcpRequestIdShape,
});

export const deleteTemplateOutputSchema = z.object({ deleted: z.boolean(), title: z.string() });
