import { type SpaceVisibility, type UserRole, WORKSPACE_CAPABILITY_BY_ROLE } from '@company-brain/shared';
import type { ZodString } from 'zod';
import type { BadgeVariant, SpaceFieldErrorCode } from '../types/spaces.types';

export const canEditContent = (role: UserRole): boolean => WORKSPACE_CAPABILITY_BY_ROLE[role] !== 'viewer';

/** Who runs the workspace, and so may see what is kept about the people in it. */
export const canManageWorkspace = (role: UserRole): boolean => WORKSPACE_CAPABILITY_BY_ROLE[role] === 'admin';

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

/** Which of the badge's looks a space's reach is drawn with. */
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
