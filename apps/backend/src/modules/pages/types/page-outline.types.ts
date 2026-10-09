import type { UserRole } from '@neuma/shared';
import type { SchemaPropertyValues } from '../../../common/domain/schema.domain.types';
import type { SearchTokenScope } from '../../../common/types/search.types';

export interface PageOutlineEntry {
  /** Counts only children the reader can see. */
  readonly childCount: number;
  readonly id: string;
  readonly isCollection: boolean;
  readonly propertyValues: SchemaPropertyValues | null;
  readonly title: string;
}

/** An unreadable ancestor carries no id or title, so the repository never leaks it and callers need not redact. */
export type PageAncestor =
  | { readonly id: string; readonly isReadable: true; readonly title: string }
  | { readonly id: null; readonly isReadable: false; readonly title: null };

export interface PageAncestorRow {
  readonly id: string;
  readonly title: string;
}

export interface PageOutlinePlace {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}

/** With a token, visibility is narrowed to the token scope, never wider than its owner's. */
export interface PageOutlineReader {
  readonly role: UserRole;
  readonly tokenScope?: SearchTokenScope;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface PageOutlineWindow {
  readonly skip: number;
  readonly take: number;
}

export interface PageOutlineChildren {
  readonly entries: readonly PageOutlineEntry[];
  readonly total: number;
}

export interface PageOutlineRepositoryContract {
  /** Windowed because a collection can hold thousands of rows. */
  readonly listChildren: (
    spaceId: string,
    parentId: string | null,
    reader: PageOutlineReader,
    window: PageOutlineWindow,
  ) => Promise<PageOutlineChildren>;
  /** Ordered from the topmost ancestor down; empty when the page itself is not visible. */
  readonly listAncestors: (pageId: string, reader: PageOutlineReader) => Promise<readonly PageAncestor[]>;
  readonly listReadable: (
    pageIds: readonly string[],
    reader: PageOutlineReader,
  ) => Promise<readonly PageOutlinePlace[]>;
}
