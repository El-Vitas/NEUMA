import { type PageCoverValue, pageCoverValueSchema, Result } from '@neuma/shared';
import { PageCoverValidationError } from './page.error';

export const validatePageCover = (cover: unknown): Result<PageCoverValue | null, PageCoverValidationError> => {
  if (cover === null) return Result.ok(null);
  const validation = pageCoverValueSchema.safeParse(cover);
  return validation.success
    ? Result.ok(validation.data)
    : Result.fail(new PageCoverValidationError(validation.error.issues));
};
