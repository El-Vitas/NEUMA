import { type PageIcon, pageIconSchema, Result } from '@neuma/shared';
import { PageIconValidationError } from './page.error';

export const validatePageIcon = (icon: unknown): Result<PageIcon | null, PageIconValidationError> => {
  if (icon === null) return Result.ok(null);
  const validation = pageIconSchema.safeParse(icon);
  return validation.success
    ? Result.ok(validation.data)
    : Result.fail(new PageIconValidationError(validation.error.issues));
};
