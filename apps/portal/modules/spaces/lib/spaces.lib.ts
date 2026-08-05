import { type SpaceVisibility, type UserRole, WORKSPACE_CAPABILITY_BY_ROLE } from '@company-brain/shared';
import type { ZodString } from 'zod';
import type { SpaceFieldErrorCode } from '../types/spaces.types';

export const canEditContent = (role: UserRole): boolean => WORKSPACE_CAPABILITY_BY_ROLE[role] !== 'viewer';

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
