import { blockRichTextSchema } from '@neuma/shared';
import { z } from 'zod';

/** What a `Comment.body` column holds: the rich text of a block, read back with the schema it was written with. */
export const commentBodySchema = blockRichTextSchema;

/** A JSON column is written only after it was checked to be JSON, whatever the in-memory type said. */
export const storedJsonSchema = z.json();
