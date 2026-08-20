import { z } from 'zod';

export const spaceMoveAccessLossInputSchema = z.object({
  sourceSpaceId: z.string().min(1),
  targetSpaceId: z.string().min(1),
});

export const spaceMoveAccessLossSchema = z.object({
  count: z.number().int().nonnegative(),
});
