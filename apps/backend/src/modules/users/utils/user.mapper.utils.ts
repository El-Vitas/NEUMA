import type { User, UserRole } from '@company-brain/shared';

export const toUser = (row: { email: string; id: string; name: string; role: UserRole }): User => ({
  email: row.email,
  id: row.id,
  name: row.name,
  role: row.role,
});
