import type { UserRole } from '@company-brain/shared';

export interface WorkspaceSummary {
  readonly id: string;
  readonly name: string;
}

export interface WorkspacePrincipal {
  readonly role: UserRole;
  readonly userId: string;
}
