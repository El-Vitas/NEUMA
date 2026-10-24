import type { PageIcon, PageLifecycle } from '@neuma/shared';
import type { BlockLiveSocket } from '../../block-sync/types/block-sync.types';
import type { PageRelatedRow } from '../../collections/types/pages.schema.types';
import type { PageContent, PageReference, PageSyncedSource } from '../../types/pages.types';

/** What the sidebar draws for a page: no content, and whether a chevron is worth showing (ADR 030). */
export interface PageTreeEntry {
  /** The member may create pages under it: their role on the page is the one the create path asks for. */
  readonly canEdit: boolean;
  /** A page the reader can open sits right under it; false for a collection, whose rows are not in the tree. */
  readonly hasChildren: boolean;
  readonly hasOwnPermissions: boolean;
  readonly icon: PageIcon | null;
  readonly id: string;
  readonly isCollection: boolean;
  readonly lifecycle: PageLifecycle;
  readonly order: number;
  readonly parentId: string | null;
  readonly title: string;
  readonly version: number;
}

export interface PageTreeChildren {
  readonly entries: readonly PageTreeEntry[];
  readonly total: number;
  /** Where the database was when the window was read; only the answers of the tree endpoint carry it. */
  readonly watermark?: string;
}

/** A window of the children of one parent; `parentId` null is the top of the space. */
export interface PageTreeLevel extends PageTreeChildren {
  readonly parentId: string | null;
  readonly skip: number;
}

export type PageTreeAncestor =
  | {
      readonly icon: PageIcon | null;
      readonly id: string;
      readonly isReadable: true;
      readonly lifecycle: PageLifecycle;
      readonly title: string;
    }
  | {
      readonly icon: null;
      readonly id: null;
      readonly isReadable: false;
      readonly lifecycle: null;
      readonly title: null;
    };

export interface PageTreePath {
  readonly ancestors: readonly PageTreeAncestor[];
  readonly levels: readonly PageTreeLevel[];
  readonly page: PageTreeEntry;
}

export interface PageLookupEntry {
  readonly icon: PageIcon | null;
  readonly id: string;
  readonly lifecycle: PageLifecycle;
  readonly spaceId: string;
  readonly title: string;
  readonly version: number;
}

export interface PageLookupContent {
  readonly content: PageContent;
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}

export interface PageRecentEntry {
  readonly icon: PageIcon | null;
  readonly id: string;
  readonly title: string;
  readonly updatedAt: Date;
  readonly updatedByName: string | null;
}

/** An ancestor in a breadcrumb: only the ones the reader can open are named. */
export interface PageBreadcrumbParent {
  readonly id: string;
  readonly title: string;
}

/** One window to read: the children of a parent, from a place and up to a number. */
export interface PageTreeWindowRequest {
  readonly parentId: string | null;
  readonly skip: number;
  readonly take: number;
}

/** The children of a parent that are loaded: a stretch of its list, which may start past the first one. */
export interface PageTreeBranch {
  readonly ids: readonly string[];
  readonly offset: number;
  readonly total: number;
}

export interface PageTreeBranchVisit {
  readonly branch: PageTreeBranch;
  readonly key: string;
}

/** What a page needs to draw the other pages it names. */
export interface PageReferencesRead {
  /** Title, icon and place of the pages the document draws something from. */
  readonly references: readonly PageReference[];
  /** The rows the relations of the page point to. */
  readonly relatedRows: readonly PageRelatedRow[];
  /** The content of the pages whose blocks the document borrows. */
  readonly syncedSources: readonly PageSyncedSource[];
}

/** The top of a space as the server drew it, which the sidebar starts from. */
export interface PageTreeSpaceRoots {
  readonly id: string;
  readonly roots: PageTreeChildren;
}

/** The part of a block of a document that names another page. */
export interface PageContentNodeShape {
  readonly attrs?: { readonly pageId?: unknown };
  readonly content?: readonly PageContentNodeShape[];
  readonly type?: unknown;
}

/** What the sidebar shows of one space, and the ways to ask for more of it. */
export interface PagesTreeSpaceView {
  /** The pages loaded, in tree order. */
  readonly entries: readonly PageTreeEntry[];
  readonly isLoading: (parentId: string | null) => boolean;
  readonly loadChildren: (parentId: string | null) => void;
  readonly loadMore: (parentId: string | null, direction: PageTreeDirection) => void;
  readonly readBounds: (parentId: string | null) => { readonly hasNext: boolean; readonly hasPrevious: boolean };
}

export interface PageTreeSpaceState {
  readonly branches: Readonly<Record<string, PageTreeBranch>>;
  readonly entries: Readonly<Record<string, PageTreeEntry>>;
}

export type PageTreeState = Readonly<Record<string, PageTreeSpaceState>>;

export interface PageTreeStoreState {
  /** The parents being read right now, as `spaceId:parentKey`, so a chevron can say it is working. */
  readonly loadingKeys: readonly string[];
  readonly spaces: PageTreeState;
}

export interface PageTreeStoreOptions {
  /** Null when the backend could not be reached: what is shown stays as it is. */
  readonly readWindows: (
    spaceId: string,
    requests: readonly PageTreeWindowRequest[],
  ) => Promise<readonly PageTreeChildren[] | null>;
}

export type PageTreeDirection = 'next' | 'previous';

export type PageTreeLiveMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'pong' }
  | { readonly spaceId: string; readonly type: 'subscribed-tree' }
  | { readonly parentIds: readonly (string | null)[]; readonly spaceId: string; readonly type: 'tree-changed' }
  | { readonly spaceId: string; readonly type: 'tree-resync' }
  | { readonly code: string; readonly spaceId?: string; readonly type: 'error' };

export interface PageTreeLiveHandlers {
  readonly onChanged: (spaceId: string, parentIds: readonly (string | null)[]) => void;
  readonly onReconnected: () => void;
  readonly onResync: (spaceId: string) => void;
}

export interface PageTreeLiveSessionOptions {
  readonly handlers: PageTreeLiveHandlers;
  readonly openSocket: (url: string) => BlockLiveSocket;
  readonly requestToken: () => Promise<string | null>;
  readonly spaceIds: readonly string[];
  readonly url: string;
  /** The point of the database each space's render was read at; the server answers with what came after. */
  readonly watermarks: Readonly<Record<string, string>>;
}

export interface PageTreeLiveSession {
  readonly destroy: () => void;
}

export interface PageTreeStore {
  readonly getState: () => PageTreeStoreState;
  readonly loadChildren: (spaceId: string, parentId: string | null) => Promise<void>;
  readonly loadMore: (spaceId: string, parentId: string | null, direction: PageTreeDirection) => Promise<void>;
  readonly reloadParents: (spaceId: string, parentIds: readonly (string | null)[]) => Promise<void>;
  readonly reloadSpace: (spaceId: string) => Promise<void>;
  readonly seedLevels: (spaceId: string, levels: readonly PageTreeLevel[]) => void;
  /** The open page when it is in the trash: no list holds it, and the sidebar shows it while it is open. */
  readonly seedOpenPage: (spaceId: string, entry: PageTreeEntry) => void;
  readonly seedRoots: (spaceId: string, roots: PageTreeChildren) => void;
  readonly subscribe: (listener: () => void) => () => void;
}
