import type { PagePropertyValue, PagePropertyValues } from '../../collections/types/pages.schema.types';

export interface PagesEditorSavesOptions {
  readonly hasEditableProperties: boolean;
  readonly pageId: string;
  readonly readPropertyValues: () => PagePropertyValues;
  readonly readTitle: () => string;
  readonly spaceId: string;
  /** `null` for a row that never stored properties: the first save sends all of them. */
  readonly storedPropertyValues: PagePropertyValues | null;
}

export interface PagesEditorSaves {
  readonly markPropertyChanged: (key: string, value: PagePropertyValue) => void;
  readonly markTitleChanged: () => void;
  /** Resolves to whether every pending part was saved. */
  readonly saveWhatIsPending: () => Promise<boolean>;
}
