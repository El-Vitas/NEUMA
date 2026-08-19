import { type PageIcon, pageIconSchema, Result } from '@company-brain/shared';
import { SpaceIconValidationError } from './space.error';

/**
 * A space is marked the same way a page is.
 *
 * The shared contract is reused rather than copied: two shapes for the same
 * mark would let a space carry an icon no page could draw, and the tree draws
 * both side by side.
 */
export const validateSpaceIcon = (icon: unknown): Result<PageIcon | null, SpaceIconValidationError> => {
  if (icon === null) return Result.ok(null);
  const validation = pageIconSchema.safeParse(icon);
  return validation.success
    ? Result.ok(validation.data)
    : Result.fail(new SpaceIconValidationError(validation.error.issues));
};
