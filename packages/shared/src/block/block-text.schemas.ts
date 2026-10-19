import { z } from 'zod';
import {
  PAGE_BLOCK_COLORS,
  PAGE_TEXT_MARKS_MOST,
  PAGE_TEXT_TAG_PATTERN,
  isPageLinkTarget,
  maximumPageContentNodes,
  maximumPageTextLength,
  pageBlockIdSchema,
  pageDateAttrsSchema,
  pageFormulaAttrsSchema,
  pageMentionAttrsSchema,
  pagePersonAttrsSchema,
} from '../schemas/page-content.schema.js';
import { BLOCK_TEXT_EMBED, BLOCK_TEXT_MARK } from './block-type.constants.js';

/** A page holds at most that many nodes in total, so one block can never need more segments. */
const maximumSegments = maximumPageContentNodes;

const hasFewEnoughMarks = (marks: object): boolean => Object.keys(marks).length <= PAGE_TEXT_MARKS_MOST;

/** The attributes of a Y.Text delta: one key per mark, valued `true` unless the mark carries a value. */
export const blockTextMarksSchema = z
  .object({
    [BLOCK_TEXT_MARK.strong]: z.literal(true).optional(),
    [BLOCK_TEXT_MARK.em]: z.literal(true).optional(),
    [BLOCK_TEXT_MARK.strike]: z.literal(true).optional(),
    [BLOCK_TEXT_MARK.underline]: z.literal(true).optional(),
    [BLOCK_TEXT_MARK.code]: z.literal(true).optional(),
    [BLOCK_TEXT_MARK.link]: z.string().refine(isPageLinkTarget).optional(),
    [BLOCK_TEXT_MARK.textColor]: z.enum(PAGE_BLOCK_COLORS).optional(),
    [BLOCK_TEXT_MARK.backgroundColor]: z.enum(PAGE_BLOCK_COLORS).optional(),
    [BLOCK_TEXT_MARK.comment]: pageBlockIdSchema.optional(),
  })
  .strict()
  .refine(hasFewEnoughMarks, { message: 'Too many marks on one text' });

/** An embed is one key naming the inline node, so a Y.Text can hold it as a single embedded object. */
export const blockTextEmbedSchema = z.union([
  z.object({ [BLOCK_TEXT_EMBED.mention]: pageMentionAttrsSchema }).strict(),
  z.object({ [BLOCK_TEXT_EMBED.person]: pagePersonAttrsSchema }).strict(),
  z.object({ [BLOCK_TEXT_EMBED.date]: pageDateAttrsSchema }).strict(),
  z.object({ [BLOCK_TEXT_EMBED.formula]: pageFormulaAttrsSchema }).strict(),
  z.object({ [BLOCK_TEXT_EMBED.hardBreak]: z.literal(true) }).strict(),
]);

const blockTextContentSchema = z
  .string()
  .min(1)
  .max(maximumPageTextLength)
  .refine((text) => !PAGE_TEXT_TAG_PATTERN.test(text), { message: 'Text cannot hold HTML tags' });

const blockTextSegmentSchema = z.union([
  z.object({ attributes: blockTextMarksSchema.optional(), insert: blockTextContentSchema }).strict(),
  z.object({ insert: blockTextEmbedSchema }).strict(),
]);

export const blockRichTextSchema = z.array(blockTextSegmentSchema).max(maximumSegments);

/** Code and page titles carry no marks and no embeds, and code may hold anything that looks like a tag. */
export const blockPlainTextSchema = z
  .array(z.object({ insert: z.string().min(1).max(maximumPageTextLength) }).strict())
  .max(maximumSegments);
