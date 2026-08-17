import { z } from 'zod';

export const spaceMemberSchema = z.object({
  email: z.string(),
  id: z.string(),
  name: z.string(),
});

export const spaceMembersListSchema = z.array(spaceMemberSchema);
