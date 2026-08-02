import { type SpaceVisibility, type UserRole, WORKSPACE_CAPABILITY_BY_ROLE } from '@company-brain/shared';

export const canEditContent = (role: UserRole): boolean => WORKSPACE_CAPABILITY_BY_ROLE[role] !== 'viewer';

export const getSpaceVisibilityLabel = (visibility: SpaceVisibility): string =>
  visibility === 'RESTRICTED' ? 'Restringido' : 'Visible para empleados';
