import type { PermissionEntry } from '../types/auth.types';
import { Action, Resource } from './permission.constants';

export const ADMIN_PERMISSIONS: readonly PermissionEntry[] = [
  { action: Action.Create, resource: Resource.User },
  { action: Action.Read, resource: Resource.User },
  { action: Action.Update, resource: Resource.User },
  { action: Action.Delete, resource: Resource.User },
  { action: Action.Read, resource: Resource.Account },
  { action: Action.Update, resource: Resource.Account },
];

export const WORKER_PERMISSIONS: readonly PermissionEntry[] = [
  { action: Action.Read, resource: Resource.Account },
  { action: Action.Update, resource: Resource.Account },
];
