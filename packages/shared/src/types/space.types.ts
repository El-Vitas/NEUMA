export type SpaceVisibility = 'PUBLIC_INTERNAL' | 'RESTRICTED';

export const SPACE_VISIBILITY = {
  PUBLIC_INTERNAL: 'PUBLIC_INTERNAL',
  RESTRICTED: 'RESTRICTED',
} as const satisfies Record<SpaceVisibility, SpaceVisibility>;

export const SPACE_VISIBILITY_VALUES = [SPACE_VISIBILITY.PUBLIC_INTERNAL, SPACE_VISIBILITY.RESTRICTED] as const;
