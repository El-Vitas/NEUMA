import type { PagePropertyOption, PagePropertyType, PageViewType } from '@company-brain/shared';

export interface PageCollectionWording {
  readonly firstProperty: string;
  readonly firstView: string;
  readonly titleProperty: string;
}

export interface PageCollectionProperty {
  readonly key: string;
  readonly label: string;
  readonly options: readonly PagePropertyOption[] | null;
  readonly required: boolean;
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
