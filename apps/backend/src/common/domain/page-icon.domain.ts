import type { Prisma } from '@company-brain/db/generated';
import { type PageIcon, pageIconSchema } from '@company-brain/shared';

/** A mark stored before its shape was known is dropped rather than handed on as something it is not. */
export const parseStoredPageIcon = (icon: Prisma.JsonValue): PageIcon | null => {
  const validation = pageIconSchema.safeParse(icon);
  return validation.success ? validation.data : null;
};
