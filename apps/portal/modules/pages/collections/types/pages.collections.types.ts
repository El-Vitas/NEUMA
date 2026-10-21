import type {
  PageFilter,
  PageOptionColor,
  PagePropertyConfig,
  PagePropertyType,
  PageStatusGroup,
  PageViewType,
} from '@neuma/shared';

export interface PageCollectionWording {
  readonly firstProperty: string;
  readonly firstView: string;
  readonly titleProperty: string;
}

/** A new option has no id yet, and the server gives it one. */
export interface PageCollectionOption {
  readonly color: PageOptionColor | null;
  readonly group?: PageStatusGroup | null;
  readonly id?: string | null;
  readonly value: string;
}

/** What the collection is created or saved with. */
export interface PageCollectionProperty {
  readonly config?: PagePropertyConfig;
  readonly key: string;
  readonly label: string;
  readonly options: readonly PageCollectionOption[] | null;
  readonly required: boolean;
  readonly twoWay?: boolean;
  readonly type: PagePropertyType;
}

export interface PageCollectionView {
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly isDefault: boolean;
  readonly name: string;
  readonly type: PageViewType;
}

export interface PageCollectionShape {
  readonly properties: readonly PageCollectionProperty[];
  readonly views: readonly PageCollectionView[];
}

/** What the address asks of the rows a view is read with: the words searched, and the month of a calendar. */
export interface CollectionRowsRequest {
  /** The day a week or a timeline is drawn around, as `YYYY-MM-DD`. */
  readonly day: null | string;
  readonly month: null | string;
  /** A filter on top of the view that is not saved, so it is for whoever put it there. */
  readonly quickFilter: null | PageFilter;
  readonly search: string;
}

/** What an address to a view can carry besides the view: the words searched, the quick filter and the month. */
export interface CollectionHrefOptions {
  readonly day?: string;
  readonly month?: string;
  readonly quickFilter?: null | PageFilter;
  readonly search?: string;
}

export interface PageCollectionInsert {
  readonly pageId: string;
  readonly spaceId: string;
  readonly viewName: string | null;
}

/** `spot` remembers the cursor position: the dialog takes focus, and the block must land where typing stopped. */
export interface PageEditorCollectionChoice {
  readonly pageId: string;
  readonly spot: number;
  readonly views: readonly PageCollectionView[];
}
