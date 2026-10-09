import { type PageIcon, pageIconSchema, Result } from '@company-brain/shared';
import { SpaceIconValidationError } from './space.error';

/** Reuses the page icon contract so a space cannot carry an icon the tree cannot draw for pages. */
export const validateSpaceIcon = (icon: unknown): Result<PageIcon | null, SpaceIconValidationError> => {
  if (icon === null) return Result.ok(null);
  const validation = pageIconSchema.safeParse(icon);
  return validation.success
    ? Result.ok(validation.data)
    : Result.fail(new SpaceIconValidationError(validation.error.issues));
};
