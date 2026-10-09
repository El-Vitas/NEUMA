import type { Prisma } from '@company-brain/db/generated';
import { type PageIcon, pageIconSchema } from '@company-brain/shared';

/** An icon that does not match the current shape becomes `null` instead of being passed on. */
export const parseStoredPageIcon = (icon: Prisma.JsonValue): PageIcon | null => {
  const validation = pageIconSchema.safeParse(icon);
  return validation.success ? validation.data : null;
};
