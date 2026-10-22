import { z } from 'zod';
import { pageMutationSchema } from '../../schemas/pages.schemas';
import { pageRowMoveSchema, pageRowPropertiesSchema } from './pages.collections.schemas';

/** A write of a view as it is kept on disk and read back: the same inputs the actions take, told apart by `kind`. */
export const pageViewWriteSchema = z.discriminatedUnion('kind', [
  pageRowPropertiesSchema.extend({ kind: z.literal('cell') }),
  pageRowMoveSchema.extend({ kind: z.literal('move') }),
  pageMutationSchema.extend({
    id: z.uuid(),
    kind: z.literal('create'),
    parentId: z.string().min(1),
  }),
]);
