export const USER_ROLE = {
  ADMIN: 'ADMIN',
  WORKER: 'WORKER',
  CLIENT: 'CLIENT',
} as const;

export const USER_ROLE_VALUES = [USER_ROLE.ADMIN, USER_ROLE.WORKER, USER_ROLE.CLIENT] as const;
export type UserRole = (typeof USER_ROLE_VALUES)[number];
