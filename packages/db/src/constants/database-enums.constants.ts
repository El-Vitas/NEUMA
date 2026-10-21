// Each value and its type share a name, as the enums of the contract do, so callers use one name for both.
type ValueOf<Dictionary> = Dictionary[keyof Dictionary];

export const AgentActionOutcome = {
  PENDING: 'PENDING',
  DONE: 'DONE',
  REFUSED: 'REFUSED',
  FAILED: 'FAILED',
} as const;
export type AgentActionOutcome = ValueOf<typeof AgentActionOutcome>;

export const DatabasePropertyType = {
  TITLE: 'TITLE',
  RICH_TEXT: 'RICH_TEXT',
  SELECT: 'SELECT',
  MULTI_SELECT: 'MULTI_SELECT',
  PERSON: 'PERSON',
  DATE: 'DATE',
  CHECKBOX: 'CHECKBOX',
  NUMBER: 'NUMBER',
  STATUS: 'STATUS',
  RELATION: 'RELATION',
  URL: 'URL',
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  FILES: 'FILES',
  CREATED_TIME: 'CREATED_TIME',
  EDITED_TIME: 'EDITED_TIME',
  CREATED_BY: 'CREATED_BY',
  EDITED_BY: 'EDITED_BY',
  UNIQUE_ID: 'UNIQUE_ID',
} as const;
export type DatabasePropertyType = ValueOf<typeof DatabasePropertyType>;

export const DatabaseViewType = {
  TABLE: 'TABLE',
  BOARD: 'BOARD',
  LIST: 'LIST',
  GALLERY: 'GALLERY',
  CALENDAR: 'CALENDAR',
  CHART: 'CHART',
  TIMELINE: 'TIMELINE',
} as const;
export type DatabaseViewType = ValueOf<typeof DatabaseViewType>;

export const FileAssetLifecycle = {
  ACTIVE: 'ACTIVE',
  DELETED: 'DELETED',
} as const;
export type FileAssetLifecycle = ValueOf<typeof FileAssetLifecycle>;

export const NotificationKind = {
  MENTION: 'MENTION',
  REPLY: 'REPLY',
  PAGE_CHANGE: 'PAGE_CHANGE',
} as const;
export type NotificationKind = ValueOf<typeof NotificationKind>;

export const PageLifecycle = {
  ACTIVE: 'ACTIVE',
  TRASHED: 'TRASHED',
} as const;
export type PageLifecycle = ValueOf<typeof PageLifecycle>;

export const SpaceVisibility = {
  PUBLIC_INTERNAL: 'PUBLIC_INTERNAL',
  RESTRICTED: 'RESTRICTED',
  PRIVATE: 'PRIVATE',
} as const;
export type SpaceVisibility = ValueOf<typeof SpaceVisibility>;

export const UserRole = {
  ADMIN: 'ADMIN',
  WORKER: 'WORKER',
  CLIENT: 'CLIENT',
} as const;
export type UserRole = ValueOf<typeof UserRole>;
