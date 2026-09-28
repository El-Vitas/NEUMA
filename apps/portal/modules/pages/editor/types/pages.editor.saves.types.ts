import type { PagePropertyValue, PagePropertyValues } from '../../collections/types/pages.schema.types';
import type { PageContent } from '../../types/pages.types';

export interface PagesEditorSavesOptions {
  readonly hasEditableProperties: boolean;
  readonly pageId: string;
  readonly readContent: () => PageContent;
  readonly readPropertyValues: () => PagePropertyValues;
  readonly readTitle: () => string;
  readonly spaceId: string;
  /** A row that has never kept its properties sends all of them the first time: there is nothing there to overwrite. */
  readonly storedPropertyValues: PagePropertyValues | null;
}

export interface PagesEditorSaves {
  readonly markContentChanged: () => void;
  readonly markPropertyChanged: (key: string, value: PagePropertyValue) => void;
  readonly markTitleChanged: () => void;
  /** Sends what is waiting, each part on its own, and says whether all of it arrived. */
  readonly saveWhatIsPending: () => Promise<boolean>;
}
