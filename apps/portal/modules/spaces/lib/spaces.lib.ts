import type { SpaceVisibility } from '@neuma/shared';
import type { ZodString } from 'zod';
import type { BadgeVariant, SpaceFieldErrorCode } from '../types/spaces.types';

export const getSpaceVisibilityLabel = (visibility: SpaceVisibility): string =>
  visibility === 'RESTRICTED' ? 'Restringido' : 'Visible para empleados';

export const getSpaceFieldErrorCode = (
  fieldSchema: ZodString,
  candidateValue: string,
): SpaceFieldErrorCode | undefined => {
  const result = fieldSchema.safeParse(candidateValue);
  if (result.success) return;
  return result.error.issues[0]?.code === 'too_big' ? 'tooLong' : 'tooShort';
};

export const resolveSpaceFieldErrorMessage = (
  errorCode: SpaceFieldErrorCode | undefined,
  tooShortMessage: string,
): string | undefined => (errorCode === 'tooShort' ? tooShortMessage : undefined);

export const resolveSpaceBadgeVariant = (visibility: SpaceVisibility): BadgeVariant => {
  switch (visibility) {
    case 'RESTRICTED':
      return 'warning';
    case 'PRIVATE':
      return 'outline';
    default:
      return 'secondary';
  }
};
